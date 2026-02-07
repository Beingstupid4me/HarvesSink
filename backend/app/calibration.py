"""
HarvesSink – Calibration & Valve Control Engine.
Handles adaptive baseline learning and valve decision-making.
"""

import numpy as np
from typing import Optional

from app.schemas import SensorReading, CalibrationBaseline
from app.config import settings


class CalibrationEngine:
    """
    Collects the first N samples of 'clean' water to compute
    a per-device adaptive baseline (mean ± std).
    """

    def __init__(self):
        # Buffers keyed by device_id
        self._buffers: dict[str, dict] = {}
        self._baselines: dict[str, CalibrationBaseline] = {}

    def _ensure_buffer(self, device_id: str):
        if device_id not in self._buffers:
            self._buffers[device_id] = {"ph": [], "tds": [], "turbidity": []}

    def is_calibrated(self, device_id: str) -> bool:
        bl = self._baselines.get(device_id)
        return bl is not None and bl.is_complete

    def get_progress(self, device_id: str) -> float:
        """Returns calibration progress 0‒100."""
        bl = self._baselines.get(device_id)
        if bl and bl.is_complete:
            return 100.0
        buf = self._buffers.get(device_id)
        if not buf:
            return 0.0
        count = len(buf["ph"])
        return round((count / settings.calibration_sample_count) * 100, 1)

    def feed_sample(self, reading: SensorReading) -> Optional[CalibrationBaseline]:
        """
        Feed a reading during calibration. Returns the baseline once complete.
        """
        did = reading.device_id
        self._ensure_buffer(did)
        buf = self._buffers[did]

        if did in self._baselines and self._baselines[did].is_complete:
            return self._baselines[did]

        buf["ph"].append(reading.ph)
        buf["tds"].append(reading.tds)
        buf["turbidity"].append(reading.turbidity)

        if len(buf["ph"]) >= settings.calibration_sample_count:
            baseline = CalibrationBaseline(
                device_id=did,
                ph_mean=round(float(np.mean(buf["ph"])), 3),
                ph_std=round(float(np.std(buf["ph"])), 3),
                tds_mean=round(float(np.mean(buf["tds"])), 3),
                tds_std=round(float(np.std(buf["tds"])), 3),
                turbidity_mean=round(float(np.mean(buf["turbidity"])), 3),
                turbidity_std=round(float(np.std(buf["turbidity"])), 3),
                sample_count=len(buf["ph"]),
                is_complete=True,
            )
            self._baselines[did] = baseline
            return baseline

        return None

    def get_baseline(self, device_id: str) -> Optional[CalibrationBaseline]:
        return self._baselines.get(device_id)

    def load_baseline(self, baseline: CalibrationBaseline):
        """Load a previously persisted baseline."""
        self._baselines[baseline.device_id] = baseline


class ValveController:
    """
    Decides Harvest / Caution / Drain based on:
      1. Hard safety caps (WHO/CPCB)
      2. Adaptive baseline (if calibrated)
    """

    SIGMA_THRESHOLD = 2.5  # standard deviations from baseline

    def decide(self, reading: SensorReading, baseline: Optional[CalibrationBaseline]) -> str:
        """Returns 'harvest', 'caution', or 'drain'."""

        # ── Hard safety caps (always enforced) ───────────────
        if reading.ph < settings.ph_min or reading.ph > settings.ph_max:
            return "drain"
        if reading.tds > settings.tds_max:
            return "drain"
        if reading.turbidity > settings.turbidity_max:
            return "drain"

        # ── Adaptive baseline check ──────────────────────────
        if baseline and baseline.is_complete:
            deviations = []
            if baseline.ph_std > 0:
                deviations.append(abs(reading.ph - baseline.ph_mean) / baseline.ph_std)
            if baseline.tds_std > 0:
                deviations.append(abs(reading.tds - baseline.tds_mean) / baseline.tds_std)
            if baseline.turbidity_std > 0:
                deviations.append(abs(reading.turbidity - baseline.turbidity_mean) / baseline.turbidity_std)

            if deviations:
                max_dev = max(deviations)
                if max_dev > self.SIGMA_THRESHOLD * 1.5:
                    return "drain"
                if max_dev > self.SIGMA_THRESHOLD:
                    return "caution"

        return "harvest"
