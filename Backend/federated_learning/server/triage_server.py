import flwr as fl
from strategy import BestModelStrategy


def main():

    strategy = BestModelStrategy(
        metric_name="accuracy",
        fraction_fit=1.0,
        min_fit_clients=3,
        min_available_clients=3,
        fraction_evaluate=0.0,
    )

    fl.server.start_server(
        server_address="0.0.0.0:8086",
        config=fl.server.ServerConfig(num_rounds=5),
        strategy=strategy
    )


if __name__ == "__main__":
    main()
