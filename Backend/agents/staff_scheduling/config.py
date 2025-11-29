import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Service Configuration
    SERVICE_PORT = int(os.getenv("SERVICE_PORT", "8002"))
    SERVICE_HOST = os.getenv("SERVICE_HOST", "0.0.0.0")
    
    # Solver Configuration
    SOLVER_TIMEOUT_SECONDS = int(os.getenv("SOLVER_TIMEOUT_SECONDS", "60"))
    
    # Database Configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME", "swasthya_db")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")

config = Config()
