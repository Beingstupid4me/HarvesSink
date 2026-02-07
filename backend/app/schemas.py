"""
HarvesSink – Pydantic schemas shared across the application.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


# ── Incoming sensor packet ──────────────────────────────────
class SensorReading(BaseModel):
    device_id: str = "HVS-001"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ph: float = Field(..., ge=0, le=14)
    tds: float = Field(..., ge=0)            # ppm
    turbidity: float = Field(..., ge=0)      # NTU
    temperature: float = Field(..., ge=-10, le=80)  # °C
    gps_lat: float = 28.6139
    gps_lng: float = 77.2090

    # System state
    valve_position: Literal[0, 1] = 1       # 0=Drain, 1=Harvest
    device_mode: Literal["calibration", "active", "fault"] = "active"


# ── AI inference results ────────────────────────────────────
class InferenceResult(BaseModel):
    bod_predicted: float = 0.0   # mg/L
    cod_predicted: float = 0.0   # mg/L
    anomaly_flag: bool = False
    anomaly_detail: str = ""


# ── Combined packet pushed to frontend ──────────────────────
class LivePacket(BaseModel):
    reading: SensorReading
    inference: InferenceResult
    valve_decision: Literal["harvest", "caution", "drain"] = "harvest"
    calibration_progress: float = 0.0  # 0‒100%
    liters_saved: float = 0.0
    money_saved: float = 0.0
    lake_impact_score: float = 0.0


# ── Calibration baseline ────────────────────────────────────
class CalibrationBaseline(BaseModel):
    device_id: str
    ph_mean: float
    ph_std: float
    tds_mean: float
    tds_std: float
    turbidity_mean: float
    turbidity_std: float
    sample_count: int = 0
    is_complete: bool = False


# ── Municipal node (for map view) ───────────────────────────
class NodeSummary(BaseModel):
    device_id: str
    lat: float
    lng: float
    quality: Literal["good", "caution", "poor"] = "good"
    ph: float
    tds: float
    turbidity: float
    bod: float = 0.0
    cod: float = 0.0


# ── LLM nudge (optional feature) ───────────────────────────
class SustainabilityNudge(BaseModel):
    message: str = ""
    activity_guess: str = ""
    tip: str = ""
