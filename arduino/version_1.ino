/************ PIN DEFINITIONS ************/
#define PH_PIN     A0
#define TURB_PIN   A1
#define TDS_PIN    A2
#define RELAY_PIN  7   // Relay IN pin

/************ SETUP ************/
void setup() {
  Serial.begin(9600);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);   // Relay OFF (most modules are active LOW)

  Serial.println("Water Quality System Started");
}

/************ LOOP ************/
void loop() {

  // -------- RAW ADC READINGS --------
  int adc_ph   = analogRead(PH_PIN);
  int adc_turb = analogRead(TURB_PIN);
  int adc_tds  = analogRead(TDS_PIN);

  // -------- ADC TO VOLTAGE (UNO: 0–5V, 10-bit) --------
  float v_ph   = adc_ph   * (5.0 / 1023.0);
  float v_turb = adc_turb * (5.0 / 1023.0);
  float v_tds  = adc_tds  * (5.0 / 1023.0);

  // -------- SENSOR CONVERSIONS --------

  // pH conversion (typical module approximation)
  float pH = 3.5 * v_ph;

  // Turbidity (NTU approximation)
  float turb = -1120.4 * v_turb * v_turb
               + 5742.3 * v_turb
               - 4352.9;
  if (turb < 0) turb = 0;

  // TDS (ppm – Gravity style formula)
  float tds = (133.42 * v_tds * v_tds * v_tds
             - 255.86 * v_tds * v_tds
             + 857.39 * v_tds) * 0.5;


  bool ph_ok   = (pH >= 6.5 && pH <= 8.0);
  bool tds_ok  = (tds >= 50 && tds <= 700);
  bool turb_ok = (turb > 1800);

  if (ph_ok && tds_ok && turb_ok) {

    digitalWrite(RELAY_PIN, LOW);   // STORAGE
    Serial.println("STORAGE TANK");

  } else {

    digitalWrite(RELAY_PIN, HIGH);  // DRAIN
    Serial.println("DRAIN");
  }

  // // -------- DECISION LOGIC --------
  // if (tds < 1000 &&
  //     pH >= 6.5 && pH <= 8.5 &&
  //     turb < 20) {

  //   digitalWrite(RELAY_PIN, LOW);    // Relay ON
  //   Serial.println("STORAGE TANK");

  // } else {

  //   digitalWrite(RELAY_PIN, HIGH);   // Relay OFF
  //   Serial.println("DRAIN");
  // }

  // -------- DEBUG OUTPUT --------
  Serial.print("pH: ");
  Serial.print(pH, 2);
  Serial.print(" | TDS: ");
  Serial.print(tds, 0);
  Serial.print(" ppm | Turb: ");
  Serial.print(turb, 1);
  Serial.println(" NTU");

  Serial.println("--------------------------------");

  delay(2000);
}