#!/bin/bash

# Swasthya API Testing Script
# Usage: ./test-api.sh [test_number]
# Example: ./test-api.sh 1

# Configuration
API_KEY="dev-api-key"
ORCHESTRATOR_URL="http://localhost:3000"
DEMAND_URL="http://localhost:8001"
STAFF_URL="http://localhost:8002"
EROR_URL="http://localhost:8003"
DISCHARGE_URL="http://localhost:8004"
TRIAGE_URL="http://localhost:8005"
MLFLOW_URL="http://localhost:5000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_test() {
    echo -e "${BLUE}=== Test $1: $2 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ Success${NC}\n"
}

print_error() {
    echo -e "${RED}✗ Failed${NC}\n"
}

# Test functions
test_1() {
    print_test 1 "Orchestrator Health Check"
    curl -s -X GET $ORCHESTRATOR_URL/health | jq '.'
    print_success
}

test_2() {
    print_test 2 "Check All Agents Health"
    curl -s -X GET $ORCHESTRATOR_URL/api/agents/health \
        -H "x-api-key: $API_KEY" | jq '.'
    print_success
}

test_3() {
    print_test 3 "Generate Demand Forecast (7 days)"
    curl -s -X POST $ORCHESTRATOR_URL/api/forecast/run \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"horizon_days": 7}' | jq '.'
    print_success
}

test_4() {
    print_test 4 "Get Latest Forecast"
    curl -s -X GET $ORCHESTRATOR_URL/api/forecast/latest \
        -H "x-api-key: $API_KEY" | jq '.'
    print_success
}

test_5() {
    print_test 5 "Trigger Staff Scheduling"
    curl -s -X POST $ORCHESTRATOR_URL/api/scheduling/run \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" | jq '.'
    print_success
}

test_6() {
    print_test 6 "Process Patient Triage"
    curl -s -X POST $ORCHESTRATOR_URL/api/triage \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "patient_id": "P12345",
            "symptoms": "chest pain, shortness of breath",
            "vital_signs": {
                "heart_rate": 110,
                "blood_pressure_systolic": 160,
                "blood_pressure_diastolic": 95,
                "respiratory_rate": 24,
                "temperature": 37.2,
                "oxygen_saturation": 94
            }
        }' | jq '.'
    print_success
}

test_7() {
    print_test 7 "Get Next ER Patient"
    curl -s -X GET $ORCHESTRATOR_URL/api/er/next-patient \
        -H "x-api-key: $API_KEY" | jq '.'
    print_success
}

test_8() {
    print_test 8 "Run Discharge Planning"
    curl -s -X POST $ORCHESTRATOR_URL/api/discharge/run \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" | jq '.'
    print_success
}

test_9() {
    print_test 9 "Schedule OR Cases"
    curl -s -X POST $ORCHESTRATOR_URL/api/or/schedule \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "cases": [
                {
                    "patient_id": "P001",
                    "procedure": "Appendectomy",
                    "duration_minutes": 90,
                    "priority": 2,
                    "surgeon_id": "S001"
                },
                {
                    "patient_id": "P002",
                    "procedure": "Hip Replacement",
                    "duration_minutes": 180,
                    "priority": 3,
                    "surgeon_id": "S002"
                }
            ]
        }' | jq '.'
    print_success
}

test_10() {
    print_test 10 "Run Daily Workflow"
    curl -s -X POST $ORCHESTRATOR_URL/api/workflow/daily \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" | jq '.'
    print_success
}

test_11() {
    print_test 11 "Get Scheduler Status"
    curl -s -X GET $ORCHESTRATOR_URL/api/scheduler/status \
        -H "x-api-key: $API_KEY" | jq '.'
    print_success
}

test_12() {
    print_test 12 "Get Supervisor State"
    curl -s -X GET $ORCHESTRATOR_URL/api/state \
        -H "x-api-key: $API_KEY" | jq '.'
    print_success
}

test_13() {
    print_test 13 "Demand Forecast Health Check"
    curl -s -X GET $DEMAND_URL/health | jq '.'
    print_success
}

test_14() {
    print_test 14 "Generate Prediction (Direct)"
    curl -s -X POST $DEMAND_URL/predict \
        -H "Content-Type: application/json" \
        -d '{"horizon_days": 14}' | jq '.'
    print_success
}

test_15() {
    print_test 15 "Staff Scheduling Health Check"
    curl -s -X GET $STAFF_URL/health | jq '.'
    print_success
}

test_16() {
    print_test 16 "ER/OR Scheduling Health Check"
    curl -s -X GET $EROR_URL/health | jq '.'
    print_success
}

test_17() {
    print_test 17 "Add Patient to ER Queue"
    curl -s -X POST $EROR_URL/er/add-patient \
        -H "Content-Type: application/json" \
        -d '{
            "patient_id": "P123",
            "acuity_level": 2,
            "arrival_time": "2024-11-29T10:30:00Z",
            "chief_complaint": "Chest pain"
        }' | jq '.'
    print_success
}

test_18() {
    print_test 18 "Discharge Planning Health Check"
    curl -s -X GET $DISCHARGE_URL/health | jq '.'
    print_success
}

test_19() {
    print_test 19 "Triage & Acuity Health Check"
    curl -s -X GET $TRIAGE_URL/health | jq '.'
    print_success
}

test_20() {
    print_test 20 "Triage Patient (Direct)"
    curl -s -X POST $TRIAGE_URL/triage \
        -H "Content-Type: application/json" \
        -d '{
            "patient_id": "P999",
            "symptoms": "severe chest pain radiating to left arm, sweating, nausea",
            "vital_signs": {
                "heart_rate": 120,
                "blood_pressure_systolic": 170,
                "blood_pressure_diastolic": 100,
                "respiratory_rate": 28,
                "temperature": 37.5,
                "oxygen_saturation": 92
            },
            "age": 58,
            "medical_history": ["hypertension", "high cholesterol"]
        }' | jq '.'
    print_success
}

test_21() {
    print_test 21 "MLflow Health Check"
    curl -s -X GET $MLFLOW_URL/health | jq '.'
    print_success
}

test_22() {
    print_test 22 "Complete Patient Journey"
    echo "Step 1: Triage patient..."
    curl -s -X POST $ORCHESTRATOR_URL/api/triage \
        -H "x-api-key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "patient_id": "P2024001",
            "symptoms": "severe chest pain, difficulty breathing",
            "vital_signs": {
                "heart_rate": 115,
                "blood_pressure_systolic": 165,
                "blood_pressure_diastolic": 98,
                "respiratory_rate": 26,
                "temperature": 37.3,
                "oxygen_saturation": 93
            }
        }' | jq '.'
    
    echo -e "\nStep 2: Get next ER patient..."
    curl -s -X GET $ORCHESTRATOR_URL/api/er/next-patient \
        -H "x-api-key: $API_KEY" | jq '.'
    
    print_success
}

test_all_health() {
    print_test "ALL" "Health Check All Services"
    echo -e "${YELLOW}Orchestrator:${NC}"
    curl -s -X GET $ORCHESTRATOR_URL/health | jq '.status'
    
    echo -e "${YELLOW}Demand Forecast:${NC}"
    curl -s -X GET $DEMAND_URL/health | jq '.status'
    
    echo -e "${YELLOW}Staff Scheduling:${NC}"
    curl -s -X GET $STAFF_URL/health | jq '.status'
    
    echo -e "${YELLOW}ER/OR Scheduling:${NC}"
    curl -s -X GET $EROR_URL/health | jq '.status'
    
    echo -e "${YELLOW}Discharge Planning:${NC}"
    curl -s -X GET $DISCHARGE_URL/health | jq '.status'
    
    echo -e "${YELLOW}Triage & Acuity:${NC}"
    curl -s -X GET $TRIAGE_URL/health | jq '.status'
    
    echo -e "${YELLOW}MLflow:${NC}"
    curl -s -X GET $MLFLOW_URL/health 2>/dev/null || echo "Not available"
    
    print_success
}

# Main script
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Swasthya API Testing Script            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}\n"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. Output will not be formatted.${NC}"
    echo -e "${YELLOW}Install jq for better output: https://stedolan.github.io/jq/${NC}\n"
fi

# Run specific test or show menu
if [ -z "$1" ]; then
    echo "Available tests:"
    echo "  1  - Orchestrator Health Check"
    echo "  2  - Check All Agents Health"
    echo "  3  - Generate Demand Forecast"
    echo "  4  - Get Latest Forecast"
    echo "  5  - Trigger Staff Scheduling"
    echo "  6  - Process Patient Triage"
    echo "  7  - Get Next ER Patient"
    echo "  8  - Run Discharge Planning"
    echo "  9  - Schedule OR Cases"
    echo "  10 - Run Daily Workflow"
    echo "  11 - Get Scheduler Status"
    echo "  12 - Get Supervisor State"
    echo "  13 - Demand Forecast Health Check"
    echo "  14 - Generate Prediction (Direct)"
    echo "  15 - Staff Scheduling Health Check"
    echo "  16 - ER/OR Scheduling Health Check"
    echo "  17 - Add Patient to ER Queue"
    echo "  18 - Discharge Planning Health Check"
    echo "  19 - Triage & Acuity Health Check"
    echo "  20 - Triage Patient (Direct)"
    echo "  21 - MLflow Health Check"
    echo "  22 - Complete Patient Journey"
    echo "  health - Health Check All Services"
    echo ""
    echo "Usage: ./test-api.sh [test_number]"
    echo "Example: ./test-api.sh 3"
    echo "         ./test-api.sh health"
else
    case $1 in
        1) test_1 ;;
        2) test_2 ;;
        3) test_3 ;;
        4) test_4 ;;
        5) test_5 ;;
        6) test_6 ;;
        7) test_7 ;;
        8) test_8 ;;
        9) test_9 ;;
        10) test_10 ;;
        11) test_11 ;;
        12) test_12 ;;
        13) test_13 ;;
        14) test_14 ;;
        15) test_15 ;;
        16) test_16 ;;
        17) test_17 ;;
        18) test_18 ;;
        19) test_19 ;;
        20) test_20 ;;
        21) test_21 ;;
        22) test_22 ;;
        health) test_all_health ;;
        *) echo -e "${RED}Invalid test number${NC}" ;;
    esac
fi

