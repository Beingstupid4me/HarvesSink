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
from app.database import init_db, async_session, BaselineRow, ImpactRow, ReadingRow
from app.schemas import SensorReading, LivePacket, NodeSummary, SustainabilityNudge
from app.sources.bridge import create_data_source
from app.sources.base import DataSource
from app.calibration import CalibrationEngine, ValveController
from app.ai.inference import InferenceEngine
from app.ai.llm_nudge import generate_nudge
from app.impact import ImpactTracker
from app.municipal import get_all_node_summaries

from sqlalchemy import select


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


# ── Lifespan ─────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    engine.load_model()
    await _load_persisted_state()
    await data_source.connect()

    global _stream_task
    _stream_task = asyncio.create_task(_sensor_stream_loop())

    yield

    # Shutdown
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
    global ws_clients
    while True:
        try:
            reading = await data_source.read()

            # Calibration phase
            if not calibration.is_calibrated(reading.device_id):
                reading.device_mode = "calibration"
                calibration.feed_sample(reading)

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

            # Persist to DB (fire-and-forget)
            asyncio.create_task(_persist_reading(reading, inference, decision))

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


async def _persist_reading(reading: SensorReading, inference, decision: str):
    """Write one reading row to the DB."""
    try:
        async with async_session() as session:
            row = ReadingRow(
                device_id=reading.device_id,
                timestamp=reading.timestamp,
                ph=reading.ph,
                tds=reading.tds,
                turbidity=reading.turbidity,
                temperature=reading.temperature,
                bod=inference.bod_predicted,
                cod=inference.cod_predicted,
                valve_decision=decision,
                anomaly=inference.anomaly_flag,
            )
            session.add(row)
            await session.commit()
    except Exception:
        pass


async def _load_persisted_state():
    """Restore calibration baselines and impact counters from DB."""
    try:
        async with async_session() as session:
            # Load baselines
            result = await session.execute(select(BaselineRow))
            for row in result.scalars():
                from app.schemas import CalibrationBaseline
                bl = CalibrationBaseline(
                    device_id=row.device_id,
                    ph_mean=row.ph_mean, ph_std=row.ph_std,
                    tds_mean=row.tds_mean, tds_std=row.tds_std,
                    turbidity_mean=row.turbidity_mean, turbidity_std=row.turbidity_std,
                    sample_count=row.sample_count, is_complete=row.is_complete,
                )
                calibration.load_baseline(bl)

            # Load impact
            result = await session.execute(select(ImpactRow))
            for row in result.scalars():
                impact.load(row.device_id, row.liters_saved, row.money_saved, row.lake_impact_score)
    except Exception:
        pass


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


@app.get("/api/impact/{device_id}")
async def get_impact(device_id: str):
    return impact.get(device_id)


@app.get("/api/municipal/nodes", response_model=list[NodeSummary])
async def get_municipal_nodes():
    return get_all_node_summaries()


@app.get("/api/nudge/{device_id}", response_model=SustainabilityNudge)
async def get_nudge(device_id: str):
    # Use last known reading or a default
    reading = SensorReading(
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
    """Get recent readings for a device."""
    async with async_session() as session:
        result = await session.execute(
            select(ReadingRow)
            .where(ReadingRow.device_id == device_id)
            .order_by(ReadingRow.id.desc())
            .limit(limit)
        )
        rows = result.scalars().all()
        return [
            {
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "ph": r.ph, "tds": r.tds, "turbidity": r.turbidity,
                "temperature": r.temperature, "bod": r.bod, "cod": r.cod,
                "valve_decision": r.valve_decision, "anomaly": r.anomaly,
            }
            for r in reversed(rows)
        ]
