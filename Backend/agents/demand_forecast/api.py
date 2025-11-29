"""
FastAPI service for Demand Forecast Agent
Serves predictions via REST API
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
import logging
import pandas as pd  # pyright: ignore[reportMissingImports]
import pickle
import os

from model import ForecastingPipeline, ProphetForecaster
from agents.demand_forecast.config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Swasthya Demand Forecast Agent",
    description="ML service for predicting hospital patient volumes",
    version="1.0.0"
)

# Global model instance
global_pipeline: Optional[ForecastingPipeline] = None
MODEL_PATH = "./models/demand_forecast_model.pkl"


# Pydantic models for request/response
class PredictionPoint(BaseModel):
    date: str
    predicted_volume: float
    confidence_lower: float
    confidence_upper: float


class ForecastRequest(BaseModel):
    horizon_days: int = Field(default=7, ge=1, le=90, description="Number of days to forecast")
    date: Optional[str] = Field(default=None, description="Reference date for forecast (ISO format)")


class ForecastResponse(BaseModel):
    predictions: List[PredictionPoint]
    model_version: str
    model_type: str
    generated_at: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_type: Optional[str]
    timestamp: str


class TrainingRequest(BaseModel):
    model_type: str = Field(default="prophet", description="Type of model to train")
    data_source: Optional[str] = Field(default=None, description="Path to training data")


def load_model():
    """Load the trained model from disk or initialize a new one"""
    global global_pipeline
    
    try:
        if os.path.exists(MODEL_PATH):
            logger.info(f"Loading model from {MODEL_PATH}")
            with open(MODEL_PATH, 'rb') as f:
                global_pipeline = pickle.load(f)
            logger.info("Model loaded successfully")
        else:
            logger.warning(f"No trained model found. Initializing new {config.MODEL_TYPE} model.")
            global_pipeline = ForecastingPipeline(model_type=config.MODEL_TYPE)
            
            # Train on synthetic data for demo purposes
            from train import generate_synthetic_data
            synthetic_data = generate_synthetic_data(days=365)
            global_pipeline.train(synthetic_data)
            
            # Save model
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            with open(MODEL_PATH, 'wb') as f:
                pickle.dump(global_pipeline, f)
            logger.info("Initialized and saved new model with synthetic data")
            
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        global_pipeline = None


@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    logger.info("Starting Demand Forecast Agent API")
    logger.info(f"MLflow Tracking URI: {config.MLFLOW_TRACKING_URI}")
    load_model()


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "service": "Swasthya Demand Forecast Agent",
        "version": "1.0.0",
        "status": "running",
        "model_loaded": global_pipeline is not None
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if global_pipeline is not None else "unhealthy",
        model_loaded=global_pipeline is not None,
        model_type=global_pipeline.model_type if global_pipeline else None,
        timestamp=datetime.now().isoformat()
    )


@app.post("/predict", response_model=ForecastResponse, tags=["Prediction"])
async def predict(request: ForecastRequest):
    """
    Generate demand forecast for specified horizon
    
    Args:
        request: ForecastRequest with horizon_days and optional reference date
        
    Returns:
        ForecastResponse with predictions and metadata
    """
    if global_pipeline is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please train or load a model first."
        )
    
    logger.info(f"Prediction request: horizon={request.horizon_days} days")
    
    try:
        # Generate predictions
        predictions_df = global_pipeline.predict(horizon_days=request.horizon_days)
        
        # Convert to response format
        predictions = [
            PredictionPoint(
                date=row['date'].strftime('%Y-%m-%d') if hasattr(row['date'], 'strftime') else str(row['date']),
                predicted_volume=float(row['predicted_volume']),
                confidence_lower=float(row['confidence_lower']),
                confidence_upper=float(row['confidence_upper'])
            )
            for _, row in predictions_df.iterrows()
        ]
        
        response = ForecastResponse(
            predictions=predictions,
            model_version=config.MODEL_VERSION,
            model_type=global_pipeline.model_type,
            generated_at=datetime.now().isoformat()
        )
        
        logger.info(f"Generated {len(predictions)} predictions successfully")
        return response
        
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


@app.post("/train", tags=["Training"])
async def train_model(request: TrainingRequest, background_tasks: BackgroundTasks):
    """
    Trigger model training (in background)
    
    Args:
        request: TrainingRequest with model configuration
        
    Returns:
        Training status message
    """
    logger.info(f"Training request received: model_type={request.model_type}")
    
    def train_background():
        """Background training task"""
        global global_pipeline
        try:
            logger.info("Starting background training")
            
            # Load data
            from train import load_historical_data, prepare_training_data
            df = load_historical_data(request.data_source)
            train_df, _ = prepare_training_data(df)
            
            # Initialize and train new pipeline
            new_pipeline = ForecastingPipeline(model_type=request.model_type)
            new_pipeline.train(train_df)
            
            # Save model
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            with open(MODEL_PATH, 'wb') as f:
                pickle.dump(new_pipeline, f)
                
            # Update global pipeline
            global_pipeline = new_pipeline
            logger.info("Background training completed successfully")
            
        except Exception as e:
            logger.error(f"Background training failed: {str(e)}")
    
    # Add training task to background
    background_tasks.add_task(train_background)
    
    return {
        "status": "training_started",
        "model_type": request.model_type,
        "message": "Model training started in background",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/model/info", tags=["Model"])
async def model_info():
    """Get information about the currently loaded model"""
    if global_pipeline is None:
        raise HTTPException(status_code=404, detail="No model loaded")
    
    return {
        "model_type": global_pipeline.model_type,
        "model_version": config.MODEL_VERSION,
        "is_trained": global_pipeline.forecaster.is_trained,
        "model_name": global_pipeline.forecaster.model_name
    }


@app.post("/reload", tags=["Model"])
async def reload_model():
    """Reload model from disk"""
    logger.info("Model reload requested")
    
    try:
        load_model()
        return {
            "status": "success",
            "message": "Model reloaded successfully",
            "model_loaded": global_pipeline is not None
        }
    except Exception as e:
        logger.error(f"Model reload failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Model reload failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    
    logger.info("="*60)
    logger.info("STARTING DEMAND FORECAST AGENT API")
    logger.info("="*60)
    logger.info(f"Host: {config.SERVICE_HOST}")
    logger.info(f"Port: {config.SERVICE_PORT}")
    logger.info(f"Model Type: {config.MODEL_TYPE}")
    logger.info("="*60)
    
    uvicorn.run(
        app,
        host=config.SERVICE_HOST,
        port=config.SERVICE_PORT,
        log_level="info"
    )

