import os
import sys

# Add project root to Python path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.append(PROJECT_ROOT)

# Now import the FL client main function
from federated_learning.client.triage_client import main

if __name__ == "__main__":
    main()
