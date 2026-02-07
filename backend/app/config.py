"""
HarvesSink – Application configuration.
Reads from .env or environment variables.
"""

from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # ── Data source ──────────────────────────────────────────
    data_source: Literal["simulation", "serial"] = "simulation"
    serial_port: str = "COM3"
    serial_baud: int = 115200

    # ── Database ─────────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./harvessink.db"

    # ── Simulation ───────────────────────────────────────────
    sim_interval_ms: int = 500
    sim_num_nodes: int = 50

    # ── LLM (optional) ──────────────────────────────────────
    openai_api_key: str = ""
    llm_enabled: bool = False

    # ── Calibration ──────────────────────────────────────────
    calibration_sample_count: int = 50

    # ── Safety caps (WHO / CPCB) ─────────────────────────────
    ph_min: float = 6.5
    ph_max: float = 8.5
    tds_max: float = 500.0       # ppm
    turbidity_max: float = 5.0   # NTU

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
