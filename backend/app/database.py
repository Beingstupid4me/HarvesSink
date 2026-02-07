"""
HarvesSink – JSON-file based persistence.
Simple, portable, no DB setup needed. Stores baselines, impact, and recent readings.
"""

import json
import os
from datetime import datetime
from typing import Optional


DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

_PATHS = {
    "baselines": os.path.join(DATA_DIR, "baselines.json"),
    "impact": os.path.join(DATA_DIR, "impact.json"),
    "readings": os.path.join(DATA_DIR, "readings.json"),
}

MAX_READINGS = 2000  # keep last N readings per device


def _ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def _load_json(key: str) -> dict:
    _ensure_dir()
    path = _PATHS[key]
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {}


def _save_json(key: str, data: dict):
    _ensure_dir()
    path = _PATHS[key]
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


# ── Public API ───────────────────────────────────────────────

async def init_db():
    """Create data directory if missing."""
    _ensure_dir()
    for key in _PATHS:
        if not os.path.exists(_PATHS[key]):
            _save_json(key, {})


def save_baseline(device_id: str, baseline_dict: dict):
    data = _load_json("baselines")
    data[device_id] = baseline_dict
    _save_json("baselines", data)


def load_baselines() -> dict:
    return _load_json("baselines")


def save_impact(device_id: str, impact_dict: dict):
    data = _load_json("impact")
    data[device_id] = impact_dict
    _save_json("impact", data)


def load_impacts() -> dict:
    return _load_json("impact")


def save_reading(reading_dict: dict):
    data = _load_json("readings")
    device_id = reading_dict.get("device_id", "unknown")
    if device_id not in data:
        data[device_id] = []
    data[device_id].append(reading_dict)
    # Trim to last MAX_READINGS
    if len(data[device_id]) > MAX_READINGS:
        data[device_id] = data[device_id][-MAX_READINGS:]
    _save_json("readings", data)


def load_readings(device_id: str, limit: int = 100) -> list:
    data = _load_json("readings")
    entries = data.get(device_id, [])
    return entries[-limit:]
