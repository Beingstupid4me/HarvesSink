#include <math.h>

/************ PIN DEFINITIONS ************/
#define PH_PIN     A0
#define TURB_PIN   A1
#define TDS_PIN    A2
#define RELAY_PIN  7   

/************ SYSTEM CONFIGURATION ************/
const float ALPHA = 0.15;            // EWMA Filter constant (lower = smoother)
const int CALIB_SAMPLES = 30;        // 30 seconds of data for local baseline
const float SIGMA_THRESHOLD = 2.5;   // Z-Score threshold (Sensitivity)
const int CONFIDENCE_LIMIT = 3;      // Seconds of sustained contamination needed to flip
const unsigned long WARMUP_MS = 5000; // 5s sensor stabilization

/************ STATE MACHINE ************/
enum SystemState { WARMUP, CALIBRATING, OPERATIONAL, FAULT };
SystemState currentState = WARMUP;

/************ GLOBAL VARIABLES ************/
float f_ph = 7.0, f_tds = 0, f_turb = 0; // Filtered values
float baseTDS = 0, stdTDS = 0;           // Learned baseline
float tdsSum = 0, tdsSqSum = 0;          // Statistical accumulators
int sampleCount = 0;
int confidenceCounter = 0;               // For temporal debouncing
bool isHarvesting = false;               // Valve state

void setup() {
  Serial.begin(9600);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Default to DRAIN (Safety First)
}

void loop() {
  // 1. RAW DATA ACQUISITION
  float v_ph   = analogRead(PH_PIN)   * (5.0 / 1023.0);
  float v_turb = analogRead(TURB_PIN) * (5.0 / 1023.0);
  float v_tds  = analogRead(TDS_PIN)  * (5.0 / 1023.0);

  // 2. SENSOR CONVERSIONS
  float raw_ph = 3.5 * v_ph;
  float raw_turb = -1120.4 * pow(v_turb, 2) + 5742.3 * v_turb - 4352.9;
  if (raw_turb < 0) raw_turb = 0;
  float raw_tds = (133.42 * pow(v_tds, 3) - 255.86 * pow(v_tds, 2) + 857.39 * v_tds) * 0.5;

  // 3. EWMA SIGNAL FILTERING (Noise Reduction)
  f_ph   = (ALPHA * raw_ph)   + ((1.0 - ALPHA) * f_ph);
  f_tds  = (ALPHA * raw_tds)  + ((1.0 - ALPHA) * f_tds);
  f_turb = (ALPHA * raw_turb) + ((1.0 - ALPHA) * f_turb);

  // 4. STATE MACHINE & EDGE LOGIC
  switch (currentState) {
    
    case WARMUP:
      if (millis() > WARMUP_MS) currentState = CALIBRATING;
      break;

    case CALIBRATING:
      tdsSum += f_tds;
      tdsSqSum += (f_tds * f_tds);
      sampleCount++;
      if (sampleCount >= CALIB_SAMPLES) {
        float mean = tdsSum / CALIB_SAMPLES;
        float variance = (tdsSqSum / CALIB_SAMPLES) - (mean * mean);
        baseTDS = mean;
        stdTDS = sqrt(max(1.0, variance)); // Avoid division by zero
        currentState = OPERATIONAL;
      }
      break;

    case OPERATIONAL:
      // A. Calculate Z-Score (Statistical Deviation)
      float z_score = abs(f_tds - baseTDS) / stdTDS;
      
      // B. Determine if water is "Bad" right now
      bool currentlyBad = (z_score > SIGMA_THRESHOLD) || (f_ph < 6.0) || (f_ph > 9.5) || (f_tds > 1200);

      // C. Confidence Engine (Temporal Debouncing)
      // Prevents "Relay Chatter" from accidental splashes
      if (currentlyBad) {
        confidenceCounter++;
        if (confidenceCounter >= CONFIDENCE_LIMIT) {
          confidenceCounter = CONFIDENCE_LIMIT;
          isHarvesting = false; 
        }
      } else {
        confidenceCounter--;
        if (confidenceCounter <= 0) {
          confidenceCounter = 0;
          isHarvesting = true;
        }
      }
      break;
      
    case FAULT:
      isHarvesting = false;
      break;
  }

  // 5. EXTERNAL OVERRIDE (Listen to Laptop Brain)
  // If the XGBoost model on the laptop detects something the Arduino missed
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == '0') isHarvesting = false; // Forced Drain
  }

  // 6. ACTUATION
  // Active LOW relay: LOW = Relay ON (Storage), HIGH = Relay OFF (Drain)
  if (currentState == OPERATIONAL && isHarvesting) {
    digitalWrite(RELAY_PIN, LOW);
  } else {
    digitalWrite(RELAY_PIN, HIGH);
  }

  // 7. TELEMETRY OUTPUT (Production JSON)
  // Every field your FastAPI backend needs for the Gauges and ML
  Serial.print("{\"ph\":"); Serial.print(f_ph, 2);
  Serial.print(",\"tds\":"); Serial.print(f_tds, 1);
  Serial.print(",\"turb\":"); Serial.print(f_turb, 1);
  Serial.print(",\"valve\":"); Serial.print(isHarvesting ? 1 : 0);
  Serial.print(",\"state\":"); Serial.print((int)currentState);
  Serial.print(",\"progress\":"); Serial.print((sampleCount * 100) / CALIB_SAMPLES);
  Serial.print(",\"base_tds\":"); Serial.print(baseTDS, 0);
  Serial.print(",\"conf\":"); Serial.print(confidenceCounter);
  Serial.println("}");

  delay(1000); // 1Hz Telemetry
}