"""
HarvesSink – Mock STM32 sensor simulator.
Generates realistic time-series data with noise, drift, and event spikes.
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
    "clean": {"ph": 7.2, "tds": 180, "turbidity": 1.2, "temp": 26},
    "dishwashing": {"ph": 8.8, "tds": 420, "turbidity": 12, "temp": 34},
    "vegetable_wash": {"ph": 7.0, "tds": 220, "turbidity": 6, "temp": 24},
    "contamination": {"ph": 4.5, "tds": 900, "turbidity": 45, "temp": 28},
    "pipe_breach": {"ph": 5.0, "tds": 1200, "turbidity": 80, "temp": 30},
}


class MockSTM32(DataSource):
    """
    Emits realistic sensor data with optional scenario injection.
    """

    def __init__(self, device_id: str = "HVS-001", lat: float = 28.6139, lng: float = 77.2090):
        self.device_id = device_id
        self.lat = lat
        self.lng = lng
        self._connected = False
        self._tick = 0
        self._scenario: str = "clean"

    async def connect(self) -> None:
        self._connected = True

    async def disconnect(self) -> None:
        self._connected = False

    def is_connected(self) -> bool:
        return self._connected

    def set_scenario(self, name: str) -> None:
        if name in SCENARIOS:
            self._scenario = name

    async def read(self) -> SensorReading:
        await asyncio.sleep(settings.sim_interval_ms / 1000)
        self._tick += 1

        base = SCENARIOS[self._scenario]

        # Add realistic noise + slow sinusoidal drift
        drift = math.sin(self._tick * 0.05) * 0.3
        reading = SensorReading(
            device_id=self.device_id,
            timestamp=datetime.utcnow(),
            ph=round(base["ph"] + drift + random.gauss(0, 0.15), 2),
            tds=round(base["tds"] + drift * 20 + random.gauss(0, 8), 1),
            turbidity=round(max(0, base["turbidity"] + drift * 2 + random.gauss(0, 0.5)), 2),
            temperature=round(base["temp"] + random.gauss(0, 0.3), 1),
            gps_lat=self.lat,
            gps_lng=self.lng,
            valve_position=1,
            device_mode="active",
        )
        return reading
