/* HarvesSink – TypeScript types mirroring the backend schemas. */

export interface SensorReading {
  device_id: string;
  timestamp: string;
  ph: number;
  tds: number;
  turbidity: number;
  temperature: number;
  gps_lat: number;
  gps_lng: number;
  valve_position: 0 | 1;
  device_mode: "calibration" | "active" | "fault";
}

export interface InferenceResult {
  bod_predicted: number;
  cod_predicted: number;
  anomaly_flag: boolean;
  anomaly_detail: string;
}

export interface LivePacket {
  reading: SensorReading;
  inference: InferenceResult;
  valve_decision: "harvest" | "caution" | "drain";
  calibration_progress: number;
  liters_saved: number;
  money_saved: number;
  lake_impact_score: number;
}

export interface NodeSummary {
  device_id: string;
  lat: number;
  lng: number;
  quality: "good" | "caution" | "poor";
  ph: number;
  tds: number;
  turbidity: number;
  bod: number;
  cod: number;
}

export interface SustainabilityNudge {
  message: string;
  activity_guess: string;
  tip: string;
}
