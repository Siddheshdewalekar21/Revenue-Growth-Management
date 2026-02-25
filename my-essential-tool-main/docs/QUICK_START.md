# Quick Start Guide - Model Monitoring System

Get up and running with production-grade model monitoring in 15 minutes!

---

## 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd my-essential-tool-main/python-backend
pip install -r requirements.txt
```

### Step 2: Update main.py (5 lines to add)
Add these imports at the top:
```python
from model_monitoring import ModelMonitor
from rollout_control import RolloutControl
from management_api import init_monitoring_apis
```

Add after creating the FastAPI app:
```python
# Initialize monitoring systems
monitor = ModelMonitor(db)
rollout = RolloutControl(db)
init_monitoring_apis(app, monitor, rollout)
```

### Step 3: Start Backend
```bash
python main.py
```

✅ You now have monitoring!

---

## First 5 Actions

### 1️⃣ Register Current Models
```bash
# Register forecast model as v1.0.0
curl -X POST http://localhost:4000/api/models/register-version \
  -H "Content-Type: application/json" \
  -d '{
    "name": "forecast_v1",
    "model_type": "forecast",
    "version": "1.0.0",
    "parameters": {"degree": 2, "alpha": 1.0},
    "is_default": true
  }'
```

Do this for pricing, promotions, and assortment too.

### 2️⃣ Check System Health
```bash
curl http://localhost:4000/api/health
```

Should show all models as healthy.

### 3️⃣ Create Feature Flags
```bash
curl -X POST http://localhost:4000/api/features/flags/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "use_ml_forecast",
    "status": "disabled"
  }'
```

### 4️⃣ Register New Model Version
```bash
curl -X POST http://localhost:4000/api/models/register-version \
  -H "Content-Type: application/json" \
  -d '{
    "name": "forecast_v2",
    "model_type": "forecast",
    "version": "2.0.0",
    "parameters": {"degree": 2, "alpha": 0.5},
    "is_default": false
  }'
```

### 5️⃣ Start Canary Deployment
```bash
curl -X POST http://localhost:4000/api/features/flags/use_ml_forecast/canary/start \
  -H "Content-Type: application/json" \
  -d '{"initial_percentage": 5.0}'
```

✅ You're now deploying v2 to 5% of traffic!

---

## Using the Dashboard

### Launch Interactive Dashboard
```bash
python monitoring_dashboard.py
```

Menu options:
- **1**: View health → See real-time model status
- **6**: Start canary → Deploy new model to small %
- **7**: Increment canary → Gradually roll out to more users
- **8**: Rollback → Go back to previous version instantly
- **9**: Detect drift → Check for data distribution changes

---

## Real-World Workflow

### Monitoring Regular Operations
```bash
# Every hour, check health
watch -n 3600 'curl -s http://localhost:4000/api/health | jq'

# Expected output:
# {
#   "status": "healthy",
#   "total_models": 4,
#   "healthy_models": 4,
#   "unhealthy_models": 0
# }
```

### When You Train a New Model
```bash
# 1. Register the new version
curl -X POST http://localhost:4000/api/models/register-version \
  -H "Content-Type: application/json" \
  -d '{
    "name": "forecast_v3",
    "model_type": "forecast",
    "version": "3.0.0",
    "parameters": {...},
    "is_default": false
  }'

# 2. Create or update feature flag
curl -X PUT http://localhost:4000/api/features/flags/use_ml_forecast \
  -H "Content-Type: application/json" \
  -d '{"status": "rollout", "rollout_percentage": 0.0}'

# 3. Start canary deployment
curl -X POST http://localhost:4000/api/features/flags/use_ml_forecast/canary/start

# 4. Monitor closely
# - Check /api/health every 30 minutes
# - Look for increases in error_rate or avg_latency_ms

# 5. Increment canary when metrics look good
curl -X POST http://localhost:4000/api/features/flags/use_ml_forecast/canary/increment

# 6. Repeat until 100%

# 7. Profit! 🎉
```

### If Something Goes Wrong
```bash
# 1. Quick rollback to previous version
curl -X POST http://localhost:4000/api/models/forecast_v3/rollback

# 2. Check health returned to normal
curl http://localhost:4000/api/health

# 3. Investigate what went wrong
# - Check drift signals
# - Review prediction logs
# - Revert model changes
# - Try again tomorrow
```

---

## Common Patterns

### A/B Testing a New Model
```bash
# Instead of canary, do 50/50 split
curl -X POST http://localhost:4000/api/ab-tests/create \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "forecast_v3_test",
    "name": "Forecast V3 Comparison",
    "feature_name": "forecast",
    "model_type": "forecast",
    "variants": [
      {"name": "control", "traffic_percentage": 50, "model_version": "1.0.0"},
      {"name": "treatment", "traffic_percentage": 50, "model_version": "3.0.0"}
    ]
  }'

# Run for 1 week, then check results
curl http://localhost:4000/api/ab-tests/forecast_v3_test/results

# Conclude with winner
curl -X POST "http://localhost:4000/api/ab-tests/forecast_v3_test/conclude?winner_variant=treatment"
```

### Shadow Deployment (Test without affecting users)
```bash
# Deploy new model in shadow mode
curl -X POST http://localhost:4000/api/features/flags/use_ml_forecast/shadow \
  -H "Content-Type: application/json" \
  -d '{"model_version": "forecast_v3"}'

# Now both old and new models run
# You can compare metrics but users only see old model's output
```

### Emergency Kill Switch
```bash
# Disable a feature instantly
curl -X PUT http://localhost:4000/api/features/flags/use_ml_forecast \
  -H "Content-Type: application/json" \
  -d '{"status": "disabled", "rollout_percentage": 0.0}'

# This returns all traffic to fallback logic
```

---

## Key Endpoints to Remember

| Action | Endpoint | Method |
|--------|----------|--------|
| Check health | `/api/health` | GET |
| Get metrics | `/api/models/{name}/metrics?model_version=X` | GET |
| Detect drift | `/api/models/detect-drift` | POST |
| Start canary | `/api/features/flags/{name}/canary/start` | POST |
| Increment canary | `/api/features/flags/{name}/canary/increment` | POST |
| Rollback | `/api/models/{name}/rollback` | POST |
| Create A/B test | `/api/ab-tests/create` | POST |
| Get A/B results | `/api/ab-tests/{id}/results` | GET |
| Disable feature | `/api/features/flags/{name}` | PUT |

---

## Metrics to Watch

When monitoring deployments, focus on:

```
1. ERROR_RATE
   - Should stay < 10%
   - Increase = model is making bad predictions

2. AVG_LATENCY_MS
   - Should stay < 100ms
   - Increase = model is slower than expected

3. DRIFT_SCORE
   - Should stay < 0.3
   - Increase = data distribution changed

4. PREDICTION_VOLUME
   - Should match expected request rate
   - Decrease = backend issues
```

---

## Troubleshooting

### "Health check says unhealthy"
```bash
# Check individual model metrics
curl http://localhost:4000/api/models/forecast_v1/metrics?model_version=1.0.0&hours=1

# If error_rate > 30%, something's wrong
# If latency > 5000ms, model is slow
# If predictions < expected, check frontend
```

### "Canary not incrementing"
```bash
# Check feature flag status
curl http://localhost:4000/api/features/flags/use_ml_forecast

# Should show status: "rollout" and rollout_strategy: "canary"
# If not, verify flag exists and canary was started
```

### "Rollback not working"
```bash
# Check versions available
curl http://localhost:4000/api/models/forecast/versions

# Need at least 2 versions to rollback
# If only 1, can't go back
```

---

## Next Steps

1. **Read [MODEL_MONITORING.md](MODEL_MONITORING.md)** for complete API reference
2. **Read [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** to add logging to your endpoints
3. **Set up automated checks** - cron job to monitor health hourly
4. **Create dashboards** - visualize metrics over time
5. **Document your models** - save version info, performance baseline

---

## Tips & Tricks

### Get Only Unhealthy Models
```bash
curl http://localhost:4000/api/health | jq '.details.models[] | select(.status != "healthy")'
```

### Compare Two Model Versions
```bash
# Get metrics for v1
curl http://localhost:4000/api/models/forecast_v1/metrics?model_version=1.0.0&hours=24

# Get metrics for v2
curl http://localhost:4000/api/models/forecast_v2/metrics?model_version=2.0.0&hours=24

# Compare error rates and latencies
```

### Detect Gradual Degradation
```bash
# Get metrics for last hour
curl http://localhost:4000/api/models/forecast/metrics?model_version=1.0.0&hours=1

# Compare with last 24 hours
curl http://localhost:4000/api/models/forecast/metrics?model_version=1.0.0&hours=24

# If 1-hour error rate >> 24-hour error rate, degrading
```

---

## 🎉 You're Ready!

You now have:
- ✅ Real-time model monitoring
- ✅ Safe canary deployments
- ✅ A/B testing framework
- ✅ Emergency kill switches
- ✅ One-click rollbacks
- ✅ Automatic health checks

Start with a simple canary deployment and you'll never look back!

---

**For questions, see the full documentation:**
- [MODEL_MONITORING.md](MODEL_MONITORING.md) - Complete reference
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - How to integrate
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Project overview
