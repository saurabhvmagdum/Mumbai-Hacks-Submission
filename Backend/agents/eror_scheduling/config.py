import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Service Configuration
    SERVICE_PORT = int(os.getenv("SERVICE_PORT", "8003"))
    SERVICE_HOST = os.getenv("SERVICE_HOST", "0.0.0.0")
    
    # MLflow Configuration
    MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
    MLFLOW_EXPERIMENT_NAME = "eror_scheduling"
    
    # Model Configuration
    MODEL_VERSION = os.getenv("MODEL_VERSION", "v1.0")
    
    # Solver Configuration
    SOLVER_TIMEOUT_SECONDS = int(os.getenv("SOLVER_TIMEOUT_SECONDS", "60"))
    
    # Database Configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME", "swasthya_db")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    
    # OR Scheduling Configuration
    OR_OPENING_TIME = "08:00"
    OR_CLOSING_TIME = "18:00"
    DEFAULT_TURNOVER_TIME_MINUTES = 30
    
    # ER Triage Levels (ESI)
    ER_TRIAGE_LEVELS = {
        1: "Resuscitation",
        2: "Emergent",
        3: "Urgent",
        4: "Less Urgent",
        5: "Non-Urgent"
    }

config = Config()

