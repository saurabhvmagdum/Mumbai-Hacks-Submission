import pickle
import numpy as np
from typing import Any, List


def serialize_model(model_obj: Any) -> List[np.ndarray]:
    data = pickle.dumps(model_obj)
    array = np.frombuffer(data, dtype=np.uint8)
    return [array]


def deserialize_model(parameters: List[np.ndarray]) -> Any:
    if not parameters:
        raise ValueError("No parameters found")
    array = parameters[0].astype(np.uint8)
    data = array.tobytes()
    model = pickle.loads(data)
    return model
