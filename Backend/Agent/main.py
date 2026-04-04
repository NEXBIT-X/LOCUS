from fastapi import FastAPI
from schemas import InputData
from model.Classifier import classifier
from model.Regressor import regressor

app = FastAPI()


@app.get("/")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(data: InputData):

    # classifier features
    cls_features = [
        data.gps_delta,
        data.accel_variance,
        data.activity_status,
        data.claim_velocity,
        data.anomaly_score
    ]

    # regressor features
    reg_features = [
        data.day_of_week,
        data.hour_of_day,
        data.zone_id,
        data.historical_avg_income
    ]

    fraud_score = classifier.predict(cls_features)
    income = regressor.predict(reg_features)

    # business logic
    if fraud_score > 0.85:
        status = "AUTO_APPROVE"
    elif fraud_score > 0.50:
        status = "SOFT_FLAG"
    else:
        status = "HARD_FLAG"

    return {
        "fraud_score": fraud_score,
        "status": status,
        "expected_income_lost": income
    }