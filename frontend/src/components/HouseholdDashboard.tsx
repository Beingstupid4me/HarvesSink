"use client";

import { useLiveStream } from "@/hooks/useLiveStream";
import GaugeCard from "./GaugeCard";
import ImpactWidget from "./ImpactWidget";
import CalibrationBar from "./CalibrationBar";
import ValveStatus from "./ValveStatus";
import TimeSeriesChart from "./TimeSeriesChart";
import NudgeCard from "./NudgeCard";
import ScenarioSwitcher from "./ScenarioSwitcher";
import { Wifi, WifiOff, RotateCcw } from "lucide-react";
import { postApi } from "@/lib/api";
import { useState } from "react";

export default function HouseholdDashboard() {
  const { latest, history, connected } = useLiveStream();
  const [calibrating, setCalibrating] = useState(false);

  const reading = latest?.reading;
  const inference = latest?.inference;
  const decision = latest?.valve_decision || "harvest";

  // Background tint based on water state
  const bgTint =
    decision === "harvest"
      ? "border-harvest-green/30"
      : decision === "caution"
      ? "border-harvest-amber/30"
      : "border-harvest-red/30";

  const handleRecalibrate = async () => {
    setCalibrating(true);
    try {
      await postApi("/api/calibration/reset/" + (reading?.device_id || "HVS-001"));
    } catch { /* ignore */ }
    setCalibrating(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Connection status + Scenario switcher ─────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          {connected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-green-500">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-red-500">Reconnecting…</span>
            </>
          )}
          {reading && (
            <span className="ml-3 text-muted">
              Device: {reading.device_id}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRecalibrate}
            disabled={calibrating}
            className="flex items-center gap-1.5 rounded-lg border border-border-primary bg-card px-3 py-1.5 text-xs text-secondary hover:text-primary disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${calibrating ? "animate-spin" : ""}`} />
            Recalibrate
          </button>
          <ScenarioSwitcher />
        </div>
      </div>

      {/* ── Calibration progress ──────────────────────── */}
      {latest && latest.calibration_progress < 100 && (
        <CalibrationBar progress={latest.calibration_progress} />
      )}

      {/* ── Valve status banner ───────────────────────── */}
      <ValveStatus decision={decision} anomaly={inference?.anomaly_flag} />

      {/* ── Live gauges ───────────────────────────────── */}
      <div
        className={`grid grid-cols-2 gap-3 rounded-xl border-2 p-3 state-transition sm:gap-4 sm:p-4 lg:grid-cols-4 ${bgTint}`}
      >
        <GaugeCard
          label="pH"
          value={reading?.ph ?? 0}
          min={0}
          max={14}
          unit=""
          safeMin={6.5}
          safeMax={8.5}
        />
        <GaugeCard
          label="TDS"
          value={reading?.tds ?? 0}
          min={0}
          max={1000}
          unit="ppm"
          safeMax={500}
        />
        <GaugeCard
          label="Turbidity"
          value={reading?.turbidity ?? 0}
          min={0}
          max={50}
          unit="NTU"
          safeMax={5}
        />
        <GaugeCard
          label="Temp"
          value={reading?.temperature ?? 0}
          min={0}
          max={50}
          unit="°C"
        />
      </div>

      {/* ── AI predictions ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border-primary bg-card p-3 sm:p-4">
          <p className="text-xs text-muted">BOD (Predicted)</p>
          <p className="mt-1 font-mono text-xl font-bold text-orange-500 dark:text-orange-400 sm:text-2xl">
            {inference?.bod_predicted?.toFixed(1) ?? "—"}{" "}
            <span className="text-sm text-muted">mg/L</span>
          </p>
        </div>
        <div className="rounded-xl border border-border-primary bg-card p-3 sm:p-4">
          <p className="text-xs text-muted">COD (Predicted)</p>
          <p className="mt-1 font-mono text-xl font-bold text-purple-500 dark:text-purple-400 sm:text-2xl">
            {inference?.cod_predicted?.toFixed(1) ?? "—"}{" "}
            <span className="text-sm text-muted">mg/L</span>
          </p>
        </div>
      </div>

      {/* ── Impact widget ─────────────────────────────── */}
      <ImpactWidget
        liters={latest?.liters_saved ?? 0}
        money={latest?.money_saved ?? 0}
        lake={latest?.lake_impact_score ?? 0}
      />

      {/* ── Time-series chart ─────────────────────────── */}
      <TimeSeriesChart history={history} />

      {/* ── Sustainability nudge ──────────────────────── */}
      <NudgeCard reading={reading} />
    </div>
  );
}
