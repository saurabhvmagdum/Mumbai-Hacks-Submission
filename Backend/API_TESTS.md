# Swasthya API Testing Guide

Complete collection of API endpoints for testing the Swasthya Hospital Management System.

## Prerequisites

- All services running via `docker-compose up -d`
- API Key: `dev-api-key` (default for development)
- Base URLs:
  - Orchestrator: `http://localhost:3000`
  - Demand Forecast: `http://localhost:8001`
  - Staff Scheduling: `http://localhost:8002`
  - ER/OR Scheduling: `http://localhost:8003`
  - Discharge Planning: `http://localhost:8004`
  - Triage & Acuity: `http://localhost:8005`
  - MLflow: `http://localhost:5000`

---

## 🎯 Orchestrator API (Port 3000)

### Test 1: Health Check

```bash
curl -X GET http://localhost:3000/health
```

### Test 2: Check All Agents Health

```bash
curl -X GET http://localhost:3000/api/agents/health \
  -H "x-api-key: dev-api-key"
```

### Test 3: Generate Demand Forecast

```bash
curl -X POST http://localhost:3000/api/forecast/run \
  -H "x-api-key: dev-api-key" \
  -H "Content-Type: application/json" \
  -d "{\"horizon_days\": 7}"
```

### Test 4: Get Latest Forecast

```bash
curl -X GET http://localhost:3000/api/forecast/latest \
  -H "x-api-key: dev-api-key"
```

### Test 5: Trigger Staff Scheduling

```bash
curl -X POST http://localhost:3000/api/scheduling/run \
  -H "x-api-key: dev-api-key" \
  -H "Content-Type: application/json"
```

### Test 6: Process Patient Triage

```bash
curl -X POST http://localhost:3000/api/triage \
  -H "x-api-key: dev-api-key" \
  -H "Content-Type: application/json" \
  -d "{\"patient_id\": \"P12345\", \"symptoms\": \"chest pain, shortness of breath\", \"vital_signs\": {\"heart_rate\": 110, \"blood_pressure_systolic\": 160, \"blood_pressure_diastolic\": 95, \"respiratory_rate\": 24, \"temperature\": 37.2, \"oxygen_saturation\": 94}}"
```

### Test 7: Get Next ER Patient

```bash
curl -X GET http://localhost:3000/api/er/next-patient \
  -H "x-api-key: dev-api-key"
```

### Test 8: Run Discharge Planning

```bash
curl -X POST http://localhost:3000/api/discharge/run \
  -H "x-api-key: dev-api-key" \
  -H "Content-Type: application/json"
```

### Test 9: Schedule OR Cases

```bash
curl -X POST http://localhost:3000/api/or/schedule \
  -H "x-api-key: dev-api-key" \
  -H "Content-Type: application/json" \
  -d "{\"cases\": [{\"patient_id\": \"P001\", \"procedure\": \"Appendectomy\", \"duration_minutes\": 90, \"priority\": 2, \"surgeon_id\": \"S001\"}, {\"patient_id\": \"P002\", \"procedure\": \"Hip Replacement\", \"duration_minutes\": 180, \"priority\": 3, \"surgeon_id\": \"S002\"}]}"
```

### Test 10: Run Daily Workflow

```bash
curl -X POST http://localhost:3000/api/workflow/daily \
  -H "x-api-key: dev-api-key" \
  -H "Content-Type: application/json"
```

### Test 11: Get Scheduler Status

```bash
curl -X GET http://localhost:3000/api/scheduler/status \
  -H "x-api-key: dev-api-key"
```

### Test 12: Get Supervisor State

```bash
curl -X GET http://localhost:3000/api/state \
  -H "x-api-key: dev-api-key"
```

---

## 📊 Demand Forecast Agent (Port 8001)

### Test 13: Health Check

```bash
curl -X GET http://localhost:8001/health
```

### Test 14: Generate Prediction

```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d "{\"horizon_days\": 14}"
```

### Test 15: Train Model

```bash
curl -X POST http://localhost:8001/train \
  -H "Content-Type: application/json" \
  -d "{\"model_type\": \"arima\", \"training_data\": [{\"date\": \"2024-01-01\", \"volume\": 120}, {\"date\": \"2024-01-02\", \"volume\": 135}, {\"date\": \"2024-01-03\", \"volume\": 115}]}"
```

### Test 16: Get Model Info

```bash
curl -X GET http://localhost:8001/model/info
```

### Test 17: API Documentation

```bash
# Open in browser
curl http://localhost:8001/docs
```

---

## 👥 Staff Scheduling Agent (Port 8002)

### Test 18: Health Check

```bash
curl -X GET http://localhost:8002/health
```

### Test 19: Generate Staff Schedule

```bash
curl -X POST http://localhost:8002/schedule \
  -H "Content-Type: application/json" \
  -d "{\"forecast\": [{\"date\": \"2024-12-01\", \"predicted_volume\": 150}, {\"date\": \"2024-12-02\", \"predicted_volume\": 160}], \"staff\": [{\"staff_id\": \"S001\", \"name\": \"Dr. Smith\", \"role\": \"doctor\", \"max_hours_per_week\": 40}, {\"staff_id\": \"S002\", \"name\": \"Nurse Johnson\", \"role\": \"nurse\", \"max_hours_per_week\": 36}], \"constraints\": {\"min_staff_per_shift\": 3, \"max_consecutive_days\": 5}}"
```

### Test 20: Get Default Constraints

```bash
curl -X GET http://localhost:8002/constraints/default
```

### Test 21: Validate Schedule

```bash
curl -X POST http://localhost:8002/schedule/validate \
  -H "Content-Type: application/json" \
  -d "{\"schedule\": [{\"staff_id\": \"S001\", \"date\": \"2024-12-01\", \"shift\": \"morning\"}]}"
```

### Test 22: API Documentation

```bash
# Open in browser
curl http://localhost:8002/docs
```

---

## 🏥 ER/OR Scheduling Agent (Port 8003)

### Test 23: Health Check

```bash
curl -X GET http://localhost:8003/health
```

### Test 24: Add Patient to ER Queue

```bash
curl -X POST http://localhost:8003/er/add-patient \
  -H "Content-Type: application/json" \
  -d "{\"patient_id\": \"P123\", \"acuity_level\": 2, \"arrival_time\": \"2024-11-29T10:30:00Z\", \"chief_complaint\": \"Chest pain\"}"
```

### Test 25: Get Next ER Patient

```bash
curl -X GET http://localhost:8003/er/next-patient
```

### Test 26: Get ER Queue Status

```bash
curl -X GET http://localhost:8003/er/queue
```

### Test 27: Schedule OR Cases

```bash
curl -X POST http://localhost:8003/or/schedule \
  -H "Content-Type: application/json" \
  -d "{\"cases\": [{\"patient_id\": \"P456\", \"procedure\": \"Cardiac Bypass\", \"duration_minutes\": 240, \"priority\": 1, \"surgeon_id\": \"S003\", \"required_equipment\": [\"cardiac_monitor\", \"bypass_machine\"]}], \"rooms\": [{\"room_id\": \"OR1\", \"available_from\": \"2024-12-01T08:00:00Z\", \"available_until\": \"2024-12-01T18:00:00Z\"}]}"
```

### Test 28: Get OR Schedule

```bash
curl -X GET http://localhost:8003/or/schedule?date=2024-12-01
```

### Test 29: API Documentation

```bash
# Open in browser
curl http://localhost:8003/docs
```

---

## 🏠 Discharge Planning Agent (Port 8004)

### Test 30: Health Check

```bash
curl -X GET http://localhost:8004/health
```

### Test 31: Analyze Discharge Candidates

```bash
curl -X POST http://localhost:8004/analyze \
  -H "Content-Type: application/json" \
  -d "{\"patients\": [{\"patient_id\": \"P789\", \"admission_date\": \"2024-11-20\", \"diagnosis\": \"Pneumonia\", \"days_since_admission\": 7, \"clinical_stability_score\": 8, \"vital_signs_stable\": true, \"treatment_complete\": true, \"home_support_available\": true}]}"
```

### Test 32: Analyze Single Patient

```bash
curl -X POST http://localhost:8004/analyze-single \
  -H "Content-Type: application/json" \
  -d "{\"patient_id\": \"P789\", \"admission_date\": \"2024-11-20\", \"diagnosis\": \"Pneumonia\", \"days_since_admission\": 7, \"clinical_stability_score\": 8, \"vital_signs_stable\": true, \"treatment_complete\": true, \"home_support_available\": true, \"age\": 65, \"comorbidities\": [\"diabetes\", \"hypertension\"]}"
```

### Test 33: Get Discharge Criteria

```bash
curl -X GET http://localhost:8004/criteria
```

### Test 34: Get Model Info

```bash
curl -X GET http://localhost:8004/model/info
```

### Test 35: API Documentation

```bash
# Open in browser
curl http://localhost:8004/docs
```

---

## 🚑 Triage & Acuity Agent (Port 8005)

### Test 36: Health Check

```bash
curl -X GET http://localhost:8005/health
```

### Test 37: Triage Patient

```bash
curl -X POST http://localhost:8005/triage \
  -H "Content-Type: application/json" \
  -d "{\"patient_id\": \"P999\", \"symptoms\": \"severe chest pain radiating to left arm, sweating, nausea\", \"vital_signs\": {\"heart_rate\": 120, \"blood_pressure_systolic\": 170, \"blood_pressure_diastolic\": 100, \"respiratory_rate\": 28, \"temperature\": 37.5, \"oxygen_saturation\": 92}, \"age\": 58, \"medical_history\": [\"hypertension\", \"high cholesterol\"]}"
```

### Test 38: Batch Triage

```bash
curl -X POST http://localhost:8005/batch-triage \
  -H "Content-Type: application/json" \
  -d "{\"patients\": [{\"patient_id\": \"P100\", \"symptoms\": \"mild headache\", \"vital_signs\": {\"heart_rate\": 75, \"blood_pressure_systolic\": 120, \"blood_pressure_diastolic\": 80, \"respiratory_rate\": 16, \"temperature\": 36.8, \"oxygen_saturation\": 98}}, {\"patient_id\": \"P101\", \"symptoms\": \"severe abdominal pain\", \"vital_signs\": {\"heart_rate\": 95, \"blood_pressure_systolic\": 130, \"blood_pressure_diastolic\": 85, \"respiratory_rate\": 20, \"temperature\": 38.2, \"oxygen_saturation\": 96}}]}"
```

### Test 39: Log Nurse Override

```bash
curl -X POST http://localhost:8005/override \
  -H "Content-Type: application/json" \
  -d "{\"patient_id\": \"P999\", \"ai_acuity\": 2, \"nurse_acuity\": 1, \"nurse_id\": \"N001\", \"reason\": \"Patient showing signs of acute MI, immediate intervention required\"}"
```

### Test 40: Get Model Info

```bash
curl -X GET http://localhost:8005/model/info
```

### Test 41: Get Acuity Levels

```bash
curl -X GET http://localhost:8005/acuity-levels
```

### Test 42: API Documentation

```bash
# Open in browser
curl http://localhost:8005/docs
```

---

## 📈 MLflow Tracking Server (Port 5000)

### Test 43: MLflow Health Check

```bash
curl -X GET http://localhost:5000/health
```

### Test 44: List Experiments

```bash
curl -X GET http://localhost:5000/api/2.0/mlflow/experiments/list
```

### Test 45: Get Experiment by Name

```bash
curl -X GET "http://localhost:5000/api/2.0/mlflow/experiments/get-by-name?experiment_name=demand_forecast"
```

### Test 46: Search Runs

```bash
curl -X POST http://localhost:5000/api/2.0/mlflow/runs/search \
  -H "Content-Type: application/json" \
  -d "{\"experiment_ids\": [\"0\"]}"
```

### Test 47: MLflow UI

```bash
# Open in browser
echo "Open http://localhost:5000 in your browser"
```

---

## 🔄 Complete Workflow Tests

### Test 48: Complete Patient Journey

```bash
# Step 1: Patient arrives and gets triaged
curl -X POST http://localhost:3000/api/triage \
  -H "x-api-key: dev-api-key" \
  -H "Content-Type: application/json" \
  -d "{\"patient_id\": \"P2024001\", \"symptoms\": \"severe chest pain, difficulty breathing\", \"vital_signs\": {\"heart_rate\": 115, \"blood_pressure_systolic\": 165, \"blood_pressure_diastolic\": 98, \"respiratory_rate\": 26, \"temperature\": 37.3, \"oxygen_saturation\": 93}}"

# Step 2: Get next patient from ER queue
curl -X GET http://localhost:3000/api/er/next-patient \
  -H "x-api-key: dev-api-key"

# Step 3: Schedule OR if needed
curl -X POST http://localhost:3000/api/or/schedule \
  -H "x-api-key: dev-api-key" \
  -H "Content-Type: application/json" \
  -d "{\"cases\": [{\"patient_id\": \"P2024001\", \"procedure\": \"Emergency Cardiac Catheterization\", \"duration_minutes\": 120, \"priority\": 1, \"surgeon_id\": \"S001\"}]}"

# Step 4: After recovery, check discharge readiness
curl -X POST http://localhost:3000/api/discharge/run \
  -H "x-api-key: dev-api-key"
```

### Test 49: Daily Operations Workflow

```bash
# Step 1: Generate demand forecast
curl -X POST http://localhost:3000/api/forecast/run \
  -H "x-api-key: dev-api-key" \
  -H "Content-Type: application/json" \
  -d "{\"horizon_days\": 7}"

# Step 2: Generate staff schedule based on forecast
curl -X POST http://localhost:3000/api/scheduling/run \
  -H "x-api-key: dev-api-key"

# Step 3: Run discharge planning
curl -X POST http://localhost:3000/api/discharge/run \
  -H "x-api-key: dev-api-key"

# Step 4: Check system state
curl -X GET http://localhost:3000/api/state \
  -H "x-api-key: dev-api-key"
```

### Test 50: Complete Daily Workflow (All-in-One)

```bash
curl -X POST http://localhost:3000/api/workflow/daily \
  -H "x-api-key: dev-api-key" \
  -H "Content-Type: application/json"
```

---

## 🐳 Docker & Service Management

### Check Service Status

```bash
# List all running containers
docker-compose ps

# Check specific service logs
docker-compose logs -f orchestrator
docker-compose logs -f demand-forecast
docker-compose logs -f triage-acuity

# Check all logs
docker-compose logs -f

# Restart a service
docker-compose restart orchestrator

# Rebuild and restart a service
docker-compose up -d --build orchestrator
```

### Database Queries

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d swasthya_db

# Sample queries (run inside psql):
# SELECT * FROM forecasts ORDER BY created_at DESC LIMIT 5;
# SELECT * FROM triage_decisions ORDER BY timestamp DESC LIMIT 10;
# SELECT * FROM staff_schedules WHERE date >= CURRENT_DATE;
# SELECT * FROM discharge_recommendations WHERE status = 'pending';
```

---

## 📝 Notes

### For Windows PowerShell Users

If using PowerShell instead of Git Bash, replace the backslash `\` with backtick `` ` `` for line continuation:

```powershell
curl -X POST http://localhost:3000/api/forecast/run `
  -H "x-api-key: dev-api-key" `
  -H "Content-Type: application/json" `
  -d "{\"horizon_days\": 7}"
```

### For Windows CMD Users

For CMD, remove line breaks and put everything on one line:

```cmd
curl -X POST http://localhost:3000/api/forecast/run -H "x-api-key: dev-api-key" -H "Content-Type: application/json" -d "{\"horizon_days\": 7}"
```

### Using Postman or Insomnia

Import this collection by:
1. Converting these curl commands to Postman format
2. Or manually creating requests with the endpoints and payloads shown above

### Authentication

All orchestrator endpoints require the `x-api-key` header:
- Development: `dev-api-key`
- Production: Set via `API_KEY` environment variable

### Response Formats

All endpoints return JSON responses with:
- `success`: boolean indicating success/failure
- `timestamp`: ISO 8601 timestamp
- Data fields specific to each endpoint
- `error`: error message (if applicable)

---

## 🔍 Troubleshooting

### Service Not Responding

```bash
# Check if service is running
docker-compose ps

# Check service logs
docker-compose logs <service-name>

# Restart service
docker-compose restart <service-name>
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### MLflow Connection Issues

```bash
# Check MLflow is running
docker-compose ps mlflow

# Check MLflow logs
docker-compose logs mlflow

# Access MLflow UI
curl http://localhost:5000/health
```

---

**Built with ❤️ for better healthcare delivery**

