# Model Monitoring & Production Rollout Controls

Comprehensive system for monitoring ML models in production and controlling their deployment with safety guarantees.

---

## Overview

This monitoring system provides:

✅ **Model Versioning** - Track all model versions, their parameters, and deployment status  
✅ **Performance Metrics** - Real-time tracking of predictions, latency, accuracy, error rates  
✅ **Data Drift Detection** - Identify when model performance degrades due to data changes  
✅ **Feature Flags** - Enable/disable models and features at runtime  
✅ **Canary Deployments** - Gradual rollout to small % of traffic, expand based on metrics  
✅ **A/B Testing** - Compare model versions against each other in production  
✅ **Shadow Deployment** - Run new model in parallel without affecting results  
✅ **Automatic Rollback** - Quick rollback to previous stable version if issues detected  
✅ **Health Dashboard** - Real-time system health across all models  

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐      ┌──────────────────────┐    │
│  │ ModelMonitor        │      │ RolloutControl       │    │
│  ├─────────────────────┤      ├──────────────────────┤    │
│  │ • Track predictions │      │ • Feature flags      │    │
│  │ • Calculate metrics │      │ • Canary deployments │    │
│  │ • Detect drift      │      │ • A/B testing        │    │
│  │ • Health tracking   │      │ • Traffic control    │    │
│  └─────────────────────┘      └──────────────────────┘    │
│           │                              │                 │
│           └──────────┬──────────────────┘                  │
│                      │                                     │
│              ┌──────────────────┐                          │
│              │  MongoDB         │                          │
│              ├──────────────────┤                          │
│              │ • model_versions │                          │
│              │ • predictions    │                          │
│              │ • metrics        │                          │
│              │ • feature_flags  │                          │
│              │ • ab_tests       │                          │
│              │ • drift_data     │                          │
│              └──────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation & Setup

### 1. Update Dependencies

```bash
pip install -r requirements.txt
```

### 2. Initialize in Python Backend

In `main.py`, add at startup:

```python
from model_monitoring import ModelMonitor
from rollout_control import RolloutControl
from management_api import init_monitoring_apis

# Initialize monitoring systems
monitor = ModelMonitor(db)
rollout = RolloutControl(db)

# Initialize API endpoints
init_monitoring_apis(app, monitor, rollout)
```

### 3. Configure Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=rgm_tool_prod

# Monitoring
ENABLE_MODEL_MONITORING=true
DRIFT_DETECTION_THRESHOLD=0.3
HEALTH_CHECK_INTERVAL_HOURS=1
```

---

## API Reference

### Model Monitoring

#### Register a New Model Version
```
POST /api/models/register-version

Request:
{
  "name": "forecast_v2",
  "model_type": "forecast",
  "version": "2.0.0",
  "parameters": {
    "degree": 2,
    "alpha": 1.0,
    "max_features": 50
  },
  "description": "Improved polynomial features",
  "is_default": false
}

Response:
{
  "success": true,
  "version_id": "507f1f77bcf86cd799439011",
  "message": "Registered model forecast_v2 v2.0.0"
}
```

#### Get Active Model Version
```
GET /api/models/{model_type}/active

Response:
{
  "name": "forecast_v1",
  "model_type": "forecast",
  "version": "1.0.0",
  "parameters": {...},
  "status": "active",
  "is_default": true,
  "created_at": "2026-01-15T10:30:00"
}
```

#### Get All Versions for a Model Type
```
GET /api/models/{model_type}/versions

Response:
{
  "model_type": "forecast",
  "versions": [
    {"name": "forecast_v2", "version": "2.0.0", ...},
    {"name": "forecast_v1", "version": "1.0.0", ...}
  ]
}
```

#### Log a Prediction
```
POST /api/predictions/log

Request:
{
  "model_name": "forecast_v1",
  "model_version": "1.0.0",
  "prediction_type": "forecast",
  "input_data": {
    "product_id": "507f1f77bcf86cd799439011",
    "horizon_months": 12
  },
  "predicted_value": 1500.0,
  "actual_value": 1480.0,
  "confidence": 0.95,
  "latency_ms": 45.2,
  "metadata": {
    "region": "North America"
  }
}

Response:
{
  "success": true,
  "prediction_id": "507f1f77bcf86cd799439012"
}
```

#### Get Model Metrics
```
GET /api/models/{model_name}/metrics?model_version=1.0.0&hours=24

Response:
{
  "model_name": "forecast_v1",
  "model_version": "1.0.0",
  "timestamp": "2026-02-16T10:00:00",
  "total_predictions": 1250,
  "avg_latency_ms": 42.5,
  "error_rate": 0.08,
  "mean_absolute_error": 125.0,
  "mean_squared_error": 18750.0,
  "status": "healthy",
  "prediction_volume": 1250
}
```

#### Detect Data Drift
```
POST /api/models/detect-drift

Request:
{
  "model_name": "forecast_v1",
  "model_version": "1.0.0",
  "reference_data": [1000, 1100, 1050, 1150, 1200],
  "current_data": [1500, 1600, 1550, 1700, 1800],
  "threshold": 0.3
}

Response:
{
  "model_name": "forecast_v1",
  "model_version": "1.0.0",
  "drift_detected": true,
  "drift_score": 0.45,
  "mean_shift": 0.65,
  "std_shift": 0.25,
  "reason": "Distribution shift detected"
}
```

#### Get Health Dashboard
```
GET /api/health/models?model_type=forecast

Response:
{
  "timestamp": "2026-02-16T10:00:00",
  "models": [
    {
      "name": "forecast_v1",
      "version": "1.0.0",
      "status": "healthy",
      "is_active": true,
      "metrics": {
        "total_predictions": 1250,
        "avg_latency_ms": 42.5,
        "error_rate": 0.08
      }
    }
  ]
}
```

#### Overall System Health
```
GET /api/health

Response:
{
  "status": "healthy",
  "timestamp": "2026-02-16T10:00:00",
  "total_models": 12,
  "healthy_models": 11,
  "unhealthy_models": 1
}
```

#### Rollback Model to Previous Version
```
POST /api/models/{model_name}/rollback

Response:
{
  "success": true,
  "message": "Successfully rolled back forecast_v2 to forecast_v1"
}
```

---

### Feature Flags & Rollout Control

#### Create Feature Flag
```
POST /api/features/flags/create

Request:
{
  "name": "use_ml_forecast",
  "description": "Use ML-based demand forecasting",
  "status": "disabled",
  "rollout_strategy": "percentage",
  "rollout_percentage": 10.0,
  "targeting_rules": {}
}

Response:
{
  "success": true,
  "flag_id": "507f1f77bcf86cd799439013",
  "name": "use_ml_forecast"
}
```

#### Get Feature Flag
```
GET /api/features/flags/{name}

Response:
{
  "name": "use_ml_forecast",
  "description": "Use ML-based demand forecasting",
  "status": "rollout",
  "rollout_strategy": "percentage",
  "rollout_percentage": 25.0,
  "created_at": "2026-01-15T10:30:00"
}
```

#### Check if Feature is Enabled (Per-User)
```
GET /api/features/check/{name}?user_id=user123

Response:
{
  "feature": "use_ml_forecast",
  "enabled": true,
  "user_id": "user123",
  "timestamp": "2026-02-16T10:00:00"
}
```

#### Update Feature Flag
```
PUT /api/features/flags/{name}

Request:
{
  "rollout_percentage": 50.0,
  "status": "rollout"
}

Response:
{
  "success": true,
  "message": "Updated feature flag 'use_ml_forecast'"
}
```

#### Start Canary Deployment
```
POST /api/features/flags/{name}/canary/start?initial_percentage=5&max_percentage=100&step=5

Response:
{
  "success": true,
  "feature": "use_ml_forecast",
  "canary_started": true,
  "initial_percentage": 5.0
}
```

#### Increment Canary Deployment
```
POST /api/features/flags/{name}/canary/increment

Response:
{
  "success": true,
  "feature": "use_ml_forecast",
  "new_traffic_percentage": 10.0
}
```

#### Start Shadow Deployment
```
POST /api/features/flags/{name}/shadow?model_version=forecast_v2

Response:
{
  "success": true,
  "feature": "use_ml_forecast",
  "shadow_mode": true,
  "shadow_model_version": "forecast_v2"
}
```

---

### A/B Testing

#### Create A/B Test
```
POST /api/ab-tests/create

Request:
{
  "test_id": "forecast_v2_vs_v1",
  "name": "Compare Forecast V2 vs V1",
  "feature_name": "forecast_model",
  "model_type": "forecast",
  "variants": [
    {
      "name": "control",
      "description": "Forecast V1",
      "traffic_percentage": 50,
      "model_version": "1.0.0",
      "is_control": true
    },
    {
      "name": "treatment",
      "description": "Forecast V2",
      "traffic_percentage": 50,
      "model_version": "2.0.0",
      "is_control": false
    }
  ],
  "end_date": "2026-03-16T00:00:00"
}

Response:
{
  "success": true,
  "test_id": "507f1f77bcf86cd799439014",
  "name": "Compare Forecast V2 vs V1"
}
```

#### Get A/B Test Variant for User
```
GET /api/ab-tests/{test_id}/variant?user_id=user123

Response:
{
  "test_id": "forecast_v2_vs_v1",
  "user_id": "user123",
  "variant": "treatment"
}
```

#### Record A/B Test Event
```
POST /api/ab-tests/events/record

Request:
{
  "test_id": "forecast_v2_vs_v1",
  "user_id": "user123",
  "variant_name": "treatment",
  "event_type": "conversion",
  "metrics": {
    "forecast_accuracy": 0.92,
    "mae": 125.5
  }
}

Response:
{
  "success": true
}
```

#### Get A/B Test Results
```
GET /api/ab-tests/{test_id}/results

Response:
{
  "test_id": "forecast_v2_vs_v1",
  "name": "Compare Forecast V2 vs V1",
  "status": "active",
  "total_events": 5000,
  "variants": {
    "control": {
      "traffic_percentage": 50,
      "total_events": 2500,
      "model_version": "1.0.0",
      "metrics": {
        "forecast_accuracy": {
          "mean": 0.88,
          "min": 0.75,
          "max": 0.95
        }
      }
    },
    "treatment": {
      "traffic_percentage": 50,
      "total_events": 2500,
      "model_version": "2.0.0",
      "metrics": {
        "forecast_accuracy": {
          "mean": 0.92,
          "min": 0.80,
          "max": 0.98
        }
      }
    }
  }
}
```

#### Conclude A/B Test
```
POST /api/ab-tests/{test_id}/conclude?winner_variant=treatment

Response:
{
  "success": true,
  "test_id": "forecast_v2_vs_v1",
  "winner": "treatment"
}
```

---

## Usage Examples

### Example 1: Canary Deployment

```python
# 1. Register new model version
POST /api/models/register-version
{
  "name": "forecast_v2",
  "model_type": "forecast",
  "version": "2.0.0",
  "parameters": {...}
}

# 2. Create feature flag
POST /api/features/flags/create
{
  "name": "use_ml_forecast",
  "status": "disabled"
}

# 3. Start canary with 5% traffic
POST /api/features/flags/use_ml_forecast/canary/start?initial_percentage=5

# 4. Monitor metrics
GET /api/health/models?model_type=forecast

# 5. If metrics healthy, increment to 25%
POST /api/features/flags/use_ml_forecast/canary/increment

# 6. Continue until 100%
POST /api/features/flags/use_ml_forecast/canary/increment
```

### Example 2: A/B Testing

```python
# 1. Create A/B test (50% old vs 50% new)
POST /api/ab-tests/create
{
  "test_id": "forecast_v2_vs_v1",
  "name": "Forecast V2 Comparison",
  "feature_name": "forecast",
  "model_type": "forecast",
  "variants": [
    {"name": "control", "traffic_percentage": 50, "model_version": "1.0.0"},
    {"name": "treatment", "traffic_percentage": 50, "model_version": "2.0.0"}
  ]
}

# 2. Get variant for each user
GET /api/ab-tests/forecast_v2_vs_v1/variant?user_id=user123

# 3. Log events to track performance
POST /api/ab-tests/events/record
{
  "test_id": "forecast_v2_vs_v1",
  "user_id": "user123",
  "variant_name": "treatment",
  "event_type": "prediction",
  "metrics": {"accuracy": 0.92, "latency_ms": 45}
}

# 4. After sufficient data, get results
GET /api/ab-tests/forecast_v2_vs_v1/results

# 5. Conclude test with winner
POST /api/ab-tests/forecast_v2_vs_v1/conclude?winner_variant=treatment
```

### Example 3: Automatic Rollback on Drift

```python
# 1. Monitor for drift
POST /api/models/detect-drift
{
  "model_name": "forecast_v2",
  "model_version": "2.0.0",
  "reference_data": [...historical...],
  "current_data": [...recent...]
}

# 2. If drift score > threshold, trigger rollback
POST /api/models/forecast_v2/rollback

# 3. Verify health returned to normal
GET /api/health
```

---

## Monitoring Best Practices

### 1. Always Log Predictions
Log every prediction with latency and confidence for comprehensive monitoring:
```python
monitor.log_prediction(PredictionMetric(
    timestamp=datetime.utcnow(),
    model_name="forecast_v1",
    model_version="1.0.0",
    prediction_type=PredictionType.FORECAST,
    predicted_value=1500.0,
    actual_value=actual_demand,  # Log actual once available
    latency_ms=latency,
    confidence=confidence_score
))
```

### 2. Regular Drift Checks
Run drift detection hourly on production models:
```python
monitor.detect_drift(
    "forecast_v1", "1.0.0",
    reference_historical_data,
    recent_predictions_data
)
```

### 3. Gradual Rollouts
Always start with small canary percentage:
- Day 1: 5% traffic → Monitor metrics
- Day 2: 25% traffic → Monitor metrics
- Day 3: 50% traffic → Monitor metrics
- Day 4: 100% traffic

### 4. A/B Test Duration
Run A/B tests long enough for statistical significance:
- Minimum: 1-2 weeks for most metrics
- Aim for 5-10% improvement to declare winner

### 5. Feature Flag Guards
Use feature flags as circuit breakers:
```python
if rollout.is_feature_enabled("use_ml_forecast", user_id=user_id):
    prediction = ml_model.predict(data)
else:
    prediction = fallback_logic(data)
```

### 6. Health Checks
Monitor system health continuously:
```python
health = GET /api/health
if health["status"] == "unhealthy":
    alert_ops_team()  # Trigger incident response
```

---

## Database Schema

### model_versions
```json
{
  "_id": ObjectId,
  "name": "forecast_v2",
  "model_type": "forecast",
  "version": "2.0.0",
  "parameters": {...},
  "status": "active|inactive|deprecated",
  "is_default": true,
  "canary_traffic": 0.0,
  "created_at": ISODate,
  "description": "...",
  "metadata": {}
}
```

### model_predictions
```json
{
  "_id": ObjectId,
  "model_name": "forecast_v1",
  "model_version": "1.0.0",
  "prediction_type": "forecast",
  "predicted_value": 1500.0,
  "actual_value": 1480.0,
  "confidence": 0.95,
  "latency_ms": 45.2,
  "input_hash": "abc123...",
  "timestamp": ISODate,
  "metadata": {}
}
```

### model_metrics
```json
{
  "_id": ObjectId,
  "model_name": "forecast_v1",
  "model_version": "1.0.0",
  "total_predictions": 1250,
  "avg_latency_ms": 42.5,
  "error_rate": 0.08,
  "mean_absolute_error": 125.0,
  "drift_score": 0.1,
  "status": "healthy|degraded|unhealthy",
  "timestamp": ISODate
}
```

### feature_flags
```json
{
  "_id": ObjectId,
  "name": "use_ml_forecast",
  "description": "...",
  "status": "enabled|disabled|rollout",
  "rollout_strategy": "all_users|percentage|canary|shadow|blue_green",
  "rollout_percentage": 50.0,
  "targeting_rules": {},
  "created_at": ISODate,
  "updated_at": ISODate,
  "metadata": {}
}
```

### ab_tests
```json
{
  "_id": ObjectId,
  "test_id": "forecast_v2_vs_v1",
  "name": "Compare Forecast V2 vs V1",
  "feature_name": "forecast",
  "model_type": "forecast",
  "status": "pending|active|concluded|archived",
  "variants": [
    {"name": "control", "traffic_percentage": 50, "model_version": "1.0.0"}
  ],
  "start_date": ISODate,
  "end_date": ISODate,
  "created_at": ISODate
}
```

---

## Troubleshooting

**Q: Canary deployment stuck at same percentage?**
A: Check if metrics are degrading. Verify model predictions are logging correctly with `GET /api/models/{name}/metrics`

**Q: A/B test results are skewed?**
A: Ensure user IDs are consistent. Check `GET /api/ab-tests/{id}/results` to see traffic distribution.

**Q: Rollback not working?**
A: Verify previous version exists with `GET /api/models/{type}/versions`. System needs at least 2 versions.

**Q: Drift score always high?**
A: Adjust threshold based on your use case. Default is 0.3, you can tune with `threshold` parameter.

---

## Next Steps

1. **Integrate into existing endpoints** - Add prediction logging to every forecast, pricing, promotion, assortment endpoint
2. **Set up monitoring dashboard** - Create UI to visualize metrics and control rollouts
3. **Implement alerting** - Send alerts when health degrades or drift detected
4. **Automate decisions** - Auto-rollback on sustained degradation
5. **Add custom metrics** - Track business metrics (revenue impact, customer satisfaction, etc.)
