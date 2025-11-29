import flwr as fl
from strategy import BestModelStrategy


def main() -> None:
    """
    Federated Learning server for Demand Forecast (ARIMA-based).
    Uses BestModelStrategy with 'neg_rmse' so lower RMSE = better model.
    """

    strategy = BestModelStrategy(
        metric_name="neg_rmse",      # we'll send -RMSE from clients
        fraction_fit=1.0,
        fraction_evaluate=0.0,
        min_fit_clients=3,
        min_available_clients=3,
    )

    fl.server.start_server(
        server_address="0.0.0.0:8087",   # demand FL server port
        config=fl.server.ServerConfig(num_rounds=5),
        strategy=strategy,
    )


if __name__ == "__main__":
    main()
