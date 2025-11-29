"""
Demand Forecasting Models for Patient Volume Prediction
Supports multiple forecasting approaches: Prophet, ARIMA, and baseline methods
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import logging

# Statistical models
# from prophet import Prophet  # pyright: ignore[reportMissingImports]
from statsmodels.tsa.arima.model import ARIMA  # pyright: ignore[reportMissingImports]
from statsmodels.tsa.holtwinters import ExponentialSmoothing  # pyright: ignore[reportMissingImports]

# MLflow for tracking
import mlflow
from agents.demand_forecast.config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BaseForecaster:
    """Base class for all forecasting models"""
    
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model = None
        self.is_trained = False
        
    def train(self, data: pd.DataFrame) -> Dict:
        """Train the model on historical data"""
        raise NotImplementedError
        
    def predict(self, horizon_days: int) -> pd.DataFrame:
        """Generate predictions for specified horizon"""
        raise NotImplementedError
        
    def evaluate(self, test_data: pd.DataFrame) -> Dict:
        """Evaluate model performance"""
        raise NotImplementedError


class ProphetForecaster(BaseForecaster):
    """Facebook Prophet forecaster for time series with seasonality"""
    
    def __init__(self):
        super().__init__("prophet")
        self.model = None
        
    def train(self, data: pd.DataFrame) -> Dict:
        """
        Train Prophet model
        Args:
            data: DataFrame with 'ds' (date) and 'y' (volume) columns
        """
        logger.info("Training Prophet model")
        
        try:
            # Prepare data for Prophet
            df = data.copy()
            if 'date' in df.columns and 'volume' in df.columns:
                df = df.rename(columns={'date': 'ds', 'volume': 'y'})
            
            # Initialize and configure Prophet
            self.model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=True,
                daily_seasonality=False,
                seasonality_mode='multiplicative',
                interval_width=config.CONFIDENCE_INTERVAL
            )
            
            # Add country holidays if needed
            # self.model.add_country_holidays(country_name='IN')
            
            # Fit model
            self.model.fit(df)
            self.is_trained = True
            
            # Calculate training metrics
            forecast = self.model.predict(df)
            mae = np.mean(np.abs(df['y'].values - forecast['yhat'].values))
            mape = np.mean(np.abs((df['y'].values - forecast['yhat'].values) / df['y'].values)) * 100
            rmse = np.sqrt(np.mean((df['y'].values - forecast['yhat'].values) ** 2))
            
            metrics = {
                'mae': float(mae),
                'mape': float(mape),
                'rmse': float(rmse),
                'training_samples': len(df)
            }
            
            logger.info(f"Prophet training completed. MAE: {mae:.2f}, MAPE: {mape:.2f}%")
            return metrics
            
        except Exception as e:
            logger.error(f"Prophet training failed: {str(e)}")
            raise
            
    def predict(self, horizon_days: int) -> pd.DataFrame:
        """Generate forecast for specified horizon"""
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before prediction")
            
        logger.info(f"Generating {horizon_days}-day forecast with Prophet")
        
        try:
            # Create future dataframe
            future = self.model.make_future_dataframe(periods=horizon_days, freq='D')
            
            # Generate forecast
            forecast = self.model.predict(future)
            
            # Extract future predictions only
            forecast_future = forecast.tail(horizon_days)[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
            forecast_future = forecast_future.rename(columns={
                'ds': 'date',
                'yhat': 'predicted_volume',
                'yhat_lower': 'confidence_lower',
                'yhat_upper': 'confidence_upper'
            })
            
            # Ensure non-negative predictions
            forecast_future['predicted_volume'] = forecast_future['predicted_volume'].clip(lower=0)
            forecast_future['confidence_lower'] = forecast_future['confidence_lower'].clip(lower=0)
            forecast_future['confidence_upper'] = forecast_future['confidence_upper'].clip(lower=0)
            
            return forecast_future
            
        except Exception as e:
            logger.error(f"Prophet prediction failed: {str(e)}")
            raise


class ARIMAForecaster(BaseForecaster):
    """ARIMA forecaster for time series"""
    
    def __init__(self, order: Tuple[int, int, int] = (1, 1, 1)):
        super().__init__("arima")
        self.order = order
        self.model = None
        self.historical_data = None
        
    def train(self, data: pd.DataFrame) -> Dict:
        """Train ARIMA model"""
        logger.info(f"Training ARIMA{self.order} model")
        
        try:
            # Prepare data
            df = data.copy()
            if 'volume' in df.columns:
                y = df['volume'].values
            elif 'y' in df.columns:
                y = df['y'].values
            else:
                raise ValueError("Data must have 'volume' or 'y' column")
                
            self.historical_data = y
            
            # Fit ARIMA model
            self.model = ARIMA(y, order=self.order)
            self.model = self.model.fit()
            self.is_trained = True
            
            # Calculate metrics
            fitted_values = self.model.fittedvalues
            mae = np.mean(np.abs(y - fitted_values))
            mape = np.mean(np.abs((y - fitted_values) / y)) * 100
            rmse = np.sqrt(np.mean((y - fitted_values) ** 2))
            
            metrics = {
                'mae': float(mae),
                'mape': float(mape),
                'rmse': float(rmse),
                'aic': float(self.model.aic),
                'bic': float(self.model.bic),
                'training_samples': len(y)
            }
            
            logger.info(f"ARIMA training completed. MAE: {mae:.2f}, AIC: {self.model.aic:.2f}")
            return metrics
            
        except Exception as e:
            logger.error(f"ARIMA training failed: {str(e)}")
            raise
            
    def predict(self, horizon_days: int) -> pd.DataFrame:
        """Generate forecast"""
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before prediction")
            
        logger.info(f"Generating {horizon_days}-day forecast with ARIMA")
        
        try:
            # Generate forecast
            forecast_result = self.model.forecast(steps=horizon_days)
            
            # Get confidence intervals
            forecast_obj = self.model.get_forecast(steps=horizon_days)
            conf_int = forecast_obj.conf_int(alpha=1-config.CONFIDENCE_INTERVAL)
            
            # Create forecast dataframe
            start_date = datetime.now().date() + timedelta(days=1)
            dates = [start_date + timedelta(days=i) for i in range(horizon_days)]
            
            # Convert forecast_result to numpy array if it's not already
            if hasattr(forecast_result, 'values'):
                forecast_values = forecast_result.values
            else:
                forecast_values = np.array(forecast_result)
            
            # Convert conf_int to DataFrame if it's not already
            if isinstance(conf_int, pd.DataFrame):
                conf_lower = conf_int.iloc[:, 0].values
                conf_upper = conf_int.iloc[:, 1].values
            else:
                # If it's a numpy array
                conf_int_array = np.array(conf_int)
                conf_lower = conf_int_array[:, 0]
                conf_upper = conf_int_array[:, 1]
            
            forecast_df = pd.DataFrame({
                'date': dates,
                'predicted_volume': forecast_values,
                'confidence_lower': conf_lower,
                'confidence_upper': conf_upper
            })
            
            # Ensure non-negative predictions
            forecast_df['predicted_volume'] = forecast_df['predicted_volume'].clip(lower=0)
            forecast_df['confidence_lower'] = forecast_df['confidence_lower'].clip(lower=0)
            forecast_df['confidence_upper'] = forecast_df['confidence_upper'].clip(lower=0)
            
            return forecast_df
            
        except Exception as e:
            logger.error(f"ARIMA prediction failed: {str(e)}")
            raise


class MovingAverageForecaster(BaseForecaster):
    """Simple moving average baseline model"""
    
    def __init__(self, window: int = 7):
        super().__init__("moving_average")
        self.window = window
        self.historical_data = None
        
    def train(self, data: pd.DataFrame) -> Dict:
        """Train (store) historical data"""
        logger.info(f"Initializing {self.window}-day moving average forecaster")
        
        df = data.copy()
        if 'volume' in df.columns:
            self.historical_data = df['volume'].values
        elif 'y' in df.columns:
            self.historical_data = df['y'].values
        else:
            raise ValueError("Data must have 'volume' or 'y' column")
            
        self.is_trained = True
        
        # Calculate baseline metrics
        ma_values = pd.Series(self.historical_data).rolling(window=self.window).mean()
        mae = np.nanmean(np.abs(self.historical_data - ma_values))
        
        metrics = {
            'mae': float(mae),
            'window': self.window,
            'training_samples': len(self.historical_data)
        }
        
        logger.info(f"Moving average initialized. Window: {self.window}, MAE: {mae:.2f}")
        return metrics
        
    def predict(self, horizon_days: int) -> pd.DataFrame:
        """Generate forecast using moving average"""
        if not self.is_trained or self.historical_data is None:
            raise ValueError("Model must be trained before prediction")
            
        logger.info(f"Generating {horizon_days}-day forecast with moving average")
        
        # Calculate moving average from recent data
        recent_avg = np.mean(self.historical_data[-self.window:])
        
        # Use recent average as prediction for all future days
        start_date = datetime.now().date() + timedelta(days=1)
        dates = [start_date + timedelta(days=i) for i in range(horizon_days)]
        
        # Estimate confidence interval based on historical variance
        recent_std = np.std(self.historical_data[-self.window:])
        
        forecast_df = pd.DataFrame({
            'date': dates,
            'predicted_volume': [recent_avg] * horizon_days,
            'confidence_lower': [max(0, recent_avg - 1.96 * recent_std)] * horizon_days,
            'confidence_upper': [recent_avg + 1.96 * recent_std] * horizon_days
        })
        
        return forecast_df


class ForecastingPipeline:
    """Main forecasting pipeline with MLflow tracking"""
    
    def __init__(self, model_type: str = "prophet"):
        self.model_type = model_type
        self.forecaster = self._initialize_forecaster()
        # Set MLflow tracking URI, but don't fail if MLflow is unavailable
        try:
            mlflow.set_tracking_uri(config.MLFLOW_TRACKING_URI)
            logger.info(f"MLflow tracking URI set to: {config.MLFLOW_TRACKING_URI}")
        except Exception as e:
            logger.warning(f"Failed to set MLflow tracking URI: {str(e)}. Continuing without MLflow tracking.")
        
    def _initialize_forecaster(self) -> BaseForecaster:
        """Initialize the appropriate forecaster"""
        if self.model_type == "prophet":
            return ProphetForecaster()
        elif self.model_type == "arima":
            return ARIMAForecaster()
        elif self.model_type == "moving_average":
            return MovingAverageForecaster()
        else:
            logger.warning(f"Unknown model type: {self.model_type}, defaulting to Prophet")
            return ProphetForecaster()
            
    def train(self, data: pd.DataFrame) -> Dict:
        """Train model with MLflow tracking"""
        logger.info(f"Starting training pipeline with {self.model_type}")
        
        # Train model first (this is the critical part)
        metrics = self.forecaster.train(data)
        
        # Try to log to MLflow, but don't fail if MLflow is unavailable
        try:
            # Set MLflow experiment
            mlflow.set_experiment(config.MLFLOW_EXPERIMENT_NAME)
            
            with mlflow.start_run(run_name=f"{self.model_type}_training"):
                # Log parameters
                mlflow.log_param("model_type", self.model_type)
                mlflow.log_param("model_version", config.MODEL_VERSION)
                mlflow.log_param("training_date", datetime.now().isoformat())
                mlflow.log_param("data_points", len(data))
                
                # Log metrics
                for key, value in metrics.items():
                    mlflow.log_metric(key, value)
                    
                # Log model (optional - may fail for some model types)
                try:
                    mlflow.pyfunc.log_model(
                        artifact_path="model",
                        python_model=self.forecaster,
                        registered_model_name=f"demand_forecast_{self.model_type}"
                    )
                    logger.info("Model logged to MLflow")
                except Exception as e:
                    logger.warning(f"Failed to log model to MLflow: {str(e)}. Continuing without MLflow model logging.")
                
                logger.info("Training metrics logged to MLflow")
        except Exception as e:
            logger.warning(f"MLflow tracking unavailable: {str(e)}. Training completed successfully without MLflow logging.")
        
        logger.info("Training completed")
        return metrics
            
    def predict(self, horizon_days: int) -> pd.DataFrame:
        """Generate predictions"""
        return self.forecaster.predict(horizon_days)

