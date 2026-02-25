# Integration Guide: Adding Monitoring to Existing API Endpoints

This guide shows how to add model monitoring and rollout control to your existing FastAPI endpoints.

---

## Step 1: Import Monitoring Systems

Add these imports at the top of `main.py`:

```python
from model_monitoring import (
    ModelMonitor, PredictionMetric, PredictionType, create_input_hash
)
from rollout_control import RolloutControl
from management_api import init_monitoring_apis
import time
```

---

## Step 2: Initialize at Startup

After creating the FastAPI app and MongoDB connection, add:

```python
app = FastAPI()

# ... existing CORS setup ...

# Initialize monitoring systems
monitor = ModelMonitor(db)
rollout = RolloutControl(db)

# Register monitoring API endpoints
init_monitoring_apis(app, monitor, rollout)

logger = logging.getLogger(__name__)
```

---

## Step 3: Create Monitoring Helpers

Add these helper functions to `main.py`:

```python
def record_monitored_prediction(
    model_name: str,
    model_version: str,
    prediction_type: str,
    input_data: dict,
    predicted_value: any,
    actual_value: any = None,
    confidence: float = 1.0,
    latency_ms: float = 0.0,
    metadata: dict = None
) -> None:
    """
    Record a prediction with monitoring.
    
    Args:
        model_name: Name of the model (e.g., "forecast_v1")
        model_version: Version string (e.g., "1.0.0")
        prediction_type: Type of prediction (forecast, pricing, etc.)
        input_data: Input data used for prediction
        predicted_value: The predicted value
        actual_value: Optional actual value for accuracy tracking
        confidence: Confidence score (0-1)
        latency_ms: Prediction latency in milliseconds
        metadata: Optional additional metadata
    """
    try:
        input_hash = create_input_hash(input_data)
        prediction_metric = PredictionMetric(
            timestamp=datetime.utcnow(),
            model_name=model_name,
            model_version=model_version,
            prediction_type=PredictionType(prediction_type),
            input_hash=input_hash,
            predicted_value=float(predicted_value) if predicted_value is not None else 0.0,
            actual_value=float(actual_value) if actual_value is not None else None,
            confidence=float(confidence),
            latency_ms=float(latency_ms),
            metadata=metadata or {}
        )
        monitor.log_prediction(prediction_metric)
    except Exception as e:
        logger.warning(f"Failed to record prediction: {e}")


def check_feature_enabled(feature_name: str, user_id: str = None) -> bool:
    """
    Check if a feature is enabled for the given user.
    
    Args:
        feature_name: Feature flag name
        user_id: Optional user ID for consistent rollout
        
    Returns:
        True if feature is enabled
    """
    return rollout.is_feature_enabled(feature_name, user_id)


def get_active_model_version(model_type: str) -> Optional[str]:
    """Get the currently active version for a model type"""
    version = monitor.get_active_model_version(model_type)
    return version.version if version else None
```

---

## Step 4: Integrate into Forecast Endpoint

Here's how to add monitoring to the `/api/forecasts/generate` endpoint:

### Before (Original)
```python
@app.post("/api/forecasts/generate")
def generate_forecasts(request: GenerateForecastRequest):
    try:
        forecasts = []
        for product_id in request.product_ids:
            # Generate forecast
            if request.useMl:
                forecast_result = generate_ml_forecast(...)
            else:
                forecast_result = generate_linear_forecast(...)
            forecasts.append(forecast_result)
        return forecasts
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

### After (With Monitoring)
```python
@app.post("/api/forecasts/generate")
def generate_forecasts(request: GenerateForecastRequest):
    try:
        forecasts = []
        
        # Get active ML model version
        active_version = get_active_model_version("forecast")
        use_ml = request.useMl and check_feature_enabled("use_ml_forecast")
        
        for product_id in request.product_ids:
            start_time = time.time()
            
            # Generate forecast
            if use_ml and active_version:
                try:
                    forecast_result = generate_ml_forecast(
                        historical_dates=request.historical_dates,
                        historical_demand=request.historical_demand,
                        horizon_months=request.horizon_months
                    )
                    model_name = "forecast_ml"
                    model_version = active_version
                except Exception as ml_error:
                    logger.warning(f"ML forecast failed, falling back: {ml_error}")
                    forecast_result = generate_linear_forecast(...)
                    model_name = "forecast_linear"
                    model_version = "1.0.0"
            else:
                forecast_result = generate_linear_forecast(...)
                model_name = "forecast_linear"
                model_version = "1.0.0"
            
            # Calculate latency
            latency_ms = (time.time() - start_time) * 1000
            
            # Record prediction
            record_monitored_prediction(
                model_name=model_name,
                model_version=model_version,
                prediction_type="forecast",
                input_data={
                    "product_id": str(product_id),
                    "horizon_months": request.horizon_months,
                    "historical_points": len(request.historical_dates)
                },
                predicted_value=forecast_result.get("forecast_value"),
                confidence=forecast_result.get("confidence", 0.8),
                latency_ms=latency_ms,
                metadata={
                    "method": "ml" if use_ml else "linear",
                    "horizon_months": request.horizon_months
                }
            )
            
            forecasts.append(forecast_result)
        
        return forecasts
    except Exception as exc:
        logger.error(f"Forecast generation failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
```

---

## Step 5: Integrate into Pricing Endpoint

```python
@app.get("/api/pricing/insight")
def get_pricing_insight(product_id: str, user_id: str = None):
    try:
        start_time = time.time()
        
        # Get active pricing model
        active_version = get_active_model_version("pricing")
        use_ml = check_feature_enabled("use_ml_pricing", user_id)
        
        if use_ml and active_version:
            insight = calculate_optimal_price_ml(product_id)
            model_name = "pricing_ml"
            model_version = active_version
        else:
            insight = calculate_optimal_price_rule_based(product_id)
            model_name = "pricing_rule"
            model_version = "1.0.0"
        
        latency_ms = (time.time() - start_time) * 1000
        
        # Record prediction
        record_monitored_prediction(
            model_name=model_name,
            model_version=model_version,
            prediction_type="pricing",
            input_data={"product_id": str(product_id)},
            predicted_value=insight.get("optimal_price"),
            confidence=insight.get("confidence", 0.8),
            latency_ms=latency_ms,
            metadata={
                "method": "ml" if use_ml else "rule_based",
                "user_id": user_id
            }
        )
        
        return insight
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

---

## Step 6: Integrate into Promotions Endpoint

```python
@app.get("/api/promotions/recommendation")
def get_promotion_recommendations(product_id: str, event_id: str, user_id: str = None):
    try:
        start_time = time.time()
        
        # Check feature flag
        use_ml = check_feature_enabled("use_ml_promotions", user_id)
        active_version = get_active_model_version("promotion")
        
        if use_ml and active_version:
            recommendations = build_promotion_recommendations_ml(product_id, event_id)
            model_name = "promotions_ml"
            model_version = active_version
        else:
            recommendations = build_promotion_recommendations_rule(product_id, event_id)
            model_name = "promotions_rule"
            model_version = "1.0.0"
        
        latency_ms = (time.time() - start_time) * 1000
        discount = recommendations.get("recommended_discount", 0)
        
        # Record prediction
        record_monitored_prediction(
            model_name=model_name,
            model_version=model_version,
            prediction_type="promotion",
            input_data={
                "product_id": str(product_id),
                "event_id": str(event_id)
            },
            predicted_value=discount,
            confidence=recommendations.get("confidence", 0.7),
            latency_ms=latency_ms,
            metadata={
                "method": "ml" if use_ml else "rule_based",
                "impact_category": recommendations.get("impact_category")
            }
        )
        
        return recommendations
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

---

## Step 7: Integrate into Assortment Endpoint

```python
@app.get("/api/assortment")
def get_assortment(user_id: str = None):
    try:
        start_time = time.time()
        
        assortment = list(db["assortment_data"].find({}))
        products = list(db["products"].find({}))
        
        # Check if ML recommendations should be used
        use_ml = check_feature_enabled("use_ml_assortment", user_id)
        active_version = get_active_model_version("assortment")
        
        product_map = {str(p["_id"]): p for p in products}
        with_names = []
        
        for item in assortment:
            # ... existing enrichment code ...
            with_names.append(enriched)
        
        if use_ml and active_version and with_names:
            try:
                ml_result = build_assortment_recommendations_ml(with_names)
                recommendation_map = {str(r.get("row_id") or ""): r for r in ml_result.get("recommendations", [])}
                
                for item in with_names:
                    row_id = str(item.get("_id") or "")
                    rec = recommendation_map.get(row_id)
                    if rec:
                        item["recommendation_rule"] = item.get("recommendation")
                        item["recommendation"] = rec.get("recommendation")
                        item["recommendation_confidence"] = rec.get("confidence")
                        item["recommendation_source"] = rec.get("source", "ml_model")
                
                model_name = "assortment_ml"
                model_version = active_version
            except Exception as ml_error:
                logger.warning(f"ML assortment failed: {ml_error}")
                model_name = "assortment_rule"
                model_version = "1.0.0"
        else:
            model_name = "assortment_rule"
            model_version = "1.0.0"
        
        latency_ms = (time.time() - start_time) * 1000
        
        # Record prediction
        record_monitored_prediction(
            model_name=model_name,
            model_version=model_version,
            prediction_type="assortment",
            input_data={
                "product_count": len(with_names),
                "enriched_features": True
            },
            predicted_value=len(with_names),
            confidence=1.0,
            latency_ms=latency_ms,
            metadata={
                "method": "ml" if use_ml else "rule_based",
                "user_id": user_id
            }
        )
        
        return serialize_list(with_names)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to fetch assortment data") from exc
```

---

## Step 8: Setup Complete

Your API now has:
- ✅ Automatic prediction logging
- ✅ Latency tracking
- ✅ Feature flags for gradual rollout
- ✅ Model version tracking
- ✅ Health monitoring
- ✅ A/B testing support
- ✅ Drift detection capability
- ✅ Automatic rollback support

---

## Testing Integration

### 1. Register a New Model Version

```bash
curl -X POST http://localhost:4000/api/models/register-version \
  -H "Content-Type: application/json" \
  -d '{
    "name": "forecast_v2",
    "model_type": "forecast",
    "version": "2.0.0",
    "parameters": {
      "degree": 2,
      "alpha": 1.0
    },
    "is_default": false
  }'
```

### 2. Create a Feature Flag

```bash
curl -X POST http://localhost:4000/api/features/flags/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "use_ml_forecast",
    "description": "Use ML-based forecasting",
    "status": "disabled"
  }'
```

### 3. Start Canary Deployment

```bash
curl -X POST http://localhost:4000/api/features/flags/use_ml_forecast/canary/start \
  -H "Content-Type: application/json" \
  -d '{
    "initial_percentage": 5.0
  }'
```

### 4. Generate a Forecast (Will be Monitored)

```bash
curl -X POST http://localhost:4000/api/forecasts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "product_ids": ["507f1f77bcf86cd799439011"],
    "historical_dates": ["2025-01-01", "2025-02-01"],
    "historical_demand": [1000, 1100],
    "horizon_months": 12,
    "useMl": true
  }'
```

### 5. Check Metrics

```bash
curl http://localhost:4000/api/models/forecast_ml/metrics?model_version=2.0.0&hours=1
```

### 6. Check Overall Health

```bash
curl http://localhost:4000/api/health
```

---

## Best Practices

1. **Always set metadata** - Include relevant context for debugging
2. **Handle failures gracefully** - Monitoring should never break your API
3. **Log latency accurately** - Time from input to prediction output
4. **Use feature flags liberally** - Guard every ML feature with a flag
5. **Monitor continuously** - Set up periodic checks in your monitoring dashboard
6. **Audit rollouts** - Keep logs of all deployments and rollbacks

---

## Troubleshooting

**Predictions not being logged?**
- Check MongoDB connection
- Verify model_name and model_version match registered versions
- Check logs for exceptions

**Canary deployment not working?**
- Feature flag must exist before starting canary
- Check `/api/features/flags/{name}` to see current status
- Traffic percentage must be 0-100

**A/B test not assigning variants?**
- Ensure test_id matches when recording events
- User IDs must be consistent for deterministic assignment
- Test must be in "active" status
