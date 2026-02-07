"""
HarvesSink – SerialBridge: Factory that returns the right DataSource.
Swap between simulation and real hardware with a single config flag.
"""

from app.config import settings
from app.sources.base import DataSource
from app.sources.simulator import MockSTM32
from app.sources.serial_source import SerialSource


def create_data_source() -> DataSource:
    """
    Factory function. Returns MockSTM32 in simulation mode,
    SerialSource in hardware mode.
    """
    if settings.data_source == "serial":
        return SerialSource()
    return MockSTM32()
