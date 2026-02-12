### **System Overview**
HarvesSink is a distributed Edge-AI water management system. It consists of a **Middleware Gateway** (processing real-time sensor streams), an **Inference Engine** (predicting lab-grade metrics), and a **Dual-Persona Interface** (Household vs. Municipal).

---

### **1. The Data Schema (The "Source of Truth")**
The system must handle a JSON packet from the STM32 (or Simulator).
*   **Raw Inputs:** `pH` (0-14), `TDS` (ppm), `Turbidity` (NTU), `Temp` (°C).
*   **System State:** `Valve_Position` (0: Drain, 1: Harvest), `Device_Mode` (Calibration, Active, Fault).
*   **Metadata:** `Device_ID`, `Timestamp`, `GPS_Lat`, `GPS_Long`.

---

### **2. Software Component Requirements**

#### **A. The Middleware Gateway (Python/FastAPI)**
*   **Serial/Socket Listener:** A robust class that handles the incoming stream. It must support a "Simulation Mode" (JSON file/Websocket) and a "Hardware Mode" (Serial/USB).
*   **Stateful Calibration:** logic to store the "Household Baseline."
    *   *Requirement:* Compute Mean and Standard Deviation of the first 50 samples of "Clean" water and store them in a local SQLite database.
*   **Valve Control Logic:** A decision-making function that compares real-time data against the adaptive baseline + hard safety caps (CPCB/WHO standards).

#### **B. The AI Inference Engine (The "Brain")**
*   **Model 1: Soft-Sensor Regressor (BOD/COD Prediction)**
    *   *Function:* Predicts Biological Oxygen Demand (BOD) and Chemical Oxygen Demand (COD).
    *   *Logic:* Use a pre-trained Random Forest or XGBoost model (trained on synthetic data correlating pH, TDS, and Turbidity to organic load).
*   **Model 2: Sensor Health Anomaly Detector**
    *   *Function:* Detects hardware failure (FMEA compliance).
    *   *Logic:* An **Isolation Forest** or simple **Z-Score** detector. If a sensor value is "Stuck" (zero variance) or "Out of Bounds" (pH 19), flag a system fault.
*   **Model 3: LLM Behavioral Agent (RAG-Lite)**
    *   *Function:* Generates "Sustainability Nudges."
    *   *Logic:* Send current water metrics to an LLM (GPT-4o-mini API) with a system prompt: *"You are a water conservation expert. Based on these metrics [pH/TDS], tell the user what they are likely doing (washing dishes/veggies) and how to be more efficient."*

#### **C. Persona 1: Household User Dashboard (React/Next.js + Tailwind)**
*   **Live Metrics:** High-fidelity gauges for pH, TDS, and Turbidity.
*   **The "Impact" Widget:** Real-time counters for "Liters Saved," "Money Saved on Tankers (₹)," and "Lake Impact Score."
*   **Calibration UI:** A wizard-style interface showing the "Learning" progress of the device when first installed.
*   **Education Feed:** AI-generated tips (e.g., "We detected high-phosphate runoff; consider switching detergent brands to protect local lakes").

#### **D. Persona 2: Municipal/Global Monitor (Mapbox/Leaflet)**
*   **Geospatial Heatmap:** A map showing hundreds of nodes (1 real, 49 simulated).
*   **Cluster Analysis:** Logic to detect if a "Zone" is reporting poor water quality simultaneously (indicates a city-wide pipe breach).
*   **Resource Forecasting:** Predictive graph showing how much city-wide water demand decreases if HarvesSink adoption hits 10%.

---

### **3. Production Checklist for the Agent**

#### **Data Integration**
- [ ] Create a `MockSTM32` class that emits realistic time-series data (including noise and spikes).
- [ ] Implement a `SerialBridge` that can swap between the Mock and a real COM port.
- [ ] Set up a **Websocket** or **Server-Sent Events (SSE)** to push data from Backend to Frontend with <200ms latency.

#### **AI & Analytics**
- [ ] Generate a synthetic CSV dataset for training the COD/BOD "Soft Sensor."
- [ ] Train and export the model using `joblib` or `ONNX`.
- [ ] Implement a "Baseline Learning" state where thresholds are calculated locally (Delhi Baseline vs. Manali Baseline).

#### **UI/UX (The Judging View)**
- [ ] **Dark Mode / Industrial Theme:** Use a professional UI library (Shadcn/UI or Aceternity).
- [ ] **State Visualization:** The background or a major UI element should change color based on the water quality (Green for Harvest, Amber for Caution, Red for Drain).
- [ ] **Mobile Responsive:** Must look perfect on a ₹5,000 phone (as per hackathon prompt constraints).

#### **Deployment/Demo Prep**
- [ ] **Simulation Script:** A script that can "replay" a specific scenario (e.g., "The Dishwashing Event," "The Pipe Contamination Event") for the judges.
- [ ] **Local Storage:** Persistent storage of "Liters Saved" so data isn't lost on refresh.

---
