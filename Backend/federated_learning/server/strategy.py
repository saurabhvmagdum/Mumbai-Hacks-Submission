import flwr as fl
from flwr.common import FitRes, Parameters, Metrics
from typing import Dict, List, Optional, Tuple


class BestModelStrategy(fl.server.strategy.FedAvg):
    """
    Custom strategy for non-neural models like XGBoost.
    Instead of averaging weights, we pick the best model from clients.
    """

    def __init__(self, metric_name: str = "accuracy", **kwargs):
        super().__init__(**kwargs)
        self.metric_name = metric_name

    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[fl.server.client_proxy.ClientProxy, FitRes]],
        failures: List[BaseException]
    ) -> Tuple[Optional[Parameters], Dict[str, Metrics]]:

        if not results:
            return None, {}

        best_metric = -1
        best_parameters = None

        for client, fit_res in results:
            metric_value = fit_res.metrics.get(self.metric_name, None)
            if metric_value is not None and metric_value > best_metric:
                best_metric = metric_value
                best_parameters = fit_res.parameters

        aggregated_metrics = {"best_" + self.metric_name: best_metric}

        return best_parameters, aggregated_metrics
