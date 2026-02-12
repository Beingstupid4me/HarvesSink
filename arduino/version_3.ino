#include <math.h>

/************ PIN DEFINITIONS ************/
#define PH_PIN     A0
#define TURB_PIN   A1
#define TDS_PIN    A2
#define RELAY_PIN  7   

/************ SYSTEM CONFIGURATION ************/
const float ALPHA = 0.15;            
const int CALIB_SAMPLES = 40;        
const float SIGMA_THRESHOLD = 3.0;   
const int CONFIDENCE_LIMIT = 3;      
const unsigned long WARMUP_MS = 5000; 

/************ STATE MACHINE ************/
enum SystemState { WARMUP, CALIBRATING, OPERATIONAL, FAULT };
SystemState currentState = WARMUP;

/************ GLOBAL VARIABLES ************/
float f_ph = 7.0, f_tds = 0, f_turb = 0; 
float baseTDS = 0, stdTDS = 0;           
float tdsSum = 0, tdsSqSum = 0;          
int sampleCount = 0;
int confidenceCounter = 0;               
bool isHarvesting = false;               

void setup() {
  Serial.begin(9600);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Default to DRAIN
}

void loop() {
  // 1. DATA ACQUISITION
  int adc_ph   = analogRead(PH_PIN);
  int adc_turb = analogRead(TURB_PIN);
  int adc_tds  = analogRead(TDS_PIN);

  float v_ph   = adc_ph   * (5.0 / 1023.0);
  float v_turb = adc_turb * (5.0 / 1023.0);
  float v_tds  = adc_tds  * (5.0 / 1023.0);

  // 2. FORMULAS
  float raw_ph = 3.5 * v_ph;
  float raw_turb = -1120.4 * pow(v_turb, 2) + 5742.3 * v_turb - 4352.9;
  if (raw_turb < 0) raw_turb = 0;
  float raw_tds = (133.42 * pow(v_tds, 3) - 255.86 * pow(v_tds, 2) + 857.39 * v_tds) * 0.5;

  // 3. SMOOTHING (EWMA)
  f_ph   = (ALPHA * raw_ph)   + ((1.0 - ALPHA) * f_ph);
  f_tds  = (ALPHA * raw_tds)  + ((1.0 - ALPHA) * f_tds);
  f_turb = (ALPHA * raw_turb) + ((1.0 - ALPHA) * f_turb);

  // 4. HYBRID DECISION LOGIC
  // LAYER 1: STATIC FALLBACK (Always Active)
  bool ph_static_ok   = (f_ph >= 6.5 && f_ph <= 8.5);
  bool tds_static_ok  = (f_tds <= 1000); 
  bool turb_static_ok = (f_turb > 1700); 
  bool isStaticClean  = ph_static_ok && tds_static_ok && turb_static_ok;

  // LAYER 2: ADAPTIVE NUDGE (Active only after Calibration)
  bool nudge_pass = true; // Default to TRUE (Fallback mode)

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
        stdTDS = sqrt(max(0.0, variance)); 
        currentState = OPERATIONAL;
      }
      break;

    case OPERATIONAL:
      // If stdTDS is very low (insignificant), we ignore the nudge to avoid false positives
      if (stdTDS > 2.0) { 
        float z_score = abs(f_tds - baseTDS) / stdTDS;
        nudge_pass = (z_score < SIGMA_THRESHOLD);
      }
      break;
  }

  // 5. COMBINED DECISION
  // We use the static clean check. If we are Operational, we also check the nudge.
  bool finalDecision = isStaticClean && nudge_pass;

  // Confidence Engine
  if (!finalDecision) {
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

  // 6. ACTUATION
  if (isHarvesting) {
    digitalWrite(RELAY_PIN, LOW); // ON
  } else {
    digitalWrite(RELAY_PIN, HIGH); // OFF
  }

  // 7. TELEMETRY
  Serial.print("{\"ph\":"); Serial.print(f_ph, 2);
  Serial.print(",\"tds\":"); Serial.print(f_tds, 0);
  Serial.print(",\"turb\":"); Serial.print(f_turb, 0);
  Serial.print(",\"valve\":"); Serial.print(isHarvesting ? 1 : 0);
  Serial.print(",\"state\":"); Serial.print((int)currentState);
  Serial.print(",\"progress\":"); Serial.print((sampleCount * 100) / CALIB_SAMPLES);
  Serial.print(",\"base_tds\":"); Serial.print(baseTDS, 0);
  Serial.print(",\"nudge\":"); Serial.print(nudge_pass ? 1 : 0);
  Serial.println("}");

  delay(1000); 
}