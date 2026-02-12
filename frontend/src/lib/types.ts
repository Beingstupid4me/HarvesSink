/* HarvesSink – TypeScript types mirroring the backend schemas. */

export interface SensorReading {
  device_id: string;
  timestamp: string;
  ph: number;
  tds: number;
  turbidity: number;
  gps_lat: number;
  gps_lng: number;
  valve_position: 0 | 1;
  device_mode: "warmup" | "calibration" | "active" | "fault";

  // Arduino edge fields
  edge_state: number;         // 0=WARMUP, 1=CALIBRATING, 2=OPERATIONAL
  edge_progress: number;      // Arduino calibration progress 0-100
  edge_base_tds: number;      // Arduino learned TDS baseline
  edge_nudge: boolean;        // Arduino adaptive nudge active
  edge_valve: number;         // Arduino valve decision 0=Drain, 1=Harvest
  edge_confidence: number;    // Arduino confidence counter 0-3
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
  anomaly_tiers: AnomalyTiers;
  kill_switch_active: boolean;
  guard_enabled: boolean;
}

export interface AnomalyTierDetail {
  fault: boolean;
  detail: string;
  name: string;
  z_scores?: Record<string, number>;
}

export interface AnomalyTiers {
  is_anomaly: boolean;
  severity: "ok" | "warning" | "critical";
  action: "harvest" | "caution" | "drain";
  tiers: {
    t1: AnomalyTierDetail;
    t2: AnomalyTierDetail;
    t3: AnomalyTierDetail;
    t4: AnomalyTierDetail;
  };
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
