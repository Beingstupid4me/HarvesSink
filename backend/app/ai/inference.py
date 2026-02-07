"""
HarvesSink – AI Inference Engine.
Model 1: Soft-sensor regressor (BOD/COD prediction).
Model 2: Sensor health anomaly detector (Z-score based).
"""

import os
import numpy as np
from typing import Optional

import joblib

from app.schemas import SensorReading, InferenceResult


MODEL_PATH = os.path.join(os.path.dirname(__file__), "saved_models", "soft_sensor_rf.joblib")


class InferenceEngine:
    """
    Runs AI inference on each sensor reading.
    """

    def __init__(self):
        self._model = None
        self._history: dict[str, list[dict]] = {}  # per-device sliding window
        self.WINDOW_SIZE = 20                       # samples for anomaly detection
        self.Z_THRESHOLD = 3.0                      # z-score threshold

    def load_model(self):
        """Load the trained soft-sensor model from disk."""
        if os.path.exists(MODEL_PATH):
            self._model = joblib.load(MODEL_PATH)
            print(f"✅ Loaded soft-sensor model from {MODEL_PATH}")
        else:
            print(f"⚠️  No model found at {MODEL_PATH}. Run: python -m app.ai.train_model")

    def predict(self, reading: SensorReading) -> InferenceResult:
        """Run both soft-sensor and anomaly detection."""
        bod, cod = self._predict_bod_cod(reading)
        anomaly, detail = self._detect_anomaly(reading)

        return InferenceResult(
            bod_predicted=round(bod, 2),
            cod_predicted=round(cod, 2),
            anomaly_flag=anomaly,
            anomaly_detail=detail,
        )

    # ── Model 1: Soft-Sensor ────────────────────────────────
    def _predict_bod_cod(self, reading: SensorReading) -> tuple[float, float]:
        if self._model is None:
            # Deterministic formula fallback (swap for real model later)
            bod = (
                0.8 * reading.turbidity
                + 0.02 * reading.tds
                + 1.5 * abs(reading.ph - 7.0)
            )
            cod = bod * 2.2
            return round(max(0.0, bod), 2), round(max(0.0, cod), 2)

        X = np.array([[reading.ph, reading.tds, reading.turbidity, reading.temperature]])
        prediction = self._model.predict(X)[0]
        return float(prediction[0]), float(prediction[1])

    # ── Model 2: Anomaly Detector ───────────────────────────
    def _detect_anomaly(self, reading: SensorReading) -> tuple[bool, str]:
        did = reading.device_id
        if did not in self._history:
            self._history[did] = []

        window = self._history[did]
        window.append({"ph": reading.ph, "tds": reading.tds, "turbidity": reading.turbidity})
        if len(window) > self.WINDOW_SIZE:
            window.pop(0)

        if len(window) < 5:
            return False, ""

        details = []

        # Check for stuck sensor (zero variance)
        for key in ["ph", "tds", "turbidity"]:
            values = [s[key] for s in window]
            if np.std(values) < 1e-6 and len(window) >= 10:
                details.append(f"{key} sensor STUCK (zero variance)")

        # Z-score for latest value
        for key in ["ph", "tds", "turbidity"]:
            values = [s[key] for s in window[:-1]]
            if len(values) < 3:
                continue
            mean = np.mean(values)
            std = np.std(values)
            if std > 0:
                z = abs(getattr(reading, key) - mean) / std
                if z > self.Z_THRESHOLD:
                    details.append(f"{key} Z-score={z:.1f} (threshold={self.Z_THRESHOLD})")

        # Out-of-bounds hard check
        if reading.ph > 14 or reading.ph < 0:
            details.append(f"pH={reading.ph} OUT OF PHYSICAL RANGE")
        if reading.tds < 0:
            details.append(f"TDS={reading.tds} NEGATIVE")

        return (len(details) > 0, "; ".join(details))
