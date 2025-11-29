import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # MLflow Configuration
    MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
    MLFLOW_EXPERIMENT_NAME = "triage_acuity"
    
    # Model Configuration
    MODEL_TYPE = os.getenv("MODEL_TYPE", "xgboost")
    MODEL_VERSION = os.getenv("MODEL_VERSION", "v1.0")
    USE_NLP = os.getenv("USE_NLP", "true").lower() == "true"
    
    # Service Configuration
    SERVICE_PORT = int(os.getenv("SERVICE_PORT", "8005"))
    SERVICE_HOST = os.getenv("SERVICE_HOST", "0.0.0.0")
    
    # Database Configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME", "swasthya_db")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    
    # Triage Configuration
    ACUITY_LEVELS = {
        1: "Resuscitation",
        2: "Emergent",
        3: "Urgent",
        4: "Less Urgent",
        5: "Non-Urgent"
    }
    
    # Red flag symptoms that require immediate attention
    RED_FLAG_KEYWORDS = [
        "chest pain", "difficulty breathing", "unresponsive", 
        "severe bleeding", "stroke", "heart attack",
        "unconscious", "seizure", "severe head injury"
    ]
    
    # Vital sign thresholds for red flags
    VITAL_THRESHOLDS = {
        'heart_rate': {'critical_low': 40, 'critical_high': 140},
        'blood_pressure_systolic': {'critical_low': 80, 'critical_high': 180},
        'temperature': {'critical_low': 35.0, 'critical_high': 40.0},
        'respiratory_rate': {'critical_low': 8, 'critical_high': 30},
        'oxygen_saturation': {'critical_low': 90}
    }

config = Config()
