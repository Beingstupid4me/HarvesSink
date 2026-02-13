# 🌊 HarvesSink

### **The Intelligent Edge-AI Water Management System**
**Autonomous Edge (Arduino) ↔ Multi-Output ML (XGBoost) ↔ Industrial Dashboard (Next.js)**

---

## 📌 Project Vision
Cities like Bengaluru and Chennai are facing extreme water stress, yet nearly 30% of domestic freshwater is flushed away as greywater. Existing recycling systems are often "dumb" mechanical diverters that cannot distinguish between safe reusable water and toxic chemical runoff.

**HarvesSink** is a decentralized, AI-powered solution. It performs **"Source-Level Load Shedding"** for urban infrastructure. By identifying and harvesting clean water at the kitchen sink before it hits the overburdened sewage system, we protect our dying lakes and provide households with a resilient, secondary water source.

---

## 🏗️ "Reflex vs. Brain" Architecture

HarvesSink operates on a dual-layer intelligence model to ensure 100% uptime and industrial reliability.

### **1. The Reflex Layer (Autonomous Edge)**
**Hardware:** Arduino Uno  
**Function:** Handles 1Hz real-time sensing and immediate actuation.
*   **EWMA Smoothing:** Utilizes Exponentially Weighted Moving Averages to filter out electrical jitter from cheap analog sensors.
*   **Z-Score "Nudge":** Locally learns the "Household Baseline" for tap water and uses statistical Z-score analysis to detect sudden chemical anomalies.
*   **Temporal Debouncing:** A 3-second "Confidence Counter" prevents relay chatter by ignoring transient soap splashes or bubbles.
*   **Autonomy:** If the central server goes offline, the Arduino continues to protect the reservoir using its local intelligence.

### **2. The Brain Layer (Intelligence Hub)**
**Backend:** FastAPI (Python)  
**Function:** Complex inference, data persistence, and municipal networking.
*   **XGBoost V2 Brain:** A Multi-Output Regressor trained on **1,300+ days of Bengaluru Sewage Treatment Plant (STP) data.**
*   **Soft-Sensing:** Predicts lab-grade metrics including **BOD (Biological Oxygen Demand)**, **COD (Chemical Oxygen Demand)**, and **Ammonia** using only basic analog sensors.
*   **Location Awareness:** Uses One-Hot encoding to adapt its chemical predictions based on the specific industrial profile of the neighborhood (e.g., Hebbal, Jakkur, or Madiwala).

---

## 🛡️ Quad-Guard™ 4-Tier Anomaly Detection

To comply with Industrial FMEA (Failure Modes and Effects Analysis) standards, the system features a 4-tier safety watchdog:

1.  **Tier 1: Boundary Check** — Detects catastrophic hardware failure (pH < 1 or > 13).
2.  **Tier 2: Signal Integrity** — Identifies "Stuck" or frozen sensors via zero-variance detection.
3.  **Tier 3: Local Z-Score** — Flags water that deviates more than 4.5σ from the household's learned baseline.
4.  **Tier 4: Correlation Check** — Detects "Impossible Physics" (e.g., high turbidity with low TDS) to signal required maintenance.

---

## 🌍 Municipal Digital Twin
The platform features a **Municipal Monitor** that aggregates data from a simulated 50-node network across the city.
*   **Heatmapping:** Real-time visualization of water quality clusters.
*   **Crisis Detection:** Automatically flags neighborhood-wide contamination events, such as pipeline breaches or illegal industrial dumping, before they reach the main STPs.

---


## 🚀 Quick Start Guide

### 1. Backend Environment
Navigate to the `backend` folder and install dependencies:
`pip install -r requirements.txt`  
Update the `.env` file to set `DATA_SOURCE=serial` and your specific `SERIAL_PORT` (e.g., COM3).  
Start the server: `python -m uvicorn app.main:app --reload`

### 2. Frontend Environment
Navigate to the `frontend` folder and install dependencies:
`npm install`  
Launch the dashboard: `npm run dev`

---

## 🧪 Demo Scenarios
1.  **Phase 1 (Learning):** Start in clean water. Watch the dashboard learn your "Local Baseline."
2.  **Phase 2 (The Nudge):** Add soap. Watch the "Confidence Counter" confirm the event and trigger a DRAIN.
3.  **Phase 3 (The Brain):** View the predicted BOD/COD cards to see how the XGBoost model "sees" the chemical toxicity.
4.  **Phase 4 (City Scale):** Toggle the Municipal map to see how your individual sink contributes to city-wide resilience.

---

> **HarvesSink** represents a transition from a TRL-3 Proof of Concept to a **TRL-5 Subsystem-Validated Prototype**, engineered for the realities of the modern water-stressed city.
