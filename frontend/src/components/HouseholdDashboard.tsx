"use client";

import { useLiveStream } from "@/hooks/useLiveStream";
import GaugeCard from "./GaugeCard";
import ImpactWidget from "./ImpactWidget";
import CalibrationBar from "./CalibrationBar";
import ValveStatus from "./ValveStatus";
import TimeSeriesChart from "./TimeSeriesChart";
import NudgeCard from "./NudgeCard";
import ScenarioSwitcher from "./ScenarioSwitcher";
import { Wifi, WifiOff } from "lucide-react";

export default function HouseholdDashboard() {
  const { latest, history, connected } = useLiveStream();

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

  return (
    <div className="space-y-6">
      {/* ── Connection status + Scenario switcher ─────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {connected ? (
            <>
              <Wifi className="h-4 w-4 text-green-400" />
              <span className="text-green-400">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-400" />
              <span className="text-red-400">Reconnecting…</span>
            </>
          )}
          {reading && (
            <span className="ml-3 text-slate-500">
              Device: {reading.device_id}
            </span>
          )}
        </div>
        <ScenarioSwitcher />
      </div>

      {/* ── Calibration progress ──────────────────────── */}
      {latest && latest.calibration_progress < 100 && (
        <CalibrationBar progress={latest.calibration_progress} />
      )}

      {/* ── Valve status banner ───────────────────────── */}
      <ValveStatus decision={decision} anomaly={inference?.anomaly_flag} />

      {/* ── Live gauges ───────────────────────────────── */}
      <div
        className={`grid grid-cols-2 gap-4 rounded-xl border-2 p-4 state-transition md:grid-cols-4 ${bgTint}`}
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
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-harvest-border bg-harvest-card p-4">
          <p className="text-xs text-slate-400">BOD (Predicted)</p>
          <p className="mt-1 font-mono text-2xl font-bold text-orange-400">
            {inference?.bod_predicted?.toFixed(1) ?? "—"}{" "}
            <span className="text-sm text-slate-500">mg/L</span>
          </p>
        </div>
        <div className="rounded-xl border border-harvest-border bg-harvest-card p-4">
          <p className="text-xs text-slate-400">COD (Predicted)</p>
          <p className="mt-1 font-mono text-2xl font-bold text-purple-400">
            {inference?.cod_predicted?.toFixed(1) ?? "—"}{" "}
            <span className="text-sm text-slate-500">mg/L</span>
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
