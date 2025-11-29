"""
Training script for demand forecasting model
Loads historical data, trains model, and registers it with MLflow
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import argparse
import logging
import mlflow

from model import ForecastingPipeline
from agents.demand_forecast.config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def generate_synthetic_data(days: int = 730) -> pd.DataFrame:
    """
    Generate synthetic patient admission data for development/testing
    Includes trend, weekly seasonality, and random noise
    """
    logger.info(f"Generating {days} days of synthetic admission data")
    
    # Generate dates
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days-1)
    dates = pd.date_range(start=start_date, end=end_date, freq='D')
    
    # Base volume with trend
    base_volume = 80
    trend = np.linspace(0, 20, days)  # Gradual increase over time
    
    # Weekly seasonality (weekends have lower volume)
    weekly_pattern = np.array([1.0, 1.0, 1.0, 1.0, 1.0, 0.7, 0.6])  # Mon-Sun
    seasonality = np.tile(weekly_pattern, days // 7 + 1)[:days]
    
    # Yearly seasonality (flu season in winter months)
    day_of_year = np.array([d.timetuple().tm_yday for d in dates])
    yearly_seasonality = 10 * np.sin(2 * np.pi * (day_of_year - 15) / 365)
    
    # Random noise
    noise = np.random.normal(0, 8, days)
    
    # Combine all components
    volume = base_volume + trend + (base_volume * (seasonality - 1)) + yearly_seasonality + noise
    volume = np.maximum(volume, 0)  # Ensure non-negative
    volume = np.round(volume).astype(int)
    
    # Create dataframe
    df = pd.DataFrame({
        'date': dates,
        'volume': volume
    })
    
    logger.info(f"Generated data: mean={volume.mean():.1f}, std={volume.std():.1f}")
    return df


def load_historical_data(filepath: str = None) -> pd.DataFrame:
    """Load historical admission data from CSV or generate synthetic data"""
    
    if filepath and filepath != "./data/historical_admissions.csv":
        try:
            logger.info(f"Loading data from {filepath}")
            df = pd.read_csv(filepath)
            df['date'] = pd.to_datetime(df['date'])
            logger.info(f"Loaded {len(df)} records from {filepath}")
            return df
        except FileNotFoundError:
            logger.warning(f"File not found: {filepath}. Generating synthetic data.")
    
    # Generate synthetic data for development
    logger.info("Using synthetic data for training")
    return generate_synthetic_data(days=730)


def prepare_training_data(df: pd.DataFrame) -> tuple:
    """Prepare and split data for training and validation"""
    
    # Sort by date
    df = df.sort_values('date').reset_index(drop=True)
    
    # Validation split: use last 30 days for validation
    train_size = len(df) - 30
    train_df = df[:train_size].copy()
    val_df = df[train_size:].copy()
    
    logger.info(f"Training data: {len(train_df)} days")
    logger.info(f"Validation data: {len(val_df)} days")
    
    return train_df, val_df


def evaluate_model(pipeline: ForecastingPipeline, val_df: pd.DataFrame) -> dict:
    """Evaluate model on validation data"""
    
    logger.info("Evaluating model on validation data")
    
    try:
        # Generate predictions for validation period
        horizon = len(val_df)
        predictions = pipeline.predict(horizon_days=horizon)
        
        # Calculate metrics
        actual = val_df['volume'].values
        predicted = predictions['predicted_volume'].values
        
        mae = np.mean(np.abs(actual - predicted))
        mape = np.mean(np.abs((actual - predicted) / actual)) * 100
        rmse = np.sqrt(np.mean((actual - predicted) ** 2))
        
        metrics = {
            'val_mae': float(mae),
            'val_mape': float(mape),
            'val_rmse': float(rmse)
        }
        
        logger.info(f"Validation metrics - MAE: {mae:.2f}, MAPE: {mape:.2f}%, RMSE: {rmse:.2f}")
        return metrics
        
    except Exception as e:
        logger.error(f"Evaluation failed: {str(e)}")
        return {}


def main():
    parser = argparse.ArgumentParser(description="Train demand forecasting model")
    parser.add_argument("--model-type", type=str, default="prophet",
                       choices=["prophet", "arima", "moving_average"],
                       help="Type of forecasting model to train")
    parser.add_argument("--data-path", type=str, default=None,
                       help="Path to historical data CSV file")
    parser.add_argument("--mlflow-uri", type=str, default=None,
                       help="MLflow tracking URI")
    
    args = parser.parse_args()
    
    # Override config if specified
    if args.mlflow_uri:
        config.MLFLOW_TRACKING_URI = args.mlflow_uri
        
    logger.info("="*60)
    logger.info("DEMAND FORECAST MODEL TRAINING")
    logger.info("="*60)
    logger.info(f"Model type: {args.model_type}")
    logger.info(f"MLflow URI: {config.MLFLOW_TRACKING_URI}")
    
    # Load data
    data_path = args.data_path or config.DATA_PATH
    df = load_historical_data(data_path)
    
    # Prepare training and validation data
    train_df, val_df = prepare_training_data(df)
    
    # Initialize pipeline
    pipeline = ForecastingPipeline(model_type=args.model_type)
    
    # Train model
    logger.info("Starting model training...")
    training_metrics = pipeline.train(train_df)
    
    # Evaluate on validation set
    val_metrics = evaluate_model(pipeline, val_df)
    
    # Log validation metrics to MLflow
    if val_metrics:
        with mlflow.start_run(run_name=f"{args.model_type}_validation") as run:
            for key, value in val_metrics.items():
                mlflow.log_metric(key, value)
    
    # Print summary
    logger.info("="*60)
    logger.info("TRAINING COMPLETED")
    logger.info("="*60)
    logger.info("Training metrics:")
    for key, value in training_metrics.items():
        logger.info(f"  {key}: {value}")
    
    if val_metrics:
        logger.info("Validation metrics:")
        for key, value in val_metrics.items():
            logger.info(f"  {key}: {value}")
    
    logger.info("Model registered in MLflow")
    logger.info("="*60)


if __name__ == "__main__":
    main()

