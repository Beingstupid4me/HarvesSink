"""
HarvesSink – Synthetic data generator + model training script.
Run this file directly to generate training data and export the model.

Usage:  python -m app.ai.train_model
"""

import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)


def generate_synthetic_data(n_samples: int = 5000) -> pd.DataFrame:
    """
    Generates synthetic water quality data with realistic correlations
    between pH/TDS/Turbidity and BOD/COD.
    """
    rng = np.random.default_rng(42)

    ph = rng.normal(7.2, 1.0, n_samples).clip(4, 12)
    tds = rng.normal(300, 150, n_samples).clip(50, 1500)
    turbidity = rng.exponential(5, n_samples).clip(0.1, 100)

    # BOD correlates with turbidity and TDS (organic load)
    bod = (
        0.8 * turbidity
        + 0.02 * tds
        + 1.5 * np.abs(ph - 7)
        + rng.normal(0, 2, n_samples)
    ).clip(0, 200)

    # COD is generally higher than BOD (COD/BOD ratio ~ 1.5–3)
    cod = (bod * rng.uniform(1.5, 3.0, n_samples) + rng.normal(0, 5, n_samples)).clip(0, 500)

    return pd.DataFrame({
        "ph": np.round(ph, 2),
        "tds": np.round(tds, 1),
        "turbidity": np.round(turbidity, 2),
        "bod": np.round(bod, 2),
        "cod": np.round(cod, 2),
    })


def train_and_export():
    """Train a Random Forest regressor and save it."""
    print("📊 Generating synthetic dataset...")
    df = generate_synthetic_data(8000)
    csv_path = os.path.join(MODEL_DIR, "synthetic_water_data.csv")
    df.to_csv(csv_path, index=False)
    print(f"   Saved CSV → {csv_path}")

    X = df[["ph", "tds", "turbidity"]]
    y = df[["bod", "cod"]]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("🧠 Training Random Forest (BOD/COD soft-sensor)...")
    model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    score = model.score(X_test, y_test)
    print(f"   R² score on test set: {score:.4f}")

    model_path = os.path.join(MODEL_DIR, "soft_sensor_rf.joblib")
    joblib.dump(model, model_path)
    print(f"   Model saved → {model_path}")
    return model_path


if __name__ == "__main__":
    train_and_export()
