"""
Model Monitoring and Observability System
- Tracks model performance, drift, and predictions
- Stores metrics in MongoDB for analysis
- Provides real-time health status
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, asdict, field
from enum import Enum
import hashlib
import json

import numpy as np
from pymongo import MongoClient

logger = logging.getLogger(__name__)


class ModelStatus(str, Enum):
    """Model health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class PredictionType(str, Enum):
    """Types of predictions tracked"""
    FORECAST = "forecast"
    PRICING = "pricing"
    PROMOTION = "promotion"
    ASSORTMENT = "assortment"


@dataclass
class ModelVersion:
    """Model version metadata"""
    name: str  # e.g., "forecast_v1", "pricing_v2"
    model_type: str  # forecast, pricing, promotion, assortment
    version: str  # semantic version or timestamp
    created_at: datetime
    parameters: Dict[str, Any]  # hyperparameters
    status: str = "inactive"  # active, inactive, deprecated
    canary_traffic: float = 0.0  # 0.0 - 1.0, percentage of traffic
    is_default: bool = False
    description: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        return data


@dataclass
class PredictionMetric:
    """Individual prediction metric"""
    timestamp: datetime
    model_name: str
    model_version: str
    prediction_type: PredictionType
    input_hash: str  # hash of input for deduplication
    predicted_value: float
    actual_value: Optional[float] = None
    confidence: float = 1.0
    latency_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['prediction_type'] = self.prediction_type.value
        return data


@dataclass
class ModelMetrics:
    """Aggregated model metrics"""
    model_name: str
    model_version: str
    timestamp: datetime
    total_predictions: int = 0
    avg_latency_ms: float = 0.0
    error_rate: float = 0.0
    mean_absolute_error: Optional[float] = None
    mean_squared_error: Optional[float] = None
    accuracy: Optional[float] = None
    drift_score: float = 0.0  # 0-1, 1 = high drift
    status: ModelStatus = ModelStatus.UNKNOWN
    last_prediction_at: Optional[datetime] = None
    prediction_volume: int = 0

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        if self.last_prediction_at:
            data['last_prediction_at'] = self.last_prediction_at.isoformat()
        data['status'] = self.status.value
        return data


class ModelMonitor:
    """Central monitoring system for all models"""

    def __init__(self, db):
        """
        Initialize monitor with MongoDB connection
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.logger = logging.getLogger(__name__)
        self._ensure_indexes()

    def _ensure_indexes(self) -> None:
        """Create necessary MongoDB indexes"""
        try:
            # Model versions
            self.db.model_versions.create_index("name")
            self.db.model_versions.create_index([("model_type", 1), ("created_at", -1)])
            
            # Predictions
            self.db.model_predictions.create_index([("model_name", 1), ("timestamp", -1)])
            self.db.model_predictions.create_index([("model_version", 1)])
            self.db.model_predictions.create_index("input_hash")
            
            # Metrics
            self.db.model_metrics.create_index([("model_name", 1), ("timestamp", -1)])
            self.db.model_metrics.create_index([("status", 1)])
            
            # Drift detection
            self.db.model_drift.create_index([("model_name", 1), ("timestamp", -1)])
            
            self.logger.info("Model monitoring indexes created")
        except Exception as e:
            self.logger.error(f"Failed to create indexes: {e}")

    def register_model_version(self, model_version: ModelVersion) -> str:
        """
        Register a new model version
        
        Args:
            model_version: ModelVersion object
            
        Returns:
            version_id (string)
        """
        try:
            doc = {
                **model_version.to_dict(),
                "created_at": datetime.utcnow(),
            }
            result = self.db.model_versions.insert_one(doc)
            self.logger.info(f"Registered model version: {model_version.name} (ID: {result.inserted_id})")
            return str(result.inserted_id)
        except Exception as e:
            self.logger.error(f"Failed to register model version: {e}")
            raise

    def get_active_model_version(self, model_type: str) -> Optional[ModelVersion]:
        """
        Get the currently active model version for a model type
        
        Args:
            model_type: Type of model (forecast, pricing, etc.)
            
        Returns:
            ModelVersion or None
        """
        try:
            doc = self.db.model_versions.find_one({
                "model_type": model_type,
                "is_default": True,
                "status": "active"
            }, sort=[("created_at", -1)])
            if doc:
                return self._doc_to_model_version(doc)
            return None
        except Exception as e:
            self.logger.error(f"Failed to get active model version: {e}")
            return None

    def get_all_model_versions(self, model_type: str) -> List[ModelVersion]:
        """Get all versions for a model type"""
        try:
            docs = self.db.model_versions.find({"model_type": model_type}).sort("created_at", -1)
            return [self._doc_to_model_version(doc) for doc in docs]
        except Exception as e:
            self.logger.error(f"Failed to get model versions: {e}")
            return []

    def log_prediction(self, metric: PredictionMetric) -> str:
        """
        Log a prediction and its metadata
        
        Args:
            metric: PredictionMetric object
            
        Returns:
            prediction_id (string)
        """
        try:
            doc = {
                **metric.to_dict(),
                "timestamp": datetime.utcnow(),
            }
            result = self.db.model_predictions.insert_one(doc)
            return str(result.inserted_id)
        except Exception as e:
            self.logger.error(f"Failed to log prediction: {e}")
            raise

    def log_batch_predictions(self, metrics: List[PredictionMetric]) -> int:
        """
        Log multiple predictions at once
        
        Args:
            metrics: List of PredictionMetric objects
            
        Returns:
            Number of predictions logged
        """
        if not metrics:
            return 0
        try:
            docs = [{**m.to_dict(), "timestamp": datetime.utcnow()} for m in metrics]
            result = self.db.model_predictions.insert_many(docs)
            return len(result.inserted_ids)
        except Exception as e:
            self.logger.error(f"Failed to log batch predictions: {e}")
            return 0

    def calculate_metrics(self, model_name: str, model_version: str, 
                         time_window_hours: int = 1) -> ModelMetrics:
        """
        Calculate aggregated metrics for a model within a time window
        
        Args:
            model_name: Name of the model
            model_version: Version of the model
            time_window_hours: Hours of data to analyze
            
        Returns:
            ModelMetrics object
        """
        try:
            from datetime import timedelta
            cutoff_time = datetime.utcnow() - timedelta(hours=time_window_hours)
            
            predictions = list(self.db.model_predictions.find({
                "model_name": model_name,
                "model_version": model_version,
                "timestamp": {"$gte": cutoff_time}
            }))
            
            if not predictions:
                return ModelMetrics(
                    model_name=model_name,
                    model_version=model_version,
                    timestamp=datetime.utcnow(),
                    status=ModelStatus.UNKNOWN
                )
            
            # Calculate metrics
            latencies = [p.get("latency_ms", 0) for p in predictions]
            predictions_with_actuals = [p for p in predictions if p.get("actual_value") is not None]
            
            total = len(predictions)
            avg_latency = float(np.mean(latencies)) if latencies else 0.0
            last_prediction = max([p.get("timestamp") for p in predictions], default=None)
            
            mae = None
            mse = None
            error_rate = 0.0
            
            if predictions_with_actuals:
                predicted = np.array([p.get("predicted_value", 0) for p in predictions_with_actuals])
                actual = np.array([p.get("actual_value", 0) for p in predictions_with_actuals])
                
                mae = float(np.mean(np.abs(predicted - actual)))
                mse = float(np.mean((predicted - actual) ** 2))
                
                # Simple error rate: predictions where error > threshold
                errors = np.abs((predicted - actual) / (np.abs(actual) + 1e-6))
                error_rate = float(np.mean(errors > 0.2))  # 20% threshold
            
            # Determine status
            status = ModelStatus.HEALTHY
            if error_rate > 0.3 or avg_latency > 5000:  # > 5s latency
                status = ModelStatus.DEGRADED
            if error_rate > 0.5 or avg_latency > 10000:  # > 10s latency
                status = ModelStatus.UNHEALTHY
            
            metrics = ModelMetrics(
                model_name=model_name,
                model_version=model_version,
                timestamp=datetime.utcnow(),
                total_predictions=total,
                avg_latency_ms=avg_latency,
                error_rate=error_rate,
                mean_absolute_error=mae,
                mean_squared_error=mse,
                status=status,
                last_prediction_at=last_prediction,
                prediction_volume=total
            )
            
            # Store metrics
            self.db.model_metrics.insert_one(metrics.to_dict())
            
            return metrics
        except Exception as e:
            self.logger.error(f"Failed to calculate metrics: {e}")
            return ModelMetrics(
                model_name=model_name,
                model_version=model_version,
                timestamp=datetime.utcnow(),
                status=ModelStatus.UNKNOWN
            )

    def detect_drift(self, model_name: str, model_version: str,
                    reference_data: List[float], current_data: List[float],
                    threshold: float = 0.3) -> Dict[str, Any]:
        """
        Detect data/prediction drift using statistical methods
        
        Args:
            model_name: Model name
            model_version: Model version
            reference_data: Historical reference distribution
            current_data: Recent predictions/data
            threshold: Drift score threshold (0-1)
            
        Returns:
            Drift analysis dictionary
        """
        try:
            if len(current_data) < 10:
                return {
                    "model_name": model_name,
                    "model_version": model_version,
                    "drift_detected": False,
                    "drift_score": 0.0,
                    "reason": "insufficient_data"
                }
            
            # Simple drift detection: compare distributions using Kolmogorov-Smirnov like approach
            ref_mean = np.mean(reference_data)
            ref_std = np.std(reference_data) or 1.0
            curr_mean = np.mean(current_data)
            curr_std = np.std(current_data) or 1.0
            
            # Calculate drift score (0-1)
            mean_shift = abs(curr_mean - ref_mean) / (ref_std + 1e-6)
            std_shift = abs(curr_std - ref_std) / (ref_std + 1e-6)
            drift_score = min(1.0, (mean_shift + std_shift) / 4.0)  # Normalize to 0-1
            
            drift_detected = drift_score > threshold
            
            result = {
                "model_name": model_name,
                "model_version": model_version,
                "timestamp": datetime.utcnow().isoformat(),
                "drift_detected": drift_detected,
                "drift_score": float(drift_score),
                "mean_shift": float(mean_shift),
                "std_shift": float(std_shift),
                "reference_mean": float(ref_mean),
                "reference_std": float(ref_std),
                "current_mean": float(curr_mean),
                "current_std": float(curr_std),
                "threshold": threshold
            }
            
            # Store drift detection result
            self.db.model_drift.insert_one(result)
            
            if drift_detected:
                self.logger.warning(f"Drift detected in {model_name} v{model_version}: score={drift_score:.3f}")
            
            return result
        except Exception as e:
            self.logger.error(f"Failed to detect drift: {e}")
            return {
                "model_name": model_name,
                "model_version": model_version,
                "drift_detected": False,
                "drift_score": 0.0,
                "error": str(e)
            }

    def set_model_version_canary(self, model_name: str, canary_traffic: float) -> bool:
        """
        Set canary traffic percentage for a model version (gradual rollout)
        
        Args:
            model_name: Model name
            canary_traffic: Traffic percentage (0.0 - 1.0)
            
        Returns:
            Success status
        """
        try:
            if not 0.0 <= canary_traffic <= 1.0:
                raise ValueError("canary_traffic must be between 0.0 and 1.0")
            
            result = self.db.model_versions.update_one(
                {"name": model_name},
                {"$set": {"canary_traffic": canary_traffic}}
            )
            
            self.logger.info(f"Updated {model_name} canary traffic to {canary_traffic*100:.1f}%")
            return result.modified_count > 0
        except Exception as e:
            self.logger.error(f"Failed to set canary traffic: {e}")
            return False

    def rollback_to_previous_version(self, model_type: str) -> bool:
        """
        Rollback to the previous stable model version
        
        Args:
            model_type: Type of model to rollback
            
        Returns:
            Success status
        """
        try:
            versions = list(self.db.model_versions.find({
                "model_type": model_type
            }).sort("created_at", -1).limit(2))
            
            if len(versions) < 2:
                self.logger.warning(f"No previous version to rollback to for {model_type}")
                return False
            
            current = versions[0]
            previous = versions[1]
            
            # Deactivate current
            self.db.model_versions.update_one(
                {"_id": current["_id"]},
                {"$set": {"is_default": False, "status": "inactive"}}
            )
            
            # Activate previous
            self.db.model_versions.update_one(
                {"_id": previous["_id"]},
                {"$set": {"is_default": True, "status": "active"}}
            )
            
            self.logger.info(f"Rolled back {model_type} to v{previous['version']}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to rollback: {e}")
            return False

    def get_model_health_dashboard(self, model_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Get comprehensive health dashboard for models
        
        Args:
            model_type: Specific model type to check, or None for all
            
        Returns:
            Health dashboard dictionary
        """
        try:
            query = {"model_type": model_type} if model_type else {}
            versions = list(self.db.model_versions.find(query).sort("created_at", -1))
            
            health_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "models": []
            }
            
            for version in versions:
                metrics = self.calculate_metrics(version["name"], version["version"])
                
                health_data["models"].append({
                    "name": version["name"],
                    "version": version["version"],
                    "status": metrics.status.value,
                    "is_active": version.get("is_default", False),
                    "canary_traffic": version.get("canary_traffic", 0.0),
                    "metrics": {
                        "total_predictions": metrics.total_predictions,
                        "avg_latency_ms": metrics.avg_latency_ms,
                        "error_rate": metrics.error_rate,
                        "mean_absolute_error": metrics.mean_absolute_error,
                        "mean_squared_error": metrics.mean_squared_error
                    },
                    "created_at": version["created_at"]
                })
            
            return health_data
        except Exception as e:
            self.logger.error(f"Failed to get health dashboard: {e}")
            return {"timestamp": datetime.utcnow().isoformat(), "models": [], "error": str(e)}

    @staticmethod
    def _doc_to_model_version(doc: Dict[str, Any]) -> ModelVersion:
        """Convert MongoDB document to ModelVersion"""
        if isinstance(doc.get("created_at"), str):
            doc["created_at"] = datetime.fromisoformat(doc["created_at"])
        return ModelVersion(**{k: doc[k] for k in ModelVersion.__dataclass_fields__})


def create_input_hash(input_data: Dict[str, Any]) -> str:
    """Create hash of input for deduplication"""
    try:
        data_str = json.dumps(input_data, sort_keys=True, default=str)
        return hashlib.sha256(data_str.encode()).hexdigest()[:16]
    except Exception:
        return ""
