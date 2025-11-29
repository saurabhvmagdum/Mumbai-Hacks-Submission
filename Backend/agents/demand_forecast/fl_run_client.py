# agents/demand_forecast/fl_run_client.py

import os
import sys

# Add project root to Python path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from federated_learning.client.demand_client import main

if __name__ == "__main__":
    main()
