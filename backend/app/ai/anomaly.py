"""
HarvesSink – Quad-Guard Anomaly Detection Engine.

Four-tier anomaly system:
  T1: Electronic Boundary Check    → CRITICAL_FAULT  (hardware failure)
  T2: Signal Integrity Watchdog    → SENSOR_STUCK    (ADC freeze vs stable)
  T3: Local Z-Score                → ANOMALY         (unusual chemistry)
  T4: Cross-Sensor Correlation     → CALIBRATION_FAULT (physics conflict)
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Optional

from app.schemas import SensorReading, CalibrationBaseline


@dataclass
class AnomalyVerdict:
    """Result of running all four tiers."""
    # Overall
    is_anomaly: bool = False
    severity: str = "ok"            # ok | warning | critical
    action: str = "harvest"         # harvest | caution | drain

    # Per-tier flags
    t1_fault: bool = False
    t1_detail: str = ""

    t2_fault: bool = False
    t2_detail: str = ""

    t3_fault: bool = False
    t3_detail: str = ""
    t3_z_scores: dict = field(default_factory=dict)

    t4_fault: bool = False
    t4_detail: str = ""

    def to_dict(self) -> dict:
        return {
            "is_anomaly": self.is_anomaly,
            "severity": self.severity,
            "action": self.action,
            "tiers": {
                "t1": {"fault": self.t1_fault, "detail": self.t1_detail, "name": "Electronic Boundary"},
                "t2": {"fault": self.t2_fault, "detail": self.t2_detail, "name": "Signal Integrity"},
                "t3": {"fault": self.t3_fault, "detail": self.t3_detail, "name": "Z-Score Anomaly",
                        "z_scores": self.t3_z_scores},
                "t4": {"fault": self.t4_fault, "detail": self.t4_detail, "name": "Cross-Sensor"},
            },
        }


# Buffer length in samples (at 500ms interval → 30s = 60 samples)
BUFFER_SIZE = 60
Z_SIGMA_THRESHOLD = 4.5
EPSILON = 1e-9


class QuadGuardEngine:
    """Runs the four-tier anomaly detection pipeline."""

    def __init__(self):
        # Per-device sliding buffer (last ~30s)
        self._buffers: dict[str, list[dict]] = {}

    def _ensure_buffer(self, device_id: str):
        if device_id not in self._buffers:
            self._buffers[device_id] = []

    def _push(self, device_id: str, reading: SensorReading):
        self._ensure_buffer(device_id)
        buf = self._buffers[device_id]
        buf.append({"ph": reading.ph, "tds": reading.tds, "turbidity": reading.turbidity})
        if len(buf) > BUFFER_SIZE:
            buf.pop(0)

    def evaluate(
        self,
        reading: SensorReading,
        baseline: Optional[CalibrationBaseline] = None,
    ) -> AnomalyVerdict:
        """Run all 4 tiers and return a combined verdict."""
        self._push(reading.device_id, reading)
        verdict = AnomalyVerdict()

        # ── Tier 1: Electronic Boundary Check ────────────
        self._tier1(reading, verdict)

        # ── Tier 2: Signal Integrity Watchdog ────────────
        self._tier2(reading.device_id, verdict)

        # ── Tier 3: Local Z-Score ────────────────────────
        self._tier3(reading, baseline, verdict)

        # ── Tier 4: Cross-Sensor Correlation ─────────────
        self._tier4(reading, verdict)

        # ── Determine overall severity + action ─────────
        if verdict.t1_fault:
            verdict.severity = "critical"
            verdict.action = "drain"
        elif verdict.t4_fault:
            verdict.severity = "critical"
            verdict.action = "drain"
        elif verdict.t3_fault:
            verdict.severity = "critical"
            verdict.action = "drain"
        elif verdict.t2_fault:
            verdict.severity = "warning"
            verdict.action = "caution"
        else:
            verdict.severity = "ok"
            verdict.action = "harvest"

        verdict.is_anomaly = verdict.t1_fault or verdict.t2_fault or verdict.t3_fault or verdict.t4_fault
        return verdict

    # ── T1: Electronic Boundary Check ───────────────────
    def _tier1(self, r: SensorReading, v: AnomalyVerdict):
        """Detect catastrophic hardware failure."""
        issues = []
        if r.ph < 1.0 or r.ph > 13.0:
            issues.append(f"pH={r.ph:.2f} outside [1–13]")
        if r.tds > 4500:
            issues.append(f"TDS={r.tds:.0f} > 4500 (probe short?)")
        if r.turbidity < 0:
            issues.append(f"Turbidity={r.turbidity:.2f} negative")

        if issues:
            v.t1_fault = True
            v.t1_detail = "CRITICAL FAULT: " + "; ".join(issues)

    # ── T2: Signal Integrity Watchdog ───────────────────
    def _tier2(self, device_id: str, v: AnomalyVerdict):
        """Detect sensor stuck vs. legitimately stable signal."""
        buf = self._buffers.get(device_id, [])
        if len(buf) < 10:
            return  # Not enough data

        issues = []
        for key in ["ph", "tds", "turbidity"]:
            values = [s[key] for s in buf]
            std = float(np.std(values))

            if std == 0.0:
                issues.append(f"{key} STUCK (σ=0.000000 — digital freeze)")
            elif std < 0.001:
                pass  # STABLE — normal, water is still or tap off

        if issues:
            v.t2_fault = True
            v.t2_detail = "SENSOR STUCK: " + "; ".join(issues)

    # ── T3: Local Z-Score ───────────────────────────────
    def _tier3(
        self,
        r: SensorReading,
        baseline: Optional[CalibrationBaseline],
        v: AnomalyVerdict,
    ):
        """Detect unusual chemical events relative to household baseline."""
        if baseline is None or not baseline.is_complete:
            return  # Can't compute Z without a baseline

        z_scores = {}
        issues = []

        # pH
        z_ph = abs(r.ph - baseline.ph_mean) / (baseline.ph_std + EPSILON)
        z_scores["ph"] = round(z_ph, 2)
        if z_ph > Z_SIGMA_THRESHOLD:
            issues.append(f"pH Z={z_ph:.1f}")

        # TDS
        z_tds = abs(r.tds - baseline.tds_mean) / (baseline.tds_std + EPSILON)
        z_scores["tds"] = round(z_tds, 2)
        if z_tds > Z_SIGMA_THRESHOLD:
            issues.append(f"TDS Z={z_tds:.1f}")

        # Turbidity
        z_turb = abs(r.turbidity - baseline.turbidity_mean) / (baseline.turbidity_std + EPSILON)
        z_scores["turbidity"] = round(z_turb, 2)
        if z_turb > Z_SIGMA_THRESHOLD:
            issues.append(f"Turbidity Z={z_turb:.1f}")

        v.t3_z_scores = z_scores
        if issues:
            v.t3_fault = True
            v.t3_detail = f"UNUSUAL WATER SIGNATURE (>{Z_SIGMA_THRESHOLD}σ): " + "; ".join(issues)

    # ── T4: Cross-Sensor Correlation ────────────────────
    def _tier4(self, r: SensorReading, v: AnomalyVerdict):
        """Detect physics-impossible cross-sensor conflicts."""
        issues = []

        # High turbidity + low TDS is physically impossible in greywater
        if r.turbidity > 50 and r.tds < 30:
            issues.append(
                f"Turbidity={r.turbidity:.1f} but TDS={r.tds:.0f} — "
                "can't have high solids with near-pure water"
            )

        if issues:
            v.t4_fault = True
            v.t4_detail = "CALIBRATION FAULT: " + "; ".join(issues) + " — Clean probes."

    def reset(self, device_id: str):
        """Clear buffers for a device."""
        self._buffers.pop(device_id, None)
