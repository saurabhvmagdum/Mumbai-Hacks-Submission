import argparse
import os
from typing import Tuple

import flwr as fl
import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error

from federated_learning.client.serde import serialize_model, deserialize_model
from agents.demand_forecast.model import ARIMAForecaster  # uses your existing ARIMAForecaster


# ------------------------------
# Data loading for each client
# ------------------------------

def load_demand_data(client_id: int) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load local demand time series for this client.

    Expected CSV path:
        datasets/demand_client_{client_id}.csv

    Columns:
        date   - date string (YYYY-MM-DD)
        volume - numeric patient volume
    """
    data_path = os.path.join("datasets", f"demand_client_{client_id}.csv")
    if not os.path.exists(data_path):
        raise FileNotFoundError(
            f"Expected demand data at {data_path}. "
            f"Create per-client CSVs or change this path in load_demand_data()."
        )

    df = pd.read_csv(data_path, parse_dates=["date"])
    df = df.sort_values("date").reset_index(drop=True)

    # Simple train/test split: last 14 days as test
    test_horizon = min(14, max(1, len(df) // 5))  # at least 1, at most 20% of data
    if test_horizon == 0 or len(df) <= test_horizon:
        raise ValueError("Not enough data points for train/test split")

    train_df = df.iloc[:-test_horizon].reset_index(drop=True)
    test_df = df.iloc[-test_horizon:].reset_index(drop=True)

    return train_df, test_df


# ------------------------------
# Flower demand FL client
# ------------------------------

class DemandFLClient(fl.client.NumPyClient):
    def __init__(self, client_id: int):
        self.client_id = client_id
        self.forecaster = ARIMAForecaster(order=(1, 1, 1))
        self.train_df, self.test_df = load_demand_data(client_id)

    # ---- Flower interface ----

    def get_parameters(self, config):
        # Return current forecaster object (may be untrained on first round)
        return serialize_model(self.forecaster)

    def fit(self, parameters, config):
        # Load global best ARIMA model (if available)
        if parameters:
            self.forecaster = deserialize_model(parameters)

        # Train ARIMA on this client's local data
        _metrics = self.forecaster.train(self.train_df)

        # Evaluate local RMSE
        rmse = self._evaluate_rmse()

        # For BestModelStrategy: higher metric is better, so send negative RMSE
        metrics_out = {
            "rmse": float(rmse),
            "neg_rmse": float(-rmse),
            "client_id": float(self.client_id),
        }

        return serialize_model(self.forecaster), len(self.train_df), metrics_out

    def evaluate(self, parameters, config):
        # Evaluate global model on local test set
        if parameters:
            self.forecaster = deserialize_model(parameters)

        rmse = self._evaluate_rmse()
        loss = rmse  # RMSE as loss

        return float(loss), len(self.test_df), {"rmse": float(rmse)}

    # ---- Helper ----

    def _evaluate_rmse(self) -> float:
        if not self.forecaster.is_trained or self.forecaster.model is None:
            # Large penalty if somehow untrained
            return float("inf")

        horizon = len(self.test_df)
        if horizon == 0:
            return float("inf")

        forecast_df = self.forecaster.predict(horizon_days=horizon)

        # Align predictions to test volume
        y_true = self.test_df["volume"].to_numpy()
        y_pred = forecast_df["predicted_volume"].to_numpy()

        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        return float(rmse)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cid", type=int, required=True, help="Client ID (1, 2, 3, ...)")
    parser.add_argument("--server-address", type=str, default="127.0.0.1:8087")
    args = parser.parse_args()

    client = DemandFLClient(client_id=args.cid)

    fl.client.start_numpy_client(
        server_address=args.server_address,
        client=client,
    )


if __name__ == "__main__":
    main()
