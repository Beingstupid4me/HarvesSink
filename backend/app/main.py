"""
HarvesSink – FastAPI application entry point.
Wires up all components: data source, calibration, AI, and WebSocket streaming.
"""

import asyncio
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import (
    init_db, save_baseline, load_baselines,
    save_impact, load_impacts, save_reading, load_readings,
)
from app.schemas import SensorReading, LivePacket, NodeSummary, SustainabilityNudge, CalibrationBaseline
from app.sources.bridge import create_data_source
from app.sources.base import DataSource
from app.calibration import CalibrationEngine, ValveController
from app.ai.inference import InferenceEngine
from app.ai.llm_nudge import generate_nudge
from app.impact import ImpactTracker
from app.municipal import get_all_node_summaries


# ── Singletons ───────────────────────────────────────────────
data_source: DataSource = create_data_source()
calibration = CalibrationEngine()
valve = ValveController()
engine = InferenceEngine()
impact = ImpactTracker()

# Connected WebSocket clients
ws_clients: set[WebSocket] = set()

# Background task handle
_stream_task: Optional[asyncio.Task] = None

# Track last reading per device (for nudge endpoint)
_last_readings: dict[str, SensorReading] = {}

# Persist counter — save impact/baseline every N readings
_persist_counter = 0
PERSIST_EVERY = 20


# ── Lifespan ─────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    engine.load_model()
    _load_persisted_state()
    await data_source.connect()

    global _stream_task
    _stream_task = asyncio.create_task(_sensor_stream_loop())

    yield

    # Shutdown — persist final state
    _persist_state()
    if _stream_task:
        _stream_task.cancel()
    await data_source.disconnect()


app = FastAPI(title="HarvesSink API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Background sensor stream ────────────────────────────────
async def _sensor_stream_loop():
    """Continuously reads from data source, runs inference, broadcasts."""
    global ws_clients, _persist_counter
    while True:
        try:
            reading = await data_source.read()
            _last_readings[reading.device_id] = reading

            # Calibration phase (auto-calibrate on first connection)
            if not calibration.is_calibrated(reading.device_id):
                reading.device_mode = "calibration"
                result = calibration.feed_sample(reading)
                # Persist baseline when calibration completes
                if result and result.is_complete:
                    save_baseline(reading.device_id, result.model_dump())

            # AI inference
            inference = engine.predict(reading)

            # Valve decision
            baseline = calibration.get_baseline(reading.device_id)
            decision = valve.decide(reading, baseline)

            # Anomaly override
            if inference.anomaly_flag:
                reading.device_mode = "fault"
                decision = "drain"

            # Impact tracking
            if decision == "harvest":
                impact.record_harvest(reading.device_id)

            impact_data = impact.get(reading.device_id)

            # Build packet
            packet = LivePacket(
                reading=reading,
                inference=inference,
                valve_decision=decision,
                calibration_progress=calibration.get_progress(reading.device_id),
                liters_saved=round(impact_data["liters_saved"], 1),
                money_saved=impact_data["money_saved"],
                lake_impact_score=impact_data["lake_impact_score"],
            )

            # Persist reading
            save_reading({
                "device_id": reading.device_id,
                "timestamp": reading.timestamp.isoformat(),
                "ph": reading.ph,
                "tds": reading.tds,
                "turbidity": reading.turbidity,
                "temperature": reading.temperature,
                "bod": inference.bod_predicted,
                "cod": inference.cod_predicted,
                "valve_decision": decision,
                "anomaly": inference.anomaly_flag,
            })

            # Periodically persist impact
            _persist_counter += 1
            if _persist_counter >= PERSIST_EVERY:
                _persist_counter = 0
                _persist_state()

            # Broadcast to all WebSocket clients
            packet_json = packet.model_dump_json()
            dead = set()
            for ws in ws_clients:
                try:
                    await ws.send_text(packet_json)
                except Exception:
                    dead.add(ws)
            ws_clients.difference_update(dead)

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Stream error: {e}")
            await asyncio.sleep(1)


def _persist_state():
    """Save impact counters to JSON files."""
    for device_id in impact._data:
        save_impact(device_id, impact._data[device_id])


def _load_persisted_state():
    """Restore calibration baselines and impact counters from JSON."""
    try:
        # Load baselines
        baselines = load_baselines()
        for device_id, bl_dict in baselines.items():
            bl = CalibrationBaseline(**bl_dict)
            calibration.load_baseline(bl)

        # Load impact
        impacts = load_impacts()
        for device_id, imp_dict in impacts.items():
            impact.load(
                device_id,
                imp_dict.get("liters_saved", 0),
                imp_dict.get("money_saved", 0),
                imp_dict.get("lake_impact_score", 0),
            )
    except Exception as e:
        print(f"Warning: Could not load persisted state: {e}")


# ── WebSocket endpoint ───────────────────────────────────────
@app.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    await ws.accept()
    ws_clients.add(ws)
    try:
        while True:
            await ws.receive_text()  # keep-alive
    except WebSocketDisconnect:
        ws_clients.discard(ws)


# ── REST Endpoints ───────────────────────────────────────────
@app.get("/")
async def root():
    return {"service": "HarvesSink", "version": "1.0.0", "status": "running"}


@app.get("/api/status")
async def get_status():
    return {
        "data_source": settings.data_source,
        "connected": data_source.is_connected(),
        "llm_enabled": settings.llm_enabled,
    }


@app.get("/api/calibration/{device_id}")
async def get_calibration(device_id: str):
    baseline = calibration.get_baseline(device_id)
    return {
        "calibrated": calibration.is_calibrated(device_id),
        "progress": calibration.get_progress(device_id),
        "baseline": baseline.model_dump() if baseline else None,
    }


@app.post("/api/calibration/reset/{device_id}")
async def reset_calibration(device_id: str):
    """Reset calibration for a device — triggers re-calibration from scratch."""
    calibration.reset(device_id)
    return {"status": "ok", "message": f"Calibration reset for {device_id}. Re-learning baseline..."}


@app.get("/api/impact/{device_id}")
async def get_impact(device_id: str):
    return impact.get(device_id)


@app.get("/api/municipal/nodes", response_model=list[NodeSummary])
async def get_municipal_nodes():
    return get_all_node_summaries()


@app.get("/api/nudge/{device_id}", response_model=SustainabilityNudge)
async def get_nudge(device_id: str):
    reading = _last_readings.get(device_id) or SensorReading(
        device_id=device_id, ph=7.2, tds=300, turbidity=3.0, temperature=27.0,
    )
    nudge = await generate_nudge(reading)
    return nudge or SustainabilityNudge(message="No tip available.")


@app.post("/api/scenario/{scenario_name}")
async def set_scenario(scenario_name: str):
    """Switch the simulator to a named scenario (dishwashing, contamination, etc.)."""
    from app.sources.simulator import MockSTM32, SCENARIOS
    if isinstance(data_source, MockSTM32):
        if scenario_name in SCENARIOS:
            data_source.set_scenario(scenario_name)
            return {"status": "ok", "scenario": scenario_name}
        return {"status": "error", "message": f"Unknown scenario. Available: {list(SCENARIOS.keys())}"}
    return {"status": "error", "message": "Scenario control only works in simulation mode."}


@app.get("/api/history/{device_id}")
async def get_history(device_id: str, limit: int = Query(100, le=1000)):
    """Get recent readings for a device from JSON store."""
    rows = load_readings(device_id, limit)
    return rows
