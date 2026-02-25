"""
Model Monitoring and Rollout Management API Endpoints
Extends the main FastAPI application with comprehensive monitoring, health checks, and rollout controls.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import logging

from model_monitoring import (
    ModelMonitor, ModelVersion, PredictionMetric,
    PredictionType, ModelStatus, create_input_hash
)
from rollout_control import (
    RolloutControl, FeatureFlag, FeatureFlagStatus,
    RolloutStrategy, ABTest, ABTestVariant
)

logger = logging.getLogger(__name__)


# Pydantic models for API requests/responses

class RegisterModelVersionRequest(BaseModel):
    name: str
    model_type: str
    version: str
    parameters: Dict[str, Any]
    description: str = ""
    is_default: bool = False


class LogPredictionRequest(BaseModel):
    model_name: str
    model_version: str
    prediction_type: str  # forecast, pricing, etc.
    input_data: Dict[str, Any]
    predicted_value: float
    actual_value: Optional[float] = None
    confidence: float = 1.0
    latency_ms: float = 0.0
    metadata: Dict[str, Any] = {}


class DetectDriftRequest(BaseModel):
    model_name: str
    model_version: str
    reference_data: List[float]
    current_data: List[float]
    threshold: float = 0.3


class UpdateCanaryRequest(BaseModel):
    canary_traffic: float  # 0.0 - 1.0


class CreateFeatureFlagRequest(BaseModel):
    name: str
    description: str = ""
    status: str = "disabled"
    rollout_strategy: str = "all_users"
    rollout_percentage: float = 100.0
    targeting_rules: Dict[str, Any] = {}


class CreateABTestRequest(BaseModel):
    test_id: str
    name: str
    feature_name: str
    model_type: str
    variants: List[Dict[str, Any]]
    end_date: Optional[str] = None


class RecordABTestEventRequest(BaseModel):
    test_id: str
    user_id: str
    variant_name: str
    event_type: str  # impression, conversion, etc.
    metrics: Dict[str, Any]


# Initialize monitoring and rollout systems (called from main.py)
def init_monitoring_apis(app: FastAPI, monitor: ModelMonitor, rollout: RolloutControl) -> None:
    """Initialize all monitoring and rollout control API endpoints"""

    # ============ MODEL MONITORING ENDPOINTS ============

    @app.post("/api/models/register-version")
    def register_model_version(request: RegisterModelVersionRequest):
        """Register a new model version"""
        try:
            model_version = ModelVersion(
                name=request.name,
                model_type=request.model_type,
                version=request.version,
                parameters=request.parameters,
                created_at=datetime.utcnow(),
                description=request.description,
                is_default=request.is_default,
                status="active" if request.is_default else "inactive"
            )
            version_id = monitor.register_model_version(model_version)
            return {
                "success": True,
                "version_id": version_id,
                "message": f"Registered model {request.name} v{request.version}"
            }
        except Exception as e:
            logger.error(f"Failed to register model version: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/models/{model_type}/active")
    def get_active_model(model_type: str):
        """Get the currently active model version for a model type"""
        try:
            version = monitor.get_active_model_version(model_type)
            if not version:
                raise HTTPException(status_code=404, detail=f"No active model found for {model_type}")
            return version.to_dict()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get active model: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/models/{model_type}/versions")
    def get_model_versions(model_type: str):
        """Get all versions for a model type"""
        try:
            versions = monitor.get_all_model_versions(model_type)
            return {"model_type": model_type, "versions": [v.to_dict() for v in versions]}
        except Exception as e:
            logger.error(f"Failed to get model versions: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/predictions/log")
    def log_prediction(request: LogPredictionRequest):
        """Log a single prediction"""
        try:
            input_hash = create_input_hash(request.input_data)
            metric = PredictionMetric(
                timestamp=datetime.utcnow(),
                model_name=request.model_name,
                model_version=request.model_version,
                prediction_type=PredictionType(request.prediction_type),
                input_hash=input_hash,
                predicted_value=request.predicted_value,
                actual_value=request.actual_value,
                confidence=request.confidence,
                latency_ms=request.latency_ms,
                metadata=request.metadata
            )
            prediction_id = monitor.log_prediction(metric)
            return {
                "success": True,
                "prediction_id": prediction_id
            }
        except Exception as e:
            logger.error(f"Failed to log prediction: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/models/{model_name}/metrics")
    def get_model_metrics(
        model_name: str,
        model_version: str = Query(...),
        hours: int = Query(1, ge=1, le=168)
    ):
        """Get model metrics for a time window"""
        try:
            metrics = monitor.calculate_metrics(model_name, model_version, hours)
            return metrics.to_dict()
        except Exception as e:
            logger.error(f"Failed to get model metrics: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/models/detect-drift")
    def detect_drift(request: DetectDriftRequest):
        """Detect data/prediction drift"""
        try:
            result = monitor.detect_drift(
                request.model_name,
                request.model_version,
                request.reference_data,
                request.current_data,
                request.threshold
            )
            return result
        except Exception as e:
            logger.error(f"Failed to detect drift: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/health/models")
    def get_models_health(model_type: Optional[str] = None):
        """Get comprehensive health dashboard for models"""
        try:
            dashboard = monitor.get_model_health_dashboard(model_type)
            return dashboard
        except Exception as e:
            logger.error(f"Failed to get health dashboard: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/health")
    def health_check():
        """Overall system health check"""
        try:
            dashboard = monitor.get_model_health_dashboard()
            model_count = len(dashboard.get("models", []))
            unhealthy_models = [m for m in dashboard.get("models", []) if m["status"] == "unhealthy"]
            
            overall_status = "healthy"
            if unhealthy_models:
                overall_status = "unhealthy"
            elif any(m["status"] == "degraded" for m in dashboard.get("models", [])):
                overall_status = "degraded"
            
            return {
                "status": overall_status,
                "timestamp": datetime.utcnow().isoformat(),
                "total_models": model_count,
                "healthy_models": model_count - len(unhealthy_models),
                "unhealthy_models": len(unhealthy_models),
                "details": dashboard
            }
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unknown",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    @app.post("/api/models/{model_name}/rollback")
    def rollback_model(model_name: str):
        """Rollback to previous model version"""
        try:
            # Extract model type from name (e.g., "forecast_v2" -> "forecast")
            model_type = model_name.rsplit("_", 1)[0]
            success = monitor.rollback_to_previous_version(model_type)
            
            if not success:
                raise HTTPException(status_code=400, detail="Rollback failed or no previous version")
            
            return {
                "success": True,
                "message": f"Successfully rolled back {model_name}"
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to rollback model: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # ============ ROLLOUT CONTROL ENDPOINTS ============

    @app.post("/api/features/flags/create")
    def create_feature_flag(request: CreateFeatureFlagRequest):
        """Create a new feature flag"""
        try:
            flag = FeatureFlag(
                name=request.name,
                description=request.description,
                status=FeatureFlagStatus(request.status),
                rollout_strategy=RolloutStrategy(request.rollout_strategy),
                rollout_percentage=request.rollout_percentage,
                created_at=datetime.utcnow(),
                targeting_rules=request.targeting_rules
            )
            flag_id = rollout.create_feature_flag(flag)
            return {
                "success": True,
                "flag_id": flag_id,
                "name": request.name
            }
        except Exception as e:
            logger.error(f"Failed to create feature flag: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/features/flags/{name}")
    def get_feature_flag(name: str):
        """Get a feature flag by name"""
        try:
            flag = rollout.get_feature_flag(name)
            if not flag:
                raise HTTPException(status_code=404, detail=f"Feature flag '{name}' not found")
            return flag.to_dict()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get feature flag: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/features/check/{name}")
    def check_feature_enabled(
        name: str,
        user_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        """Check if a feature is enabled for given user/context"""
        try:
            enabled = rollout.is_feature_enabled(name, user_id, context)
            return {
                "feature": name,
                "enabled": enabled,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to check feature: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.put("/api/features/flags/{name}")
    def update_feature_flag(name: str, updates: Dict[str, Any]):
        """Update a feature flag"""
        try:
            success = rollout.update_feature_flag(name, **updates)
            if not success:
                raise HTTPException(status_code=404, detail=f"Feature flag '{name}' not found")
            
            return {
                "success": True,
                "message": f"Updated feature flag '{name}'"
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to update feature flag: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/features/flags/{name}/canary/start")
    def start_canary(
        name: str,
        initial_percentage: float = Query(5.0, ge=0.1, le=100),
        max_percentage: float = Query(100.0, ge=0.1, le=100),
        step: float = Query(5.0, ge=0.1, le=50)
    ):
        """Start canary deployment for a feature"""
        try:
            success = rollout.start_canary_deployment(name, initial_percentage, max_percentage, step)
            if not success:
                raise HTTPException(status_code=400, detail="Failed to start canary deployment")
            
            return {
                "success": True,
                "feature": name,
                "canary_started": True,
                "initial_percentage": initial_percentage
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to start canary: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/features/flags/{name}/canary/increment")
    def increment_canary(name: str):
        """Increment canary deployment to next stage"""
        try:
            success = rollout.increment_canary_deployment(name)
            if not success:
                raise HTTPException(status_code=400, detail="Failed to increment canary")
            
            flag = rollout.get_feature_flag(name)
            return {
                "success": True,
                "feature": name,
                "new_traffic_percentage": flag.rollout_percentage if flag else None
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to increment canary: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/features/flags/{name}/shadow")
    def start_shadow_deployment(name: str, model_version: str = Query(...)):
        """Start shadow deployment for a feature"""
        try:
            success = rollout.shadow_mode_deployment(name, model_version)
            if not success:
                raise HTTPException(status_code=400, detail="Failed to start shadow deployment")
            
            return {
                "success": True,
                "feature": name,
                "shadow_mode": True,
                "shadow_model_version": model_version
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to start shadow deployment: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # ============ A/B TESTING ENDPOINTS ============

    @app.post("/api/ab-tests/create")
    def create_ab_test(request: CreateABTestRequest):
        """Create a new A/B test"""
        try:
            variants = [ABTestVariant(**v) for v in request.variants]
            
            ab_test = ABTest(
                test_id=request.test_id,
                name=request.name,
                feature_name=request.feature_name,
                model_type=request.model_type,
                variants=variants,
                status="active",
                start_date=datetime.utcnow(),
                end_date=datetime.fromisoformat(request.end_date) if request.end_date else None,
                created_at=datetime.utcnow()
            )
            
            test_id = rollout.create_ab_test(ab_test)
            return {
                "success": True,
                "test_id": test_id,
                "name": request.name
            }
        except Exception as e:
            logger.error(f"Failed to create A/B test: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/ab-tests/{test_id}/variant")
    def get_ab_test_variant(test_id: str, user_id: str = Query(...)):
        """Get A/B test variant for a user"""
        try:
            variant = rollout.get_ab_test_variant(test_id, user_id)
            if not variant:
                raise HTTPException(status_code=404, detail="Test not found or inactive")
            
            return {
                "test_id": test_id,
                "user_id": user_id,
                "variant": variant
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get A/B test variant: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/ab-tests/events/record")
    def record_ab_test_event(request: RecordABTestEventRequest):
        """Record an A/B test event"""
        try:
            success = rollout.record_ab_test_event(
                request.test_id,
                request.user_id,
                request.variant_name,
                request.event_type,
                request.metrics
            )
            
            if not success:
                raise HTTPException(status_code=400, detail="Failed to record event")
            
            return {"success": True}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to record A/B test event: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/ab-tests/{test_id}/results")
    def get_ab_test_results(test_id: str):
        """Get aggregated results for an A/B test"""
        try:
            results = rollout.get_ab_test_results(test_id)
            if not results:
                raise HTTPException(status_code=404, detail="Test not found")
            
            return results
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get A/B test results: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/ab-tests/{test_id}/conclude")
    def conclude_ab_test(test_id: str, winner_variant: str = Query(...)):
        """Conclude an A/B test"""
        try:
            success = rollout.conclude_ab_test(test_id, winner_variant)
            if not success:
                raise HTTPException(status_code=400, detail="Failed to conclude test")
            
            return {
                "success": True,
                "test_id": test_id,
                "winner": winner_variant
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to conclude A/B test: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    logger.info("✅ Monitoring and rollout control APIs initialized")
