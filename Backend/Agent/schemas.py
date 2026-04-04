from pydantic import BaseModel

class InputData(BaseModel):
    gps_delta: float
    accel_variance: float
    activity_status: int
    claim_velocity: float
    anomaly_score: float

    day_of_week: int
    hour_of_day: int
    zone_id: int
    historical_avg_income: float