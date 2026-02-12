"""
HarvesSink – Mock Arduino sensor simulator.
Generates realistic time-series data with noise, drift, event spikes,
and simulates the Arduino state machine (warmup → calibrating → operational).
"""

import asyncio
import math
import random
from datetime import datetime

from app.schemas import SensorReading
from app.sources.base import DataSource
from app.config import settings


# ── Pre-defined event scenarios ──────────────────────────────
SCENARIOS = {
    "clean": {"ph": 7.2, "tds": 180, "turbidity": 1.2},
    "dishwashing": {"ph": 8.8, "tds": 420, "turbidity": 12},
    "vegetable_wash": {"ph": 7.0, "tds": 220, "turbidity": 6},
    "contamination": {"ph": 4.5, "tds": 900, "turbidity": 45},
    "pipe_breach": {"ph": 5.0, "tds": 1200, "turbidity": 80},
}

# Arduino state machine constants (mirroring version_3.ino)
WARMUP_TICKS = 5          # ~5 readings for warmup (5s at 1Hz)
CALIB_TICKS = 40           # 40 samples for calibration (matches Arduino CALIB_SAMPLES)
CONFIDENCE_LIMIT = 3


class MockSTM32(DataSource):
    """
    Emits realistic sensor data with optional scenario injection.
    Simulates Arduino state machine: WARMUP → CALIBRATING → OPERATIONAL.
    """

    def __init__(self, device_id: str = "HVS-001", lat: float = 28.6139, lng: float = 77.2090):
        self.device_id = device_id
        self.lat = lat
        self.lng = lng
        self._connected = False
        self._tick = 0
        self._scenario: str = "clean"

        # Arduino state machine simulation
        self._edge_state = 0         # 0=WARMUP, 1=CALIBRATING, 2=OPERATIONAL
        self._calib_count = 0
        self._edge_base_tds = 0.0
        self._tds_sum = 0.0
        self._tds_sq_sum = 0.0
        self._edge_std_tds = 0.0
        self._confidence = 0
        self._edge_harvesting = False
        self._kill_switch = False    # Server can override via write("0")

    async def connect(self) -> None:
        self._connected = True

    async def disconnect(self) -> None:
        self._connected = False

    def is_connected(self) -> bool:
        return self._connected

    def set_scenario(self, name: str) -> None:
        if name in SCENARIOS:
            self._scenario = name

    async def write(self, data: str) -> None:
        """Simulate kill-switch from server."""
        if data.strip() == "0":
            self._kill_switch = True
            self._edge_harvesting = False
        elif data.strip() == "1":
            self._kill_switch = False

    async def read(self) -> SensorReading:
        await asyncio.sleep(settings.sim_interval_ms / 1000)
        self._tick += 1

        base = SCENARIOS[self._scenario]

        # Add realistic noise + slow sinusoidal drift
        drift = math.sin(self._tick * 0.05) * 0.3
        ph = round(base["ph"] + drift + random.gauss(0, 0.15), 2)
        tds = round(base["tds"] + drift * 20 + random.gauss(0, 8), 1)
        turbidity = round(max(0, base["turbidity"] + drift * 2 + random.gauss(0, 0.5)), 2)

        # ── Arduino state machine ────────────────────────
        edge_progress = 0
        nudge_pass = True

        if self._edge_state == 0:
            # WARMUP
            if self._tick >= WARMUP_TICKS:
                self._edge_state = 1
            edge_progress = 0

        elif self._edge_state == 1:
            # CALIBRATING — collect samples for baseline
            self._tds_sum += tds
            self._tds_sq_sum += tds * tds
            self._calib_count += 1
            edge_progress = int((self._calib_count * 100) / CALIB_TICKS)

            if self._calib_count >= CALIB_TICKS:
                mean = self._tds_sum / CALIB_TICKS
                variance = (self._tds_sq_sum / CALIB_TICKS) - (mean * mean)
                self._edge_base_tds = round(mean, 1)
                self._edge_std_tds = round(max(0, variance) ** 0.5, 2)
                self._edge_state = 2
                edge_progress = 100

        else:
            # OPERATIONAL — compute adaptive nudge
            edge_progress = 100
            if self._edge_std_tds > 2.0:
                z = abs(tds - self._edge_base_tds) / self._edge_std_tds
                nudge_pass = z < 3.0

        # Static safety check (matches Arduino Tier 1)
        ph_ok = 6.5 <= ph <= 8.5
        tds_ok = tds <= 1000
        turb_ok = turbidity < 5.0  # NTU scale (Arduino uses raw ADC, sim uses NTU)
        static_clean = ph_ok and tds_ok and turb_ok

        # Confidence engine (temporal debounce)
        final_decision = static_clean and nudge_pass
        if not final_decision:
            self._confidence = min(self._confidence + 1, CONFIDENCE_LIMIT)
            if self._confidence >= CONFIDENCE_LIMIT:
                self._edge_harvesting = False
        else:
            self._confidence = max(self._confidence - 1, 0)
            if self._confidence <= 0:
                self._edge_harvesting = True

        # Kill switch override
        if self._kill_switch:
            self._edge_harvesting = False

        # Map state to device_mode
        mode_map = {0: "warmup", 1: "calibration", 2: "active"}
        device_mode = mode_map.get(self._edge_state, "active")

        return SensorReading(
            device_id=self.device_id,
            timestamp=datetime.utcnow(),
            ph=ph,
            tds=tds,
            turbidity=turbidity,
            gps_lat=self.lat,
            gps_lng=self.lng,
            valve_position=1 if self._edge_harvesting else 0,
            device_mode=device_mode,
            edge_state=self._edge_state,
            edge_progress=edge_progress,
            edge_base_tds=self._edge_base_tds,
            edge_nudge=nudge_pass,
            edge_valve=1 if self._edge_harvesting else 0,
            edge_confidence=self._confidence,
        )
