"""
MediCare Pro - Patient Visit Forecasting (academic/demo model)
Model features (3):
  1. day_of_week
  2. previous_day_visits
  3. previous_7_day_avg
Target: completed + booked visits per calendar day (cancelled excluded).
The script uses a chronological holdout split to avoid random time leakage.
"""
import os
import json
from datetime import timedelta
import mysql.connector
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "hospital_db"),
}

MODEL_PATH = "patient_visit_model.joblib"
METRICS_PATH = "patient_visit_metrics.json"

def load_daily_visits():
    conn = mysql.connector.connect(**DB_CONFIG)
    try:
        query = """
            SELECT appointment_date,
                   SUM(CASE WHEN status IN ('Booked','Completed') THEN 1 ELSE 0 END) AS visits
            FROM appointments
            GROUP BY appointment_date
            ORDER BY appointment_date
        """
        df = pd.read_sql(query, conn)
    finally:
        conn.close()

    if df.empty:
        raise ValueError("No appointments found. Import the synthetic appointment data first.")

    df["appointment_date"] = pd.to_datetime(df["appointment_date"])
    # Fill missing dates with 0 visits so every calendar day is represented.
    all_dates = pd.date_range(df["appointment_date"].min(), df["appointment_date"].max(), freq="D")
    df = (df.set_index("appointment_date")
            .reindex(all_dates, fill_value=0)
            .rename_axis("appointment_date")
            .reset_index())
    df["visits"] = df["visits"].astype(int)
    return df

def make_features(df):
    data = df.copy()
    data["day_of_week"] = data["appointment_date"].dt.day_name()
    data["previous_day_visits"] = data["visits"].shift(1)
    data["previous_7_day_avg"] = data["visits"].shift(1).rolling(7).mean()
    data["target_visits"] = data["visits"]
    data = data.dropna().reset_index(drop=True)
    return data

def train_model():
    df = load_daily_visits()
    if len(df) < 45:
        raise ValueError("At least 45 calendar days of appointment history are needed for this demo model.")
    data = make_features(df)
    feature_cols = ["day_of_week", "previous_day_visits", "previous_7_day_avg"]
    X = data[feature_cols]
    y = data["target_visits"]

    split = int(len(data) * 0.8)
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    preprocessor = ColumnTransformer(
        transformers=[
            ("weekday", OneHotEncoder(handle_unknown="ignore"), ["day_of_week"]),
            ("numeric", "passthrough", ["previous_day_visits", "previous_7_day_avg"]),
        ]
    )
    model = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(n_estimators=200, random_state=42, min_samples_leaf=2)),
    ])
    model.fit(X_train, y_train)
    pred = model.predict(X_test).clip(min=0)
    mae = float(mean_absolute_error(y_test, pred))
    rmse = float(mean_squared_error(y_test, pred) ** 0.5)

    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)
    metrics = {
        "model": "RandomForestRegressor",
        "features": feature_cols,
        "target": "daily appointment count (Booked + Completed; Cancelled excluded)",
        "training_rows": int(len(X)),
        "test_rows": int(len(X_test)),
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "note": "Synthetic academic/demo data; metrics do not imply real-hospital accuracy."
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    print(json.dumps(metrics, indent=2))
    return model, df

def forecast_october(model, history):
    # Forecast 2026-10-01 through 2026-10-31 recursively using predicted visits as lags.
    end_history = history.copy()
    predictions = []
    for next_date in pd.date_range("2026-10-01", "2026-10-31", freq="D"):
        prev_day = int(end_history["visits"].iloc[-1])
        previous_7_avg = float(end_history["visits"].tail(7).mean())
        features = pd.DataFrame([{
            "day_of_week": next_date.day_name(),
            "previous_day_visits": prev_day,
            "previous_7_day_avg": previous_7_avg,
        }])
        value = max(0, int(round(float(model.predict(features)[0]))))
        predictions.append({"date": next_date.strftime("%Y-%m-%d"), "predicted_visits": value})
        end_history = pd.concat([
            end_history,
            pd.DataFrame([{"appointment_date": next_date, "visits": value}])
        ], ignore_index=True)
    total = sum(x["predicted_visits"] for x in predictions)
    result = {
        "period": "2026-10",
        "predicted_monthly_visits": total,
        "daily_predictions": predictions,
        "model": "RandomForestRegressor",
        "features": ["day_of_week", "previous_day_visits", "previous_7_day_avg"],
        "disclaimer": "Forecast from synthetic academic/demo data; not a clinical or operational guarantee."
    }
    with open("october_forecast.json", "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"October 2026 predicted visits: {total}")
    print("Saved october_forecast.json")
    return result

if __name__ == "__main__":
    model, history = train_model()
    forecast_october(model, history)
