import os
from dotenv import load_dotenv  # pyright: ignore[reportMissingImports]

load_dotenv()

class Config:
    # MLflow Configuration
    MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
    MLFLOW_EXPERIMENT_NAME = "demand_forecast"
    
    # Model Configuration
    MODEL_TYPE = os.getenv("MODEL_TYPE", "arima")  # prophet, arima, lstm
    MODEL_VERSION = os.getenv("MODEL_VERSION", "v1.0")
    
    # Data Configuration
    DATA_PATH = os.getenv("DATA_PATH", "./data/historical_admissions.csv")
    MIN_TRAINING_DAYS = 365  # Minimum 1 year of data
    
    # Forecast Configuration
    DEFAULT_HORIZON_DAYS = 7
    CONFIDENCE_INTERVAL = 0.95
    
    # Database Configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME", "swasthya_db")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    
    # Service Configuration
    SERVICE_PORT = int(os.getenv("SERVICE_PORT", "8001"))
    SERVICE_HOST = os.getenv("SERVICE_HOST", "0.0.0.0")

config = Config()

