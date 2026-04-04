# Locus Backend – ML Inference Setup

## Project Structure

```
Backend/Agent/
│
├── main.py
├── config.py
├── schemas.py
├── requirements.txt
│
├── model/
│   ├── Classifier.py
│   ├── Regressor.py
│   ├── fraud_model.pkl
│   └── income_model.pkl
```

---

## Model Files

- fraud_model.pkl → RandomForestClassifier  
- income_model.pkl → RandomForestRegressor  

Stored inside `/model`

---

## Responsibilities

### main.py
- Runs FastAPI server  
- Receives request  
- Maps input → features  
- Calls models  
- Returns response  

---

### model/Classifier.py
- Loads `fraud_model.pkl`  
- Returns fraud probability  

---

### model/Regressor.py
- Loads `income_model.pkl`  
- Returns predicted income  

---

### schemas.py
- Defines request structure  

---

### config.py
- Stores paths (model location)  

---

## Feature Inputs

### Classifier
[gps_delta, accel_variance, activity_status, claim_velocity, anomaly_score]

### Regressor
[day_of_week, hour_of_day, zone_id, historical_avg_income]

---

## Flow

```
Request
  ↓
main.py
  ↓
Feature mapping
  ↓
Classifier + Regressor
  ↓
Business logic
  ↓
Response
```

---

## Rules

- Feature order must match training  
- Same preprocessing as training  
- Models are loaded once  
- No training inside backend  

---

## Run

```
uvicorn main:app --reload
```

---

## Summary

Train in Colab → export .pkl → place in `/model` → load in API → predict  
