"""
HarvesSink – Impact tracker.
Tracks liters saved, money saved, and lake impact score.
"""


# Average flow rate for household greywater (liters per reading interval)
LITERS_PER_HARVEST = 0.25       # ~0.5L/s at 500ms interval
TANKER_COST_PER_LITER = 0.50   # ₹0.50 per liter (tanker water in Delhi)
LAKE_IMPACT_PER_LITER = 0.01   # arbitrary score unit


class ImpactTracker:
    """Accumulates impact metrics per device."""

    def __init__(self):
        self._data: dict[str, dict] = {}

    def _ensure(self, device_id: str):
        if device_id not in self._data:
            self._data[device_id] = {
                "liters_saved": 0.0,
                "money_saved": 0.0,
                "lake_impact_score": 0.0,
            }

    def record_harvest(self, device_id: str):
        """Call each time a reading results in 'harvest' decision."""
        self._ensure(device_id)
        d = self._data[device_id]
        d["liters_saved"] += LITERS_PER_HARVEST
        d["money_saved"] = round(d["liters_saved"] * TANKER_COST_PER_LITER, 2)
        d["lake_impact_score"] = round(d["liters_saved"] * LAKE_IMPACT_PER_LITER, 2)

    def get(self, device_id: str) -> dict:
        self._ensure(device_id)
        return self._data[device_id]

    def load(self, device_id: str, liters: float, money: float, lake: float):
        """Load persisted values on startup."""
        self._data[device_id] = {
            "liters_saved": liters,
            "money_saved": money,
            "lake_impact_score": lake,
        }
