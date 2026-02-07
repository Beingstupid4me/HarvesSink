# HarvesSink — Setup & Status Tracker

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

### Optional: Train the ML model (not required — formula fallback is active)
```bash
cd HarvesSink/backend
python -m app.ai.train_model
# Generates synthetic CSV + exports Random Forest to app/ai/saved_models/
```

---

## Architecture

```
┌──────────────┐    WebSocket /ws/live     ┌──────────────────┐
│   Next.js    │◄──────────────────────────│   FastAPI         │
│   Frontend   │    REST /api/*            │   Backend         │
│  :3000       │──────────────────────────►│  :8000            │
└──────────────┘                           └────────┬─────────┘
                                                    │
                              ┌──────────────────────┼──────────────────┐
                              │                      │                  │
                    ┌─────────▼──────┐   ┌───────────▼────┐   ┌────────▼───────┐
                    │  Data Source    │   │  Calibration   │   │  AI Engine     │
                    │  (Sim/Serial)  │   │  + Valve Ctrl  │   │  (BOD/COD +    │
                    │                │   │                │   │   Anomaly)     │
                    └────────────────┘   └────────────────┘   └────────────────┘
```

---

## Implementation Status

### ✅ Backend — Complete & Running

| Module | File(s) | Status | Notes |
|--------|---------|--------|-------|
| **Config** | `app/config.py`, `.env.example` | ✅ Done | Reads from `.env`, Pydantic Settings |
| **Schemas** | `app/schemas.py` | ✅ Done | SensorReading, LivePacket, NodeSummary, etc. |
| **Database** | `app/database.py` | ✅ Done | SQLite + async SQLAlchemy (readings, baselines, impact) |
| **Data Source — Simulator** | `app/sources/simulator.py` | ✅ Done | MockSTM32 with 5 scenarios (clean, dishwashing, contamination, etc.) |
| **Data Source — Serial** | `app/sources/serial_source.py` | ✅ Done | Reads JSON over COM/USB. Swap via `DATA_SOURCE=serial` in `.env` |
| **Data Source — Bridge** | `app/sources/bridge.py` | ✅ Done | Factory pattern — one config flag to switch Sim↔Serial |
| **Calibration Engine** | `app/calibration.py` | ✅ Done | Collects 50 samples → computes per-device baseline (mean ± σ) |
| **Valve Controller** | `app/calibration.py` | ✅ Done | Hard caps (WHO/CPCB) + adaptive 2.5σ threshold → harvest/caution/drain |
| **AI — BOD/COD Soft-Sensor** | `app/ai/inference.py` | ✅ Done | Formula fallback active. Swap for trained RF model when ready |
| **AI — Anomaly Detector** | `app/ai/inference.py` | ✅ Done | Z-score based + stuck-sensor detection |
| **AI — Model Training** | `app/ai/train_model.py` | ✅ Done | Generates synthetic CSV + trains Random Forest. Run when needed |
| **Impact Tracker** | `app/impact.py` | ✅ Done | Liters saved, money saved (₹), lake impact score |
| **Municipal Nodes** | `app/municipal.py` | ✅ Done | 50 simulated nodes spread across Delhi for map view |
| **LLM Nudge (RAG-Lite)** | `app/ai/llm_nudge.py` | ✅ Stub | Falls back to rule-based tips. Set `LLM_ENABLED=true` + API key to activate |
| **FastAPI App** | `app/main.py` | ✅ Done | WebSocket streaming, REST endpoints, scenario control |

### ✅ Frontend — Complete & Running

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| **Shell / Nav** | `page.tsx` | ✅ Done | Dual-persona toggle (Household ↔ Municipal) |
| **Layout** | `layout.tsx`, `globals.css` | ✅ Done | Dark theme, Inter + JetBrains Mono fonts |
| **WebSocket Hook** | `hooks/useLiveStream.ts` | ✅ Done | Auto-reconnect, rolling 120-packet history |
| **API Utils** | `lib/api.ts`, `lib/types.ts` | ✅ Done | Typed fetch helpers, mirrors backend schemas |
| **Gauge Cards** | `GaugeCard.tsx` | ✅ Done | pH, TDS, Turbidity, Temp with safe-range indicators + glow |
| **Valve Status** | `ValveStatus.tsx` | ✅ Done | Green/Amber/Red banner with anomaly override |
| **Calibration Bar** | `CalibrationBar.tsx` | ✅ Done | Progress bar during baseline learning |
| **Impact Widget** | `ImpactWidget.tsx` | ✅ Done | Liters saved, ₹ saved, Lake Impact counters |
| **Time-Series Chart** | `TimeSeriesChart.tsx` | ✅ Done | Recharts line chart (pH, TDS, Turbidity) |
| **Scenario Switcher** | `ScenarioSwitcher.tsx` | ✅ Done | Switch simulator scenarios for demo/judging |
| **Nudge Card** | `NudgeCard.tsx` | ✅ Done | Shows sustainability tips from backend |
| **Household Dashboard** | `HouseholdDashboard.tsx` | ✅ Done | Assembles all household widgets |
| **Map View** | `MapView.tsx` | ✅ Done | Mapbox GL with quality-colored markers (fallback if no token) |
| **Cluster Analysis** | `ClusterAnalysis.tsx` | ✅ Done | Zone-based clustering, contamination event detection |
| **Municipal Dashboard** | `MunicipalDashboard.tsx` | ✅ Done | Map + cluster analysis + summary stats |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/api/status` | Data source + connection info |
| WS | `/ws/live` | Live sensor stream (JSON packets) |
| GET | `/api/calibration/{device_id}` | Calibration progress + baseline |
| GET | `/api/impact/{device_id}` | Liters/money/lake counters |
| GET | `/api/municipal/nodes` | All 50 node summaries for map |
| GET | `/api/nudge/{device_id}` | Sustainability tip |
| POST | `/api/scenario/{name}` | Switch simulator scenario |
| GET | `/api/history/{device_id}?limit=100` | Recent readings from DB |

---

## What's Left / Nice-to-Have

| Item | Priority | Notes |
|------|----------|-------|
| Train actual RF model | Low | Run `python -m app.ai.train_model`. Formula fallback works fine |
| LLM nudge (GPT-4o-mini) | Low | Set `LLM_ENABLED=true` + `OPENAI_API_KEY` in `.env`. Rule-based fallback works |
| Mapbox token | Medium | Get free token at mapbox.com → set `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local` |
| Persist calibration to DB on completion | Low | Currently in-memory only; resets on restart |
| Persist impact counters to DB | Low | Same — resets on restart |
| Mobile responsive polish | Medium | Layout is responsive, but gauge sizing could improve on small screens |
| Resource Forecasting chart (Municipal) | Low | Roadmap item — predictive adoption graph |
| Real STM32 integration | When hardware ready | Just set `DATA_SOURCE=serial` + `SERIAL_PORT=COM3` in `.env` |

---

## Environment

- **Python:** 3.10 (venv at `C:\Users\amart\OneDrive\Desktop\Code\.venv`)
- **Node:** (whatever is installed) — Next.js 14
- **DB:** SQLite (auto-created at `backend/harvessink.db`)
- **Run Python:** `C:/Users/amart/OneDrive/Desktop/Code/.venv/Scripts/python.exe`
- **Run uvicorn:** `python -m uvicorn app.main:app --reload` (from backend dir, with venv active)
