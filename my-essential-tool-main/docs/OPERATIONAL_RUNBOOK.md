# Operational Runbook - Model Monitoring System

Complete guide for operating the model monitoring system in production.

---

## Daily Checklist

### Morning (Start of Shift)
```bash
# 1. Check overall health
curl http://localhost:4000/api/health | jq

# Expected output:
{
  "status": "healthy",
  "total_models": 4,
  "healthy_models": 4,
  "unhealthy_models": 0
}

# 2. If unhealthy, investigate
# Check specific models
curl http://localhost:4000/api/health/models | jq '.models[] | select(.status != "healthy")'

# 3. Check recent metrics
curl "http://localhost:4000/api/models/forecast_v1/metrics?model_version=1.0.0&hours=1" | jq

# 4. Review active deployments
python monitoring_dashboard.py
# Then select option 2 to view versions
```

### Hourly Monitoring
```bash
# During business hours, check every hour
*/60 * * * * curl -s http://localhost:4000/api/health | jq '.status' | mail -s "Model Health Status" ops@company.com
```

### End of Shift
```bash
# Document any issues
# Update deployment log if any changes
# Ensure all metrics are normal
# Leave dashboard running for next shift
```

---

## Deployment Scenarios

### Scenario 1: Regular Model Update (No Issues Expected)

**Timeline**: Monday 9 AM - Friday 5 PM

**Steps**:

```bash
# MON 9 AM: Register model
curl -X POST http://localhost:4000/api/models/register-version \
  -H "Content-Type: application/json" \
  -d '{
    "name": "forecast_v3",
    "model_type": "forecast",
    "version": "3.0.0",
    "parameters": {"degree": 2, "alpha": 0.5},
    "is_default": false,
    "description": "Q1 2026 optimized forecast model"
  }'

# MON 2 PM: Start canary at 5%
curl -X POST http://localhost:4000/api/features/flags/use_ml_forecast/canary/start \
  -H "Content-Type: application/json" \
  -d '{"initial_percentage": 5.0}'

# MON 3 PM - TUE 9 AM: Monitor (24 hours)
# Check health every 2 hours
watch -n 7200 'curl -s http://localhost:4000/api/health | jq'

# TUE 9 AM: No issues? Increment to 15%
curl -X POST http://localhost:4000/api/features/flags/use_ml_forecast/canary/increment
# This reaches 10% automatically, or 15% if you increment twice

# TUE 9 AM - WED 9 AM: Monitor (24 hours)

# WED 9 AM: Looking good? Increment to 50%
curl -X POST http://localhost:4000/api/features/flags/use_ml_forecast/canary/increment

# WED 9 AM - THU 9 AM: Monitor (24 hours)

# THU 9 AM: No issues? Go to 100%
curl -X POST http://localhost:4000/api/features/flags/use_ml_forecast/canary/increment

# THU 9 AM - FRI 4 PM: Monitor (final checks)

# FRI 4 PM: Mark as active
curl -X PUT http://localhost:4000/api/features/flags/use_ml_forecast \
  -H "Content-Type: application/json" \
  -d '{"status": "enabled"}'

# Success! 🎉
```

### Scenario 2: Issues Detected During Canary

**When**: 24 hours into canary, error rate jumps to 25%

**Steps**:

```bash
# 1. IMMEDIATE: Understand the issue
curl "http://localhost:4000/api/models/forecast_v3/metrics?model_version=3.0.0&hours=1" | jq

# Output shows:
# "error_rate": 0.25,
# "avg_latency_ms": 2500

# Model is slow and error rate is high!

# 2. Check drift
curl -X POST http://localhost:4000/api/models/detect-drift \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "forecast_v3",
    "model_version": "3.0.0",
    "reference_data": [1000, 1100, 1050, 1150, 1200],
    "current_data": [2000, 3000, 2500, 2800, 3200]
  }'

# Result: drift_score: 0.8 → HIGH DRIFT!
# Data distribution changed significantly

# 3. ROLLBACK IMMEDIATELY
curl -X POST http://localhost:4000/api/models/forecast_v3/rollback

# 4. Verify rollback worked
curl http://localhost:4000/api/health
# Should show status: healthy

# 5. STOP THE DEPLOYMENT
curl -X PUT http://localhost:4000/api/features/flags/use_ml_forecast \
  -H "Content-Type: application/json" \
  -d '{"status": "disabled"}'

# 6. NOTIFY TEAM
# Send alert: "Forecast v3 deployment aborted due to high drift"
# Create incident ticket

# 7. INVESTIGATE
# - What changed in the data?
# - Why didn't training account for this?
# - How to fix the model?

# 8. RETRY NEXT WEEK (after fixes)
```

### Scenario 3: Gradual Performance Degradation

**When**: Metrics slowly getting worse over 3 days

**Steps**:

```bash
# DAY 1: Notice error_rate rising 5% → 8%
curl "http://localhost:4000/api/models/forecast_v2/metrics?model_version=2.0.0&hours=24" | jq '.error_rate'

# DAY 2: Error rate at 10%
curl "http://localhost:4000/api/models/forecast_v2/metrics?model_version=2.0.0&hours=24" | jq '.error_rate'

# DAY 3: Error rate at 15%, approaching threshold
# Decision: Reverse the canary

# 1. Get current traffic
curl http://localhost:4000/api/features/flags/use_ml_forecast | jq '.rollout_percentage'
# Returns: 0.45 (45%)

# 2. Reduce to 25%
curl -X PUT http://localhost:4000/api/features/flags/use_ml_forecast \
  -H "Content-Type: application/json" \
  -d '{"rollout_percentage": 0.25}'

# 3. Monitor for 24 hours
# If error_rate stabilizes at 10%, keep at 25%
# If error_rate continues rising, reduce further

# 4. Options:
# a) Wait and see if it stabilizes
# b) Investigate root cause
# c) Full rollback if continues degrading
```

---

## Emergency Procedures

### Complete System Failure

**Symptoms**: Health shows unhealthy for multiple models

```bash
# 1. Check if backend is running
curl http://localhost:4000/api/health

# 2. Check MongoDB
mongosh
db.model_versions.countDocuments()

# 3. Restart backend
pkill -f "python main.py"
cd python-backend
python main.py &

# 4. Verify recovery
sleep 5
curl http://localhost:4000/api/health

# 5. If still failing:
# - Check logs: tail -f python-backend/logs/main.log
# - Restore from backup
# - Contact DBA
```

### Database Issues

```bash
# Check MongoDB connection
mongosh admin --eval "db.adminCommand('ping')"

# Check indexes
mongosh rgm_tool_prod --eval "db.model_versions.getIndexes()"

# Rebuild indexes if corrupted
mongosh rgm_tool_prod --eval "db.model_versions.reIndex()"

# Check disk space
df -h

# If critical: Scale MongoDB or archive old data
```

### Model Registry Corruption

```bash
# Check for corrupted entries
mongosh rgm_tool_prod --eval "db.model_versions.find({status: null})"

# Clean up malformed documents
mongosh rgm_tool_prod --eval "db.model_versions.deleteMany({status: null})"

# Re-register affected models
# (Steps in "Register Model Version" section below)
```

---

## Common Operations

### Register a New Model Version

```bash
# Collect your model info
MODEL_NAME="forecast_v3"
MODEL_TYPE="forecast"
VERSION="3.0.0"
PARAMETERS='{"degree":2,"alpha":0.5,"features":["trend","seasonality"]}'

# Register
curl -X POST http://localhost:4000/api/models/register-version \
  -H "Content-Type: application/json" \
  -d '{
    "name": "'$MODEL_NAME'",
    "model_type": "'$MODEL_TYPE'",
    "version": "'$VERSION'",
    "parameters": '$PARAMETERS',
    "is_default": false,
    "description": "Latest forecast model with improved seasonality detection"
  }'

# Verify
curl http://localhost:4000/api/models/forecast/versions | jq '.versions[] | select(.name == "'$MODEL_NAME'")'
```

### Start Deployment

```bash
FEATURE_NAME="use_ml_forecast"

# Option A: Canary Deployment (Recommended)
curl -X POST http://localhost:4000/api/features/flags/$FEATURE_NAME/canary/start \
  -H "Content-Type: application/json" \
  -d '{"initial_percentage": 5.0}'

# Option B: Shadow Mode (Test without impact)
curl -X POST http://localhost:4000/api/features/flags/$FEATURE_NAME/shadow \
  -H "Content-Type: application/json" \
  -d '{"model_version": "forecast_v3"}'

# Option C: A/B Test (50/50 split)
curl -X POST http://localhost:4000/api/ab-tests/create \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "forecast_v3_test",
    "name": "Forecast V3 Comparison",
    "feature_name": "'$FEATURE_NAME'",
    "model_type": "forecast",
    "variants": [
      {"name": "control", "traffic_percentage": 50, "model_version": "1.0.0"},
      {"name": "treatment", "traffic_percentage": 50, "model_version": "3.0.0"}
    ]
  }'
```

### Monitor Deployment

```bash
# Watch health in real-time
watch -n 30 'curl -s http://localhost:4000/api/health | jq'

# Or check specific model metrics
watch -n 30 'curl -s http://localhost:4000/api/models/forecast_v3/metrics?model_version=3.0.0&hours=1 | jq'

# Or use dashboard
python monitoring_dashboard.py
# Select option 1
```

### Increment Deployment

```bash
FEATURE_NAME="use_ml_forecast"

# Increase traffic to next level
curl -X POST http://localhost:4000/api/features/flags/$FEATURE_NAME/canary/increment

# Check new percentage
curl http://localhost:4000/api/features/flags/$FEATURE_NAME | jq '.rollout_percentage'
```

### Emergency Rollback

```bash
MODEL_NAME="forecast_v3"

# Immediate rollback to previous version
curl -X POST http://localhost:4000/api/models/$MODEL_NAME/rollback

# OR disable feature completely (faster)
curl -X PUT http://localhost:4000/api/features/flags/use_ml_forecast \
  -H "Content-Type: application/json" \
  -d '{"status": "disabled", "rollout_percentage": 0.0}'

# Verify rollback
curl http://localhost:4000/api/health
```

---

## Metrics Interpretation

### Error Rate
- **< 5%**: Excellent ✅
- **5-10%**: Good, monitor ⚠️
- **10-20%**: Concerning, investigate 🟡
- **> 20%**: Critical, rollback 🔴

### Average Latency
- **< 50ms**: Excellent ✅
- **50-100ms**: Good ⚠️
- **100-500ms**: Slow, investigate 🟡
- **> 500ms**: Critical 🔴

### Drift Score
- **< 0.1**: Normal ✅
- **0.1-0.3**: Minor drift, monitor ⚠️
- **0.3-0.5**: Significant drift 🟡
- **> 0.5**: Critical drift, rollback 🔴

### Prediction Volume
- **Should match expected request rate**
- **Sudden drop**: Possible backend issue
- **Gradual decline**: Possible data degradation

---

## Weekly Review

Every Monday morning:

```bash
# 1. Generate metrics report
curl http://localhost:4000/api/health | jq

# 2. Review deployment history
mongosh rgm_tool_prod --eval "db.rollout_logs.find().sort({timestamp: -1}).limit(10)"

# 3. Check data drift trends
mongosh rgm_tool_prod --eval "db.model_drift.find({timestamp: {\$gte: new Date(new Date().getTime() - 7*24*60*60*1000)}}).sort({timestamp: -1})"

# 4. Review any incidents
# - Check if any models were rolled back
# - Review why (drift, error rate, latency)
# - Document lesson learned

# 5. Plan next deployments
# - Any new models ready to test?
# - Schedule deployments for this week
# - Assign monitoring responsibilities
```

---

## On-Call Responsibilities

### During Business Hours
- Check `/api/health` every hour
- Alert if status != "healthy"
- Investigate and resolve issues
- Update deployment log

### During Off-Hours
- Monitor health check alerts (if configured)
- Be ready for emergency rollback
- Keep phone nearby

### Escalation Path
1. Try to resolve (restart, rollback, etc.)
2. If unresolved in 15 min → Page on-call manager
3. If unresolved in 30 min → Page VP Engineering
4. If production down → Declare SEV-1 incident

---

## Documentation to Keep

- [ ] Model registry (all versions trained)
- [ ] Deployment log (all rollouts)
- [ ] Incident reports (any issues)
- [ ] Performance baselines (initial metrics)
- [ ] Contact information (who to call)

---

## Scripts to Automate

### Hourly Health Check (cron)
```bash
#!/bin/bash
HEALTH=$(curl -s http://localhost:4000/api/health | jq -r '.status')
if [ "$HEALTH" != "healthy" ]; then
  echo "ALERT: Model health is $HEALTH" | mail -s "Model Health Alert" ops@company.com
fi
```

### Daily Metrics Report
```bash
#!/bin/bash
curl -s http://localhost:4000/api/health/models | jq '
  .models[] | 
  {name, version, status, error_rate: .metrics.error_rate, latency: .metrics.avg_latency_ms}
' > /tmp/metrics_$(date +%Y%m%d).json

# Email report
mail -s "Daily Model Metrics" ops@company.com < /tmp/metrics_*.json
```

### Weekly Drift Report
```bash
#!/bin/bash
mongosh rgm_tool_prod --eval "
  db.model_drift.aggregate([
    {$match: {timestamp: {$gte: new Date(ISODate().getTime() - 7*24*60*60*1000)}}},
    {$group: {_id: '$model_name', max_drift: {$max: '$drift_score'}}},
    {$sort: {max_drift: -1}}
  ])
" > /tmp/drift_report.txt

mail -s "Weekly Drift Report" ops@company.com < /tmp/drift_report.txt
```

---

## Quick Reference

| Situation | Command |
|-----------|---------|
| Check health | `curl http://localhost:4000/api/health` |
| Get metrics | `curl http://localhost:4000/api/models/{name}/metrics?model_version=X&hours=1` |
| Start canary | `curl -X POST .../canary/start` |
| Increment canary | `curl -X POST .../canary/increment` |
| Emergency rollback | `curl -X POST .../rollback` |
| Disable feature | `curl -X PUT .../flags/{name} -d '{"status": "disabled"}'` |
| Get versions | `curl http://localhost:4000/api/models/{type}/versions` |
| Launch dashboard | `python monitoring_dashboard.py` |

---

**Remember**: Safety first, speed second. Always canary, always monitor, always have a rollback plan.
