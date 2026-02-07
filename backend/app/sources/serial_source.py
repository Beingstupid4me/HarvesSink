"""
HarvesSink – Real STM32 serial data source.
Reads JSON packets from a COM/USB port.
"""

import asyncio
import json

from app.schemas import SensorReading
from app.sources.base import DataSource
from app.config import settings

try:
    import serial
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False


class SerialSource(DataSource):
    """
    Reads SensorReading JSON packets from a serial port.
    Falls back to raising an error if pyserial is missing.
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

    async def read(self) -> SensorReading:
        if not self._ser:
            raise RuntimeError("Serial not connected")
        # Run blocking serial read in a thread
        loop = asyncio.get_event_loop()
        line = await loop.run_in_executor(None, self._ser.readline)
        data = json.loads(line.decode("utf-8").strip())
        return SensorReading(**data)

    async def disconnect(self) -> None:
        if self._ser and self._ser.is_open:
            self._ser.close()
        self._connected = False

    def is_connected(self) -> bool:
        return self._connected
