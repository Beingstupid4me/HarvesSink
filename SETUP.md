# HarvesSink — Complete Technical Setup & Architecture Guide

> **AI-Powered Greywater Management System**  
> Arduino Uno (Edge / "Reflex") ↔ FastAPI + XGBoost (Intelligence / "Brain") ↔ Next.js (Dashboard)

---

## Quick Start

### Backend
```bash
cd HarvesSink/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
# Runs on http://localhost:8000
```

### Frontend
```bash
cd HarvesSink/frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Hardware Mode
```bash
# In backend/.env:
DATA_SOURCE=serial
SERIAL_PORT=COM3       # or /dev/ttyACM0 on Linux
SERIAL_BAUD=9600       # Must match Arduino Serial.begin(9600)
```

---

## Architecture

```
┌──────────────────┐  Serial 9600 baud  ┌──────────────────────┐  WebSocket   ┌──────────────────┐
│   Arduino Uno    │ ──────────────────► │   FastAPI Backend    │ ◄──────────► │   Next.js        │
│   (Edge Node)    │ ◄── Kill Switch ── │   (Intelligence)     │   REST API   │   (Dashboard)    │
│   3 Sensors      │   Serial "0"       │   :8000              │              │   :3000           │
│   Relay Valve    │                    │                      │              │                   │
└──────────────────┘                    └──────────┬───────────┘              └───────────────────┘
                                                   │
                         ┌─────────────────────────┼────────────────────────────┐
                         │                         │                            │
               ┌─────────▼──────┐       ┌──────────▼────────┐       ┌──────────▼──────────┐
               │  Data Source   │       │  Calibration      │       │  AI Engine          │
               │  Serial/Sim   │       │  + Valve Control   │       │  XGBoost V2 (BOD)   │
               │  + Kill Switch│       │  + Baseline Learn  │       │  Quad-Guard (4-Tier) │
               └────────────────┘       └───────────────────┘       └─────────────────────┘
```

**Persistence:** JSON files in `backend/data/` — baselines, impact, readings. No DB setup needed.  
**Map:** OpenStreetMap via Leaflet — no API key required.  
**Theme:** Light/dark toggle with localStorage persistence.

---

## Hardware: Arduino Uno (version_3.ino)

### Pin Definitions
| Pin | Sensor | Purpose |
|-----|--------|---------|
| `A0` | pH Sensor | Analog voltage → `3.5 × V` formula |
| `A1` | Turbidity Sensor | Analog voltage → polynomial formula |
| `A2` | TDS Sensor | Analog voltage → cubic formula × 0.5 |
| `D7` | Relay Module | `LOW` = Harvest (ON), `HIGH` = Drain (OFF) |

### Conversion Formulas
```
pH       = 3.5 × V_ph
Turbidity = -1120.4 × V² + 5742.3 × V - 4352.9  (clamped ≥ 0)
TDS      = (133.42 × V³ - 255.86 × V² + 857.39 × V) × 0.5
```

### EWMA Smoothing
All readings are smoothed with α = 0.15:
```
filtered = (0.15 × raw) + (0.85 × previous_filtered)
```

### Serial JSON Contract (9600 Baud, 1Hz)
```json
{"ph":7.21, "tds":560, "turb":1850, "valve":1, "state":2, "progress":100, "base_tds":562, "nudge":1}
```

| Key | Type | Range | Description | Backend Mapping |
|-----|------|-------|-------------|-----------------|
| `ph` | float | 0–14 | EWMA-filtered pH | `SensorReading.ph` |
| `tds` | float | 0–2000+ | EWMA-filtered TDS (ppm) | `SensorReading.tds` |
| `turb` | float | 0–5000 | EWMA-filtered turbidity (raw ADC units) | `SensorReading.turbidity` |
| `valve` | int | 0/1 | 0=Drain, 1=Harvest | `SensorReading.edge_valve` + `valve_position` |
| `state` | int | 0/1/2 | 0=Warmup, 1=Calibrating, 2=Operational | `SensorReading.edge_state` + `device_mode` |
| `progress` | int | 0–100 | Arduino calibration % | `SensorReading.edge_progress` |
| `base_tds` | float | — | Arduino's learned TDS baseline | `SensorReading.edge_base_tds` |
| `nudge` | int | 0/1 | Arduino adaptive nudge active | `SensorReading.edge_nudge` |

### State Machine
```
WARMUP (state=0)     → 5 seconds sensor stabilization
    ↓
CALIBRATING (state=1) → 40 samples to learn base_tds ± std_tds
    ↓
OPERATIONAL (state=2) → Edge intelligence active, hybrid valve logic
```

### Multi-Tier Edge Decision (Arduino-Side)

**Layer 1 — Static Safety Box (Always Active):**
- pH: 6.5–8.5 (CPCB Standard)
- TDS: < 1000 ppm
- Turbidity: > 1700 (raw ADC units = clean)

**Layer 2 — Adaptive Nudge (After Calibration):**
- Z-Score against learned `base_tds` ± `std_tds`
- Threshold: 3.0σ (only if `std_tds > 2.0` to avoid false positives)

**Layer 3 — Temporal Debounce (Splash Guard):**
- Requires 3 consecutive "bad" readings to flip valve to DRAIN
- Requires 3 consecutive "good" readings to return to HARVEST
- Tracked by internal `confidenceCounter` (0–3)

---

## Server: FastAPI Backend

### Data Flow Pipeline
```
Serial/Sim → Parse → Calibration → XGBoost Inference → Quad-Guard → Valve Decision → Kill Switch → WebSocket
```

### Modules

| Module | File(s) | Description |
|--------|---------|-------------|
| **Config** | `app/config.py`, `.env` | Pydantic Settings — data source, serial port, safety caps, kill thresholds |
| **Schemas** | `app/schemas.py` | SensorReading (with edge fields), LivePacket, InferenceResult, CalibrationBaseline |
| **Data Sources** | `app/sources/` | `base.py` (ABC), `serial_source.py` (Arduino parser + write), `simulator.py` (mock with state machine), `bridge.py` (factory) |
| **Serial Parser** | `app/sources/serial_source.py` | Remaps Arduino JSON keys: `turb→turbidity`, `valve→edge_valve`, `state→edge_state`, etc. Adds `write()` for kill-switch |
| **Simulator** | `app/sources/simulator.py` | Full Arduino state machine simulation: warmup → calibrating → operational. 5 scenarios. Responds to kill-switch via `write("0")` |
| **Calibration** | `app/calibration.py` | Server-side baseline learning (50 samples, mean ± std for pH/TDS/Turbidity). Persisted to JSON |
| **Valve Controller** | `app/calibration.py` | Hard safety caps (WHO/CPCB) + adaptive 2.5σ baseline deviation → harvest/caution/drain |
| **AI — Soft-Sensor** | `app/ai/inference.py` | XGBoost V2 (`harvessink_bod_v2.joblib`) predicts BOD, COD, Ammonia from pH + TDS/Turbidity + temperature defaults + Bangalore STP one-hot encoding |
| **AI — Quad-Guard** | `app/ai/anomaly.py` | 4-tier anomaly detection (see below) |
| **Impact Tracker** | `app/impact.py` | Liters saved (0.25L/harvest), money saved (₹0.50/L), lake impact. Persisted to JSON |
| **Municipal Nodes** | `app/municipal.py` | Simulated N-node network for map view (configurable via `SIM_NUM_NODES`) |
| **LLM Nudge** | `app/ai/llm_nudge.py` | Rule-based sustainability tips. Optional GPT-4o-mini via `LLM_ENABLED=true` |
| **Persistence** | `app/database.py` | JSON file I/O: `backend/data/{baselines,impact,readings}.json` |

### Quad-Guard™ 4-Tier Anomaly Detection

| Tier | Name | Trigger | Severity | Action |
|------|------|---------|----------|--------|
| T1 | Electronic Boundary | pH < 1 or > 13, TDS > 4500, Turbidity < 0 | CRITICAL | DRAIN |
| T2 | Signal Integrity | σ = 0 across 60-sample buffer (stuck sensor) | WARNING | CAUTION |
| T3 | Local Z-Score | Any sensor > 4.5σ from calibrated baseline | CRITICAL | DRAIN |
| T4 | Cross-Sensor Correlation | Turbidity > 50 + TDS < 30 (physics impossible) | CRITICAL | DRAIN |

### Kill-Switch (Reverse Handshake)
When the XGBoost model predicts:
- **BOD > 30 mg/L** or **COD > 250 mg/L**
- AND the Arduino is still harvesting (`edge_valve == 1`)

The server sends `"0"` via serial to force the Arduino's relay to DRAIN.
- Configurable thresholds: `BOD_KILL_THRESHOLD`, `COD_KILL_THRESHOLD` in `.env`
- UI shows 🛑 "Kill-switch active" in the valve status banner

### XGBoost V2 Model Details
- **File:** `app/ai/saved_models/harvessink_bod_v2.joblib`
- **Architecture:** `MultiOutputRegressor` wrapping 3 `XGBRegressor` estimators
- **Training Data:** Bangalore STP data (9 locations: Hebbal, Jakkur, Madiwala, etc.)
- **14 Input Features:** `Temperature (Avg)`, `Max Temperature`, `Min Temperature`, `pH`, `TSS`, + 9 one-hot `STP_Location_*` columns
- **3 Outputs:** `[COD, BOD, Ammonia]`
- **Sensor Mapping:** `pH → pH`, `Turbidity → TSS` (proxy), Temperature → Bangalore annual averages (27/32/22°C)
- **Fallback:** Deterministic formula if model file missing: `BOD = 0.8×Turb + 0.02×TDS + 1.5×|pH-7|`, `COD = BOD × 2.2`

---

## Frontend: Next.js 14 + React 18

### Pages

| Route | Description |
|-------|-------------|
| `/` | Household dashboard — real-time sensor data, gauges, valve status, Quad-Guard, edge node info, impact |
| `/municipal` | Municipal dashboard — N-node map, cluster analysis, zone stats |

### Components

| Component | File | Description |
|-----------|------|-------------|
| **HouseholdDashboard** | `HouseholdDashboard.tsx` | Main dashboard: connection status, calibration bar, valve banner, gauges, metrics grid, chart, nudge |
| **CalibrationBar** | `CalibrationBar.tsx` | Maps Arduino state machine: warmup (pulsing gray) → calibrating (blue progress bar) → operational |
| **ValveStatus** | `ValveStatus.tsx` | Harvest/Caution/Drain banner. Shows kill-switch override, anomaly, and Arduino nudge trigger status |
| **QuadGuard** | `QuadGuard.tsx` | Compact card with 4-tier anomaly status (colored dots), severity label, fault detail |
| **GaugeCard** | `GaugeCard.tsx` | pH, TDS, Turbidity gauges with safe-range indicators |
| **ScenarioSwitcher** | `ScenarioSwitcher.tsx` | Emoji buttons to switch simulator scenarios (clean, dishwashing, contamination, etc.) |
| **TimeSeriesChart** | `TimeSeriesChart.tsx` | Recharts line chart (pH, TDS, Turbidity) rolling 120-packet history |
| **NudgeCard** | `NudgeCard.tsx` | Sustainability tips from LLM/rule-based backend |
| **MapView** | `MapView.tsx` | Leaflet + OpenStreetMap — circle markers with quality-colored popups |
| **ClusterAnalysis** | `ClusterAnalysis.tsx` | Zone-based clustering + contamination detection |
| **MunicipalDashboard** | `MunicipalDashboard.tsx` | Map + cluster analysis + summary stats |

### UI Features
- **Theme:** Light/dark toggle with CSS custom properties + localStorage persistence
- **Responsive:** Mobile-first grid layouts (1→2→3→4 columns)
- **Edge Node Card:** Shows Arduino-side decisions: valve state, nudge active/triggered, TDS baseline, confidence counter
- **Kill-Switch Indicator:** Red banner when server overrides Arduino valve
- **Real-time:** WebSocket with auto-reconnect (2s backoff), 120-packet rolling history

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/api/status` | Data source + connection info |
| WS | `/ws/live` | Live sensor stream (JSON packets via WebSocket) |
| GET | `/api/calibration/{device_id}` | Calibration progress + baseline |
| POST | `/api/calibration/reset/{device_id}` | Reset calibration — triggers re-learning |
| GET | `/api/impact/{device_id}` | Liters/money/lake counters |
| GET | `/api/municipal/nodes` | All node summaries for map |
| GET | `/api/nudge/{device_id}` | Sustainability tip |
| POST | `/api/scenario/{name}` | Switch simulator scenario |
| GET | `/api/history/{device_id}?limit=100` | Recent readings from JSON store |

---

## Decision Architecture: Edge vs Server

The system runs **parallel decision engines** on both the Arduino and the server. The server's decision is authoritative.

| Layer | Where | Logic | Override? |
|-------|-------|-------|-----------|
| Static Safety Box | Arduino | pH 6.5–8.5, TDS < 1000, Turb > 1700 | — |
| Adaptive Nudge | Arduino | Z-Score > 3σ from learned baseline | — |
| Temporal Debounce | Arduino | 3 consecutive bad/good readings | — |
| Safety Caps | Server | pH 6.5–8.5, TDS < 500, Turb < 5 NTU | Overrides Arduino |
| Baseline Deviation | Server | > 2.5σ from server baseline | Overrides Arduino |
| Quad-Guard T1–T4 | Server | Boundary + Signal + Z-Score + Cross-Sensor | Forces drain/caution |
| Kill-Switch | Server | XGBoost BOD > 30 or COD > 250 | Sends serial "0" to Arduino |

---

## Configuration Reference (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATA_SOURCE` | `simulation` | `simulation` or `serial` |
| `SERIAL_PORT` | `COM3` | COM port for Arduino |
| `SERIAL_BAUD` | `9600` | Must match `Serial.begin(9600)` in Arduino |
| `SIM_INTERVAL_MS` | `500` | Simulator reading interval (ms) |
| `SIM_NUM_NODES` | `50` | Number of simulated municipal nodes |
| `CALIBRATION_SAMPLE_COUNT` | `50` | Server-side calibration samples |
| `PH_MIN` / `PH_MAX` | `6.5` / `8.5` | Safety caps |
| `TDS_MAX` | `500` | ppm safety cap |
| `TURBIDITY_MAX` | `5.0` | NTU safety cap |
| `BOD_KILL_THRESHOLD` | `30.0` | mg/L — trigger kill-switch |
| `COD_KILL_THRESHOLD` | `250.0` | mg/L — trigger kill-switch |
| `LLM_ENABLED` | `false` | Enable GPT-4o-mini nudges |
| `OPENAI_API_KEY` | — | Required if LLM_ENABLED=true |

---

## Environment

- **Python:** 3.10 (venv at project root `.venv`)
- **Node:** Next.js 14, React 18, Tailwind CSS 3, TypeScript 5
- **Arduino:** Arduino Uno, Arduino IDE, version_3.ino
- **Model:** XGBoost ≥ 2.0.0, scikit-learn, joblib
- **Map:** Leaflet 1.9.4 + OpenStreetMap (no API key)

---

## Hardware Demo Checklist

- [ ] **Zero-Baseline Test:** Restart Arduino in air. `state` hits 0 → 1 → 2. `valve` stays 0 (Drain).
- [ ] **Clean Water Test:** Restart in tap water. `state` hits 2. `valve` flips to 1 (Harvest).
- [ ] **Z-Score Spike:** In tap water, add salt. `conf` → 3, `valve` flips to 0 (Drain).
- [ ] **Kill-Switch Test:** Set contamination scenario. BOD > 30 → Server sends "0" → Arduino drains.
- [ ] **Quad-Guard Test:** Set pipe_breach scenario. T1/T3 trigger → Dashboard shows CRITICAL.
- [ ] **Calibration Reset:** Click Recalibrate → Progress bar restarts → New baseline learned.
