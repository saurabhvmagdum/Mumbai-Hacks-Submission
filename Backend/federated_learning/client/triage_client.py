import argparse
import os
import pandas as pd
import numpy as np
import flwr as fl

from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

from federated_learning.client.serde import serialize_model, deserialize_model
from agents.triage_acuity.model import TriageClassifier


# ------------------------------
# Load client dataset
# ------------------------------
def load_client_data(cid: int):
    path = f"datasets/triage_client_{cid}.csv"
    if not os.path.exists(path):
        raise FileNotFoundError(f"Dataset missing: {path}")

    df = pd.read_csv(path)

    # Last column must be acuity_label (1–5)
    y = df["acuity_label"].astype(int)
    X = df.drop(columns=["acuity_label"])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    return X_train, X_test, y_train, y_test


# ------------------------------
# Flower client
# ------------------------------
class TriageFLClient(fl.client.NumPyClient):

    def __init__(self, cid: int):
        self.cid = cid
        self.classifier = TriageClassifier(model_type="xgboost")
        self.X_train, self.X_test, self.y_train, self.y_test = load_client_data(cid)

    def get_parameters(self, config):
        return serialize_model(self.classifier)

    def fit(self, parameters, config):
        # Deserialize global model
        if parameters:
            self.classifier = deserialize_model(parameters)

        # Train for local round
        metrics = self.classifier.train(self.X_train, self.y_train.to_numpy())

        # Evaluate accuracy
        acc = self.evaluate_accuracy()

        return serialize_model(self.classifier), len(self.X_train), {"accuracy": acc}

    def evaluate(self, parameters, config):
        if parameters:
            self.classifier = deserialize_model(parameters)

        acc = self.evaluate_accuracy()
        loss = 1 - acc

        return float(loss), len(self.X_test), {"accuracy": acc}

    def evaluate_accuracy(self):
        X_scaled = self.classifier.scaler.transform(self.X_test)
        y_true = (self.y_test.to_numpy() - 1)  # Convert to 0–4
        y_pred = self.classifier.model.predict(X_scaled)

        return float(accuracy_score(y_true, y_pred))


# ------------------------------
# Entry point
# ------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cid", type=int, required=True)
    parser.add_argument("--server", type=str, default="127.0.0.1:8086")
    args = parser.parse_args()

    client = TriageFLClient(cid=args.cid)

    fl.client.start_numpy_client(
        server_address=args.server,
        client=client,
    )


if __name__ == "__main__":
    main()
