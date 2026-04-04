import joblib
import numpy as np
from config import INCOME_MODEL_PATH

class Regressor:
    def __init__(self):
        self.model = joblib.load(INCOME_MODEL_PATH)

    def predict(self, features):
        data = np.array(features).reshape(1, -1)
        pred = self.model.predict(data)[0]
        return float(pred)


regressor = Regressor()