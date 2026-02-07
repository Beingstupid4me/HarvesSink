"""
HarvesSink – Municipal node simulator.
Generates N virtual nodes spread across a city for the map view.
"""

import random
import math
from datetime import datetime

from app.schemas import SensorReading, NodeSummary


# ── Delhi NCR bounding box ──────────────────────────────────
CENTER_LAT, CENTER_LNG = 28.6139, 77.2090
SPREAD = 0.15  # ~15km radius


def _generate_node_positions(n: int) -> list[dict]:
    """Generate N random positions in a circle around the center."""
    rng = random.Random(42)
    nodes = []
    for i in range(n):
        angle = rng.uniform(0, 2 * math.pi)
        r = rng.uniform(0, SPREAD)
        nodes.append({
            "device_id": f"HVS-{i+1:03d}",
            "lat": round(CENTER_LAT + r * math.sin(angle), 6),
            "lng": round(CENTER_LNG + r * math.cos(angle), 6),
        })
    return nodes


# Pre-generate positions (deterministic)
_NODE_POSITIONS = _generate_node_positions(50)


def get_all_node_summaries() -> list[NodeSummary]:
    """
    Generate a snapshot of all municipal nodes with randomized
    but realistic current readings.
    """
    summaries = []
    for node in _NODE_POSITIONS:
        ph = round(random.gauss(7.2, 0.8), 2)
        tds = round(max(50, random.gauss(280, 120)), 1)
        turb = round(max(0.1, random.expovariate(0.2)), 2)

        if ph < 6.5 or ph > 8.5 or tds > 500 or turb > 10:
            quality = "poor"
        elif tds > 350 or turb > 5:
            quality = "caution"
        else:
            quality = "good"

        summaries.append(NodeSummary(
            device_id=node["device_id"],
            lat=node["lat"],
            lng=node["lng"],
            quality=quality,
            ph=ph,
            tds=tds,
            turbidity=turb,
        ))
    return summaries
