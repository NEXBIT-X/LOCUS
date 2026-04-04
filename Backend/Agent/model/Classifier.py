import joblib
import numpy as np
from config import FRAUD_MODEL_PATH

class Classifier:
    def __init__(self):
        self.model = joblib.load(FRAUD_MODEL_PATH)

    def predict(self, features):
        data = np.array(features).reshape(1, -1)
        prob = self.model.predict_proba(data)[0][1]
        return float(prob)


classifier = Classifier()