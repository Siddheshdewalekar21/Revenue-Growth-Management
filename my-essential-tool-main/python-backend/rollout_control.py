"""
Feature Flags and Rollout Controls System
- Enable/disable models and features dynamically
- A/B testing framework (canary deployments)
- Gradual rollout with traffic percentage
- Per-user and per-segment feature toggles
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, asdict, field
from enum import Enum
import random
import hashlib


logger = logging.getLogger(__name__)


class RolloutStrategy(str, Enum):
    """Rollout strategy types"""
    ALL_USERS = "all_users"  # Rollout to all users immediately
    PERCENTAGE = "percentage"  # Rollout to X% of users
    CANARY = "canary"  # Small percentage, monitor, then expand
    SHADOW = "shadow"  # Run in parallel without affecting results
    BLUE_GREEN = "blue_green"  # Atomic switch between versions


class FeatureFlagStatus(str, Enum):
    """Feature flag status"""
    ENABLED = "enabled"
    DISABLED = "disabled"
    ROLLOUT = "rollout"  # Gradual rollout in progress


@dataclass
class FeatureFlag:
    """Feature flag configuration"""
    name: str  # e.g., "use_ml_forecast", "pricing_v2"
    description: str = ""
    status: FeatureFlagStatus = FeatureFlagStatus.DISABLED
    rollout_strategy: RolloutStrategy = RolloutStrategy.ALL_USERS
    rollout_percentage: float = 100.0  # 0-100
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    targeting_rules: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['status'] = self.status.value
        data['rollout_strategy'] = self.rollout_strategy.value
        data['created_at'] = self.created_at.isoformat()
        data['updated_at'] = self.updated_at.isoformat()
        return data


@dataclass
class ABTestVariant:
    """A/B test variant configuration"""
    name: str  # e.g., "control", "treatment"
    description: str = ""
    traffic_percentage: float = 50.0  # 0-100
    model_version: str = ""
    is_control: bool = False
    metrics_snapshot: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ABTest:
    """A/B test configuration"""
    test_id: str
    name: str  # e.g., "forecast_model_v2_vs_v1"
    feature_name: str  # Which feature is being tested
    model_type: str  # forecast, pricing, etc.
    variants: List[ABTestVariant] = field(default_factory=list)
    status: str = "pending"  # pending, active, concluded, archived
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['variants'] = [asdict(v) for v in self.variants]
        data['created_at'] = self.created_at.isoformat()
        if self.start_date:
            data['start_date'] = self.start_date.isoformat()
        if self.end_date:
            data['end_date'] = self.end_date.isoformat()
        return data


class RolloutControl:
    """Central rollout control and feature flag management system"""

    def __init__(self, db):
        """
        Initialize rollout control with MongoDB connection
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.logger = logging.getLogger(__name__)
        self._ensure_indexes()

    def _ensure_indexes(self) -> None:
        """Create necessary MongoDB indexes"""
        try:
            self.db.feature_flags.create_index("name", unique=True)
            self.db.feature_flags.create_index([("status", 1)])
            
            self.db.ab_tests.create_index("test_id", unique=True)
            self.db.ab_tests.create_index([("feature_name", 1), ("status", 1)])
            self.db.ab_tests.create_index([("model_type", 1)])
            
            self.db.rollout_logs.create_index([("feature_name", 1), ("timestamp", -1)])
            self.db.rollout_logs.create_index([("user_id", 1)])
            
            self.logger.info("Rollout control indexes created")
        except Exception as e:
            self.logger.error(f"Failed to create indexes: {e}")

    def create_feature_flag(self, flag: FeatureFlag) -> str:
        """
        Create a new feature flag
        
        Args:
            flag: FeatureFlag object
            
        Returns:
            flag_id (string)
        """
        try:
            doc = flag.to_dict()
            result = self.db.feature_flags.insert_one(doc)
            self.logger.info(f"Created feature flag: {flag.name}")
            return str(result.inserted_id)
        except Exception as e:
            self.logger.error(f"Failed to create feature flag: {e}")
            raise

    def get_feature_flag(self, name: str) -> Optional[FeatureFlag]:
        """Get a feature flag by name"""
        try:
            doc = self.db.feature_flags.find_one({"name": name})
            if doc:
                return self._doc_to_feature_flag(doc)
            return None
        except Exception as e:
            self.logger.error(f"Failed to get feature flag: {e}")
            return None

    def update_feature_flag(self, name: str, **kwargs) -> bool:
        """
        Update a feature flag
        
        Args:
            name: Feature flag name
            **kwargs: Fields to update
            
        Returns:
            Success status
        """
        try:
            update_data = {k: v for k, v in kwargs.items() if k != 'name'}
            update_data['updated_at'] = datetime.utcnow().isoformat()
            
            result = self.db.feature_flags.update_one(
                {"name": name},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                self.logger.info(f"Updated feature flag: {name}")
                self._log_rollout_change("update", name, update_data)
                return True
            return False
        except Exception as e:
            self.logger.error(f"Failed to update feature flag: {e}")
            return False

    def is_feature_enabled(self, feature_name: str, user_id: Optional[str] = None,
                          context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Check if a feature is enabled for a user/context
        
        Args:
            feature_name: Name of the feature
            user_id: Optional user ID for user-specific targeting
            context: Optional context for advanced targeting
            
        Returns:
            Whether feature is enabled
        """
        try:
            flag = self.get_feature_flag(feature_name)
            if not flag:
                return False
            
            # Disabled globally
            if flag.status == FeatureFlagStatus.DISABLED:
                return False
            
            # Enabled for all
            if flag.status == FeatureFlagStatus.ENABLED and flag.rollout_strategy == RolloutStrategy.ALL_USERS:
                return True
            
            # Check percentage-based rollout
            if flag.rollout_strategy == RolloutStrategy.PERCENTAGE:
                if user_id:
                    # Consistent hashing for same user always gets same variant
                    user_hash = int(hashlib.md5(f"{feature_name}:{user_id}".encode()).hexdigest(), 16)
                    user_percentage = (user_hash % 100) + 1
                    return user_percentage <= flag.rollout_percentage
                else:
                    # Random rollout if no user_id
                    return random.random() * 100 <= flag.rollout_percentage
            
            # Check targeting rules
            if flag.targeting_rules and context:
                return self._check_targeting_rules(flag.targeting_rules, context)
            
            return flag.status == FeatureFlagStatus.ENABLED
        except Exception as e:
            self.logger.error(f"Failed to check feature flag: {e}")
            return False

    def start_canary_deployment(self, feature_name: str, initial_percentage: float = 5.0,
                               max_percentage: float = 100.0, step: float = 5.0) -> bool:
        """
        Start a canary deployment for a feature
        
        Args:
            feature_name: Feature to deploy
            initial_percentage: Initial traffic percentage (e.g., 5%)
            max_percentage: Target traffic percentage
            step: Increment percentage between stages
            
        Returns:
            Success status
        """
        try:
            return self.update_feature_flag(
                feature_name,
                status=FeatureFlagStatus.ROLLOUT.value,
                rollout_strategy=RolloutStrategy.CANARY.value,
                rollout_percentage=initial_percentage,
                metadata={
                    "canary_config": {
                        "initial": initial_percentage,
                        "max": max_percentage,
                        "step": step,
                        "started_at": datetime.utcnow().isoformat()
                    }
                }
            )
        except Exception as e:
            self.logger.error(f"Failed to start canary deployment: {e}")
            return False

    def increment_canary_deployment(self, feature_name: str) -> bool:
        """
        Increment canary deployment to next stage
        
        Args:
            feature_name: Feature to increment
            
        Returns:
            Success status
        """
        try:
            flag = self.get_feature_flag(feature_name)
            if not flag or flag.rollout_strategy != RolloutStrategy.CANARY:
                return False
            
            metadata = flag.metadata or {}
            canary_config = metadata.get("canary_config", {})
            current_percentage = flag.rollout_percentage
            step = canary_config.get("step", 5.0)
            max_percentage = canary_config.get("max", 100.0)
            
            new_percentage = min(current_percentage + step, max_percentage)
            
            return self.update_feature_flag(
                feature_name,
                rollout_percentage=new_percentage,
                status=FeatureFlagStatus.ENABLED.value if new_percentage >= 100 else FeatureFlagStatus.ROLLOUT.value
            )
        except Exception as e:
            self.logger.error(f"Failed to increment canary deployment: {e}")
            return False

    def create_ab_test(self, ab_test: ABTest) -> str:
        """
        Create a new A/B test
        
        Args:
            ab_test: ABTest object
            
        Returns:
            test_id (string)
        """
        try:
            doc = ab_test.to_dict()
            result = self.db.ab_tests.insert_one(doc)
            self.logger.info(f"Created A/B test: {ab_test.test_id}")
            return str(result.inserted_id)
        except Exception as e:
            self.logger.error(f"Failed to create A/B test: {e}")
            raise

    def get_ab_test_variant(self, test_id: str, user_id: str) -> Optional[str]:
        """
        Get A/B test variant for a user
        Uses consistent hashing to ensure same user always gets same variant
        
        Args:
            test_id: A/B test ID
            user_id: User ID
            
        Returns:
            Variant name or None
        """
        try:
            test = self.db.ab_tests.find_one({"test_id": test_id})
            if not test or test.get("status") != "active":
                return None
            
            # Consistent hashing
            user_hash = int(hashlib.md5(f"{test_id}:{user_id}".encode()).hexdigest(), 16)
            variant_random = (user_hash % 100) + 1
            
            cumulative = 0
            for variant in test.get("variants", []):
                cumulative += variant.get("traffic_percentage", 0)
                if variant_random <= cumulative:
                    return variant.get("name")
            
            # Fallback to first variant
            variants = test.get("variants", [])
            return variants[0].get("name") if variants else None
        except Exception as e:
            self.logger.error(f"Failed to get A/B test variant: {e}")
            return None

    def record_ab_test_event(self, test_id: str, user_id: str, variant_name: str,
                            event_type: str, metrics: Dict[str, Any]) -> bool:
        """
        Record A/B test event (conversion, metric, etc.)
        
        Args:
            test_id: A/B test ID
            user_id: User ID
            variant_name: Variant name
            event_type: Type of event (impression, conversion, etc.)
            metrics: Event metrics
            
        Returns:
            Success status
        """
        try:
            event = {
                "test_id": test_id,
                "user_id": user_id,
                "variant_name": variant_name,
                "event_type": event_type,
                "metrics": metrics,
                "timestamp": datetime.utcnow().isoformat()
            }
            self.db.ab_test_events.insert_one(event)
            return True
        except Exception as e:
            self.logger.error(f"Failed to record A/B test event: {e}")
            return False

    def get_ab_test_results(self, test_id: str) -> Dict[str, Any]:
        """
        Get aggregated results for an A/B test
        
        Args:
            test_id: A/B test ID
            
        Returns:
            Test results dictionary
        """
        try:
            test = self.db.ab_tests.find_one({"test_id": test_id})
            if not test:
                return {}
            
            events = list(self.db.ab_test_events.find({"test_id": test_id}))
            
            results = {
                "test_id": test_id,
                "name": test.get("name"),
                "status": test.get("status"),
                "total_events": len(events),
                "variants": {}
            }
            
            # Aggregate by variant
            for variant in test.get("variants", []):
                variant_name = variant.get("name")
                variant_events = [e for e in events if e.get("variant_name") == variant_name]
                
                results["variants"][variant_name] = {
                    "traffic_percentage": variant.get("traffic_percentage"),
                    "total_events": len(variant_events),
                    "model_version": variant.get("model_version"),
                    "metrics": self._aggregate_variant_metrics(variant_events)
                }
            
            return results
        except Exception as e:
            self.logger.error(f"Failed to get A/B test results: {e}")
            return {}

    def conclude_ab_test(self, test_id: str, winner_variant: str) -> bool:
        """
        Conclude an A/B test and promote winner
        
        Args:
            test_id: A/B test ID
            winner_variant: Name of winning variant
            
        Returns:
            Success status
        """
        try:
            result = self.db.ab_tests.update_one(
                {"test_id": test_id},
                {
                    "$set": {
                        "status": "concluded",
                        "winner_variant": winner_variant,
                        "concluded_at": datetime.utcnow().isoformat()
                    }
                }
            )
            
            if result.modified_count > 0:
                self.logger.info(f"Concluded A/B test {test_id}, winner: {winner_variant}")
                return True
            return False
        except Exception as e:
            self.logger.error(f"Failed to conclude A/B test: {e}")
            return False

    def shadow_mode_deployment(self, feature_name: str, new_model_version: str) -> bool:
        """
        Deploy in shadow mode (run new model parallel without affecting results)
        
        Args:
            feature_name: Feature name
            new_model_version: New model version to shadow
            
        Returns:
            Success status
        """
        try:
            return self.update_feature_flag(
                feature_name,
                rollout_strategy=RolloutStrategy.SHADOW.value,
                metadata={
                    "shadow_model_version": new_model_version,
                    "shadow_started_at": datetime.utcnow().isoformat()
                }
            )
        except Exception as e:
            self.logger.error(f"Failed to start shadow deployment: {e}")
            return False

    def _check_targeting_rules(self, rules: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Check if context matches targeting rules"""
        # Simple implementation - can be expanded with complex logic
        for rule_key, rule_value in rules.items():
            if context.get(rule_key) != rule_value:
                return False
        return True

    def _log_rollout_change(self, change_type: str, feature_name: str, changes: Dict[str, Any]) -> None:
        """Log rollout changes for audit trail"""
        try:
            self.db.rollout_logs.insert_one({
                "change_type": change_type,
                "feature_name": feature_name,
                "changes": changes,
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception as e:
            self.logger.error(f"Failed to log rollout change: {e}")

    @staticmethod
    def _doc_to_feature_flag(doc: Dict[str, Any]) -> FeatureFlag:
        """Convert MongoDB document to FeatureFlag"""
        if isinstance(doc.get("created_at"), str):
            doc["created_at"] = datetime.fromisoformat(doc["created_at"])
        if isinstance(doc.get("updated_at"), str):
            doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
        doc['status'] = FeatureFlagStatus(doc.get("status", "disabled"))
        doc['rollout_strategy'] = RolloutStrategy(doc.get("rollout_strategy", "all_users"))
        return FeatureFlag(**{k: doc[k] for k in FeatureFlag.__dataclass_fields__})

    @staticmethod
    def _aggregate_variant_metrics(events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregate metrics from events"""
        if not events:
            return {}
        
        metrics_list = [e.get("metrics", {}) for e in events]
        
        # Simple aggregation
        aggregated = {}
        for key in set(k for m in metrics_list for k in m.keys()):
            values = [m.get(key, 0) for m in metrics_list if isinstance(m.get(key), (int, float))]
            if values:
                aggregated[key] = {
                    "mean": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values),
                    "count": len(values)
                }
        
        return aggregated
