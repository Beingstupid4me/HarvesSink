"""
HarvesSink – Arduino Serial data source.
Reads JSON packets from COM/USB port and remaps Arduino field names
to match backend SensorReading schema.

Arduino JSON contract (9600 baud, 1Hz):
  {"ph":7.21, "tds":560, "turb":1850, "valve":1, "state":2,
   "progress":100, "base_tds":562, "nudge":1}
"""

import asyncio
import json
from datetime import datetime

from app.schemas import SensorReading
from app.sources.base import DataSource
from app.config import settings

try:
    import serial
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False

# Arduino state → device_mode mapping
_STATE_MAP = {0: "warmup", 1: "calibration", 2: "active"}


class SerialSource(DataSource):
    """
    Reads Arduino JSON packets from a serial port, remaps field names,
    and supports write() for the kill-switch reverse handshake.
    """

    def __init__(self):
        self._ser = None
        self._connected = False

    async def connect(self) -> None:
        if not SERIAL_AVAILABLE:
            raise RuntimeError("pyserial is not installed. Run: pip install pyserial")
        self._ser = serial.Serial(
            port=settings.serial_port,
            baudrate=settings.serial_baud,
            timeout=1,
        )
        self._connected = True
        print(f"📡 Serial connected: {settings.serial_port} @ {settings.serial_baud} baud")

    async def read(self) -> SensorReading:
        if not self._ser:
            raise RuntimeError("Serial not connected")

        loop = asyncio.get_event_loop()
        # Keep retrying until we get a non-empty line (Arduino may not
        # have sent a packet yet, or the read timed out mid-cycle).
        while True:
            line = await loop.run_in_executor(None, self._ser.readline)
            raw = line.decode("utf-8", errors="ignore").strip()
            if raw:
                break
            await asyncio.sleep(0.1)  # avoid busy-spin on empty reads

        data = json.loads(raw)

        # Remap Arduino JSON keys → SensorReading fields
        state_int = int(data.get("state", 2))
        valve_int = int(data.get("valve", 1))

        # pH sensor is wired inverted — calibration from two known points:
        #   Normal water (pH 7)  → Arduino raw ≈ 14
        #   Basic  water (pH 14) → Arduino raw ≈ 7
        # Linear fit: corrected_pH = 21 - raw_ph
        raw_ph = float(data["ph"])
        corrected_ph = max(0.0, min(14.0, 21.0 - raw_ph))

        return SensorReading(
            device_id="HVS-001",
            timestamp=datetime.utcnow(),
            ph=corrected_ph,
            tds=float(data["tds"]),
            turbidity=float(data.get("turb", 0)),       # Arduino sends "turb"
            valve_position=valve_int,
            device_mode=_STATE_MAP.get(state_int, "active"),
            edge_state=state_int,
            edge_progress=int(data.get("progress", 100)),
            edge_base_tds=float(data.get("base_tds", 0)),
            edge_nudge=bool(data.get("nudge", 1)),
            edge_valve=valve_int,
            edge_confidence=int(data.get("conf", 0)),
        )

    async def write(self, data: str) -> None:
        """Send data to Arduino (kill-switch reverse handshake)."""
        if self._ser and self._ser.is_open:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._ser.write, data.encode("utf-8"))

    async def disconnect(self) -> None:
        if self._ser and self._ser.is_open:
            self._ser.close()
        self._connected = False

    def is_connected(self) -> bool:
        return self._connected
