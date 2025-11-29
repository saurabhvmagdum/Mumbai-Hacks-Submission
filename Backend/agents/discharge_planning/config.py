import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # MLflow Configuration
    MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
    MLFLOW_EXPERIMENT_NAME = "discharge_planning"
    
    # Model Configuration
    MODEL_TYPE = os.getenv("MODEL_TYPE", "xgboost")
    MODEL_VERSION = os.getenv("MODEL_VERSION", "v1.0")
    
    # Service Configuration
    SERVICE_PORT = int(os.getenv("SERVICE_PORT", "8004"))
    SERVICE_HOST = os.getenv("SERVICE_HOST", "0.0.0.0")
    
    # Database Configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME", "swasthya_db")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    
    # Discharge Criteria Thresholds
    DISCHARGE_CRITERIA = {
        'min_days_since_admission': 1,
        'max_temperature': 38.0,  # Celsius
        'min_oxygen_saturation': 92,
        'stable_vitals_hours': 24,
        'pain_score_max': 4,  # Out of 10
        'mobility_min_score': 3  # Out of 5
    }
    
    # Risk factors that delay discharge
    RISK_FACTORS = [
        'uncontrolled_pain',
        'fever',
        'low_oxygen',
        'unstable_vitals',
        'pending_procedures',
        'no_home_support',
        'recent_surgery'
    ]

config = Config()

