"""
HarvesSink – AI Inference Engine.
Model 1: Soft-sensor regressor (BOD/COD prediction) using trained XGBoost V2.
Model 2: Sensor health anomaly detector (Z-score based).
"""

import os
import numpy as np
import pandas as pd
from typing import Optional

import joblib

from app.schemas import SensorReading, InferenceResult


# V2 XGBoost model trained on Bangalore STP data (9 locations)
MODEL_PATH = os.path.join(os.path.dirname(__file__), "saved_models", "harvessink_bod_v2.joblib")

# Exact feature order the V2 model was trained on
# (from notebook: X = train_df.drop(columns=['COD','BOD','Ammonia']) after one-hot encoding STP_Location)
V2_FEATURE_COLS = [
    "Temperature (Avg)", "Max Temperature", "Min Temperature",
    "pH", "TSS",
    "STP_Location_Cubbon Park", "STP_Location_Hebbal", "STP_Location_Jakkur",
    "STP_Location_K.R. Puram", "STP_Location_Lalbagh", "STP_Location_Madiwala",
    "STP_Location_Nagasandra", "STP_Location_Rajacanal", "STP_Location_Yelahanka",
]

# Default climate values (annual Bangalore averages) for features we don't sense
DEFAULT_TEMP_AVG = 27.0
DEFAULT_TEMP_MAX = 32.0
DEFAULT_TEMP_MIN = 22.0


class InferenceEngine:
    """
    Runs AI inference on each sensor reading.
    BOD/COD soft-sensor only — anomaly detection moved to QuadGuardEngine.
    """

    def __init__(self):
        self._model = None

    def load_model(self):
        """Load the trained V2 XGBoost soft-sensor model from disk."""
        if os.path.exists(MODEL_PATH):
            self._model = joblib.load(MODEL_PATH)
            print(f"✅ Loaded V2 XGBoost model from {MODEL_PATH}")
        else:
            print(f"⚠️  No model found at {MODEL_PATH}. Using formula fallback.")

    def predict(self, reading: SensorReading) -> InferenceResult:
        """Run soft-sensor prediction (anomaly detection is handled by QuadGuard)."""
        bod, cod = self._predict_bod_cod(reading)

        return InferenceResult(
            bod_predicted=round(bod, 2),
            cod_predicted=round(cod, 2),
        )

    # ── Model 1: Soft-Sensor (V2 XGBoost) ───────────────────
    def _predict_bod_cod(self, reading: SensorReading) -> tuple[float, float]:
        if self._model is None:
            # Deterministic formula fallback
            bod = (
                0.8 * reading.turbidity
                + 0.02 * reading.tds
                + 1.5 * abs(reading.ph - 7.0)
            )
            cod = bod * 2.2
            return round(max(0.0, bod), 2), round(max(0.0, cod), 2)

        # Build the 14-feature input matching the V2 model's training columns.
        # Sensor mapping: pH → pH, Turbidity → TSS (turbidity is a proxy for TSS).
        # Temperature & Location use sensible defaults.
        row = {
            "Temperature (Avg)": DEFAULT_TEMP_AVG,
            "Max Temperature": DEFAULT_TEMP_MAX,
            "Min Temperature": DEFAULT_TEMP_MIN,
            "pH": reading.ph,
            "TSS": reading.turbidity,  # turbidity ≈ TSS proxy
        }
        # All STP location one-hot cols default to 0 (no specific location)
        for col in V2_FEATURE_COLS:
            if col not in row:
                row[col] = 0

        X = pd.DataFrame([row], columns=V2_FEATURE_COLS)
        # Model output order: [COD, BOD, Ammonia]
        prediction = self._model.predict(X)[0]
        cod = float(max(0.0, prediction[0]))
        bod = float(max(0.0, prediction[1]))
        return round(bod, 2), round(cod, 2)
