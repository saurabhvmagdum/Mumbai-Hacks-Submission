"""
MLflow tracking utilities for Demand Forecast Agent
"""

import mlflow
from typing import Dict, Any
import logging
from agents.demand_forecast.config import config

logger = logging.getLogger(__name__)


class MLflowTracker:
    """Utility class for MLflow tracking and model management"""
    
    def __init__(self):
        self.tracking_uri = config.MLFLOW_TRACKING_URI
        mlflow.set_tracking_uri(self.tracking_uri)
        logger.info(f"MLflow tracking URI set to: {self.tracking_uri}")
        
    def log_experiment(
        self,
        experiment_name: str,
        run_name: str,
        params: Dict[str, Any],
        metrics: Dict[str, float],
        artifacts: Dict[str, str] = None
    ) -> str:
        """
        Log an experiment run to MLflow
        
        Args:
            experiment_name: Name of the MLflow experiment
            run_name: Name of this specific run
            params: Parameters to log
            metrics: Metrics to log
            artifacts: Dictionary of artifact paths to log
            
        Returns:
            Run ID
        """
        mlflow.set_experiment(experiment_name)
        
        with mlflow.start_run(run_name=run_name) as run:
            # Log parameters
            for key, value in params.items():
                mlflow.log_param(key, value)
                
            # Log metrics
            for key, value in metrics.items():
                mlflow.log_metric(key, value)
                
            # Log artifacts
            if artifacts:
                for key, path in artifacts.items():
                    mlflow.log_artifact(path, key)
                    
            logger.info(f"Logged experiment: {experiment_name}/{run_name}")
            return run.info.run_id
            
    def register_model(
        self,
        model_name: str,
        model: Any,
        signature: Any = None,
        tags: Dict[str, str] = None
    ) -> None:
        """
        Register a model in MLflow Model Registry
        
        Args:
            model_name: Name for the registered model
            model: The model object to register
            signature: Model signature (input/output schema)
            tags: Optional tags for the model
        """
        try:
            # Log model
            mlflow.pyfunc.log_model(
                artifact_path="model",
                python_model=model,
                registered_model_name=model_name,
                signature=signature
            )
            
            # Add tags if provided
            if tags:
                client = mlflow.tracking.MlflowClient()
                for key, value in tags.items():
                    client.set_model_version_tag(model_name, "1", key, value)
                    
            logger.info(f"Model registered: {model_name}")
            
        except Exception as e:
            logger.error(f"Failed to register model: {str(e)}")
            raise
            
    def load_model(self, model_name: str, version: str = "latest") -> Any:
        """
        Load a model from MLflow Model Registry
        
        Args:
            model_name: Name of the registered model
            version: Version to load ("latest", "1", "2", etc.)
            
        Returns:
            Loaded model
        """
        try:
            if version == "latest":
                model_uri = f"models:/{model_name}/Production"
            else:
                model_uri = f"models:/{model_name}/{version}"
                
            model = mlflow.pyfunc.load_model(model_uri)
            logger.info(f"Model loaded: {model_name} (version: {version})")
            return model
            
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise
            
    def transition_model_stage(
        self,
        model_name: str,
        version: str,
        stage: str
    ) -> None:
        """
        Transition a model version to a different stage
        
        Args:
            model_name: Name of the registered model
            version: Version number
            stage: Target stage (Staging, Production, Archived)
        """
        try:
            client = mlflow.tracking.MlflowClient()
            client.transition_model_version_stage(
                name=model_name,
                version=version,
                stage=stage
            )
            logger.info(f"Model {model_name} v{version} transitioned to {stage}")
            
        except Exception as e:
            logger.error(f"Failed to transition model stage: {str(e)}")
            raise


# Global tracker instance
mlflow_tracker = MLflowTracker()
