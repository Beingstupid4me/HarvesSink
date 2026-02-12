This documentation serves as the **Technical Data Contract** and **System Architecture Guide** for the integration of the HarvesSink Edge Device (Arduino) with the Intelligence Layer (FastAPI Server).

---

# HarvesSink: Technical Integration Document (V2.0)
**Project Title:** HarvesSink – AI-Powered Greywater Management  
**Hardware Node:** Arduino Uno (The "Reflex" System)  
**Intelligence Node:** FastAPI + XGBoost (The "Brain")

---

## 1. The Data Contract (Serial JSON API)
The Arduino streams a JSON packet every **1000ms (1Hz)** over Serial at **9600 Baud**.

### Sample Packet:
```json
{"ph":7.21, "tds":560, "turb":1850, "valve":1, "state":2, "progress":100, "base_tds":562, "nudge":1, "conf":0}
```

### Field Definitions for Backend Parsing:
| Key | Type | Description | Usage in Backend |
| :--- | :--- | :--- | :--- |
| `ph` | float | Filtered (EWMA) pH value (0.0-14.0) | Input for XGBoost & Gauge Card |
| `tds` | float | Filtered (EWMA) Total Dissolved Solids (ppm) | Input for XGBoost & Gauge Card |
| `turb` | float | Filtered (EWMA) Turbidity (Relative Units) | Input for XGBoost & Gauge Card |
| `valve` | int | 0: Drain Mode, 1: Harvest Mode | Live Status Banner / Impact Counter |
| `state` | int | 0: Warmup, 1: Calibrating, 2: Operational | UI Status (Spinner, Progress Bar) |
| `progress`| int | 0 to 100 percentage | Calibration Progress Bar |
| `base_tds`| float | The learned "Household Normal" TDS | Display: "Local Baseline" |
| `nudge` | int | 0: Fallback, 1: AI Nudge Active | Reliability Indicator |
| `conf` | int | 0 to 3 (Confidence Counter) | Signal Stability Indicator |

---

## 2. System State Machine (UI Mapping)
The backend should map the `state` integer to the following human-readable states in the frontend:

*   **State 0 (`WARMUP`):** 
    *   *Action:* Arduino is waiting for sensor voltages to stabilize.
    *   *UI:* Show "Stabilizing Sensors..." (Grey/Pulse).
*   **State 1 (`CALIBRATING`):**
    *   *Action:* Arduino is profiling the local tap water chemistry.
    *   *UI:* Activate **Progress Bar** (0-100%). Display: "Learning Local Baseline..."
*   **State 2 (`OPERATIONAL`):**
    *   *Action:* Edge-Intelligence is active. Valve acts on Hybrid logic.
    *   *UI:* Show Gauges and Active Status.

---

## 3. The Multi-Tier Decision Architecture
The decision to harvest water happens at the **Edge (Arduino)** but is validated by the **Brain (Laptop)**.

### Tier 1: The Static Safety Box (Arduino Fallback)
*   **pH Range:** 6.5 – 8.5 (CPCB Standard).
*   **TDS Cap:** < 1000 ppm.
*   **Turbidity Cap:** > 1700 (Clean limit).
*   *Note:* If the water fails these, it is **instantly drained** regardless of AI.

### Tier 2: The Adaptive Nudge (Edge AI)
*   The Arduino calculates a **Z-Score** based on the learned `base_tds` and `stdTDS`.
*   If the current water deviates by **> 3.0 Sigma**, the "Nudge" triggers a DRAIN mode even if the water is technically within "Static" limits.

### Tier 3: Temporal Debouncing (The Splash Guard)
*   The system uses the `conf` (Confidence) counter.
*   It requires **3 consecutive seconds** of "Bad" water to flip the valve.
*   It requires **3 consecutive seconds** of "Good" water to return to harvest.

---

## 4. Server-Side Responsibilities (The Python Agent)

Your FastAPI backend should perform the following tasks upon receiving the JSON packet:

### A. Inference (Soft-Sensing)
1.  **Input:** Take `ph`, `tds`, `turb`, and `temp` (via Weather API).
2.  **Location Inject:** Add One-Hot encoding bits for the selected Bangalore neighborhood (e.g., `STP_Location_Hebbal = 1`).
3.  **Predict:** Load `harvessink_v2.joblib` and predict:
    *   **BOD (Biological Oxygen Demand)**
    *   **COD (Chemical Oxygen Demand)**
    *   **Ammonia Content**
4.  **Display:** Stream these predicted metrics to the **Predicted Cards** on the UI.

### B. Anomaly Detection (Watchdog)
Perform a **Tier 4 Anomaly Check** on the laptop:
*   **Stuck Sensor:** If `tds` variance in the last 60 packets is `0`, flag "Hardware Failure."
*   **Correlation Fault:** If `Turbidity` is high but `TDS` is low, flag "Sensor Conflict."
*   **Municipal Cluster:** Compare local data to simulated neighbors on the map.

### C. The "Kill Switch" (Reverse Handshake)
If the **Inference Model (XGBoost)** detects high BOD/COD that the Arduino's simple logic missed:
*   **Action:** Server sends string `"0"` via Serial to Arduino.
*   **Arduino Response:** Forces `isHarvesting = false` and closes the valve.

---

## 5. Development Strategy for the Coding Agent

When instructing your agent to build the backend/frontend, use this specific checklist:

1.  **Implement Serial Parser:** A thread/task that reads the serial port, cleans the JSON string, and updates a shared `LiveState` object.
2.  **Build Inference Hook:** A function that prepares the feature vector for `joblib.load(model)` including the one-hot location bits.
3.  **Frontend Sync:** Ensure the **Next.js WebSocket** is pushing the full packet (including `state`, `progress`, and `nudge`) so the UI elements react in real-time.
4.  **Simulation Toggle:** Ensure the dashboard can still run the "Simulator" mode when the hardware is disconnected for dev work.

---

### Final Checklist for the Hardware Demo
*   [ ] **Zero-Baseline Test:** Restart Arduino in air. `state` should hit 1, then 2. `valve` should stay 0 (Drain).
*   [ ] **Clean Water Test:** Restart in tap water. `state` should hit 2. `valve` should flip to 1 (Harvest).
*   [ ] **Z-Score Spike:** In tap water, add a pinch of salt. `conf` should hit 3, then `valve` flips to 0.
