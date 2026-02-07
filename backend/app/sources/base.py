"""
HarvesSink – Abstract data source interface.
Every data source (simulator, serial, websocket) implements this.
"""

from abc import ABC, abstractmethod
from app.schemas import SensorReading


class DataSource(ABC):
    """Base class for all sensor data sources."""

    @abstractmethod
    async def connect(self) -> None:
        """Initialize the data source connection."""
        ...

    @abstractmethod
    async def read(self) -> SensorReading:
        """Read a single sensor packet. Blocks until data is available."""
        ...

    @abstractmethod
    async def disconnect(self) -> None:
        """Clean up resources."""
        ...

    @abstractmethod
    def is_connected(self) -> bool:
        ...
