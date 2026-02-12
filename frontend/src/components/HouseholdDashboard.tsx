"use client";

import { useLiveStream } from "@/hooks/useLiveStream";
import GaugeCard from "./GaugeCard";
import CalibrationBar from "./CalibrationBar";
import ValveStatus from "./ValveStatus";
import QuadGuard from "./QuadGuard";
import ControlPanel from "./ControlPanel";
import TimeSeriesChart from "./TimeSeriesChart";
import NudgeCard from "./NudgeCard";
import ScenarioSwitcher from "./ScenarioSwitcher";
import { Wifi, WifiOff, RotateCcw, Droplets, Banknote, Waves, Cpu } from "lucide-react";
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

      {/* ── Calibration progress (warmup or calibrating) ── */}
      {latest && (reading?.device_mode === "warmup" || latest.calibration_progress < 100) && (
        <CalibrationBar
          progress={latest.calibration_progress}
          edgeState={reading?.edge_state}
          edgeProgress={reading?.edge_progress}
        />
      )}

      {/* ── Valve status banner ───────────────────────── */}
      <ValveStatus
        decision={decision}
        anomaly={inference?.anomaly_flag}
        killSwitch={latest?.kill_switch_active}
        edgeNudge={reading?.edge_nudge}
      />

      {/* ── Kill-Switch (Reverse Handshake) ──────────── */}
      <ControlPanel
        killSwitchActive={latest?.kill_switch_active}
        guardEnabled={latest?.guard_enabled}
      />

      {/* ── Live gauges ───────────────────────────────── */}
      <div
        className={`grid grid-cols-1 gap-3 rounded-xl border-2 p-3 state-transition sm:grid-cols-3 sm:gap-4 sm:p-4 ${bgTint}`}
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
          max={4000}
          unit="NTU"
          safeMax={5}
        />
      </div>

      {/* ── Metrics row: Quad-Guard + Edge + AI predictions + Impact ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
        {/* Quad-Guard compact card */}
        <QuadGuard tiers={latest?.anomaly_tiers} />
        {/* Edge Status */}
        <div className="rounded-xl border border-border-primary bg-card p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted tracking-wide">EDGE NODE</p>
            <Cpu className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <span className="text-muted">Valve</span>
            <span className={`font-semibold ${reading?.edge_valve === 1 ? "text-green-500" : "text-red-500"}`}>
              {reading?.edge_valve === 1 ? "HARVEST" : "DRAIN"}
            </span>
            <span className="text-muted">Nudge</span>
            <span className={`font-semibold ${reading?.edge_nudge ? "text-green-500" : "text-amber-500"}`}>
              {reading?.edge_nudge ? "PASS" : "TRIGGERED"}
            </span>
            <span className="text-muted">Baseline</span>
            <span className="font-mono text-primary">{reading?.edge_base_tds?.toFixed(0) ?? "—"} ppm</span>
            <span className="text-muted">Conf</span>
            <span className="font-mono text-primary">{reading?.edge_confidence ?? 0}/3</span>
          </div>
        </div>
        {/* BOD */}
        <div className="rounded-xl border border-border-primary bg-card p-3 sm:p-4">
          <p className="text-xs text-muted">BOD</p>
          <p className="mt-1 font-mono text-xl font-bold text-orange-500 dark:text-orange-400 sm:text-2xl">
            {inference?.bod_predicted?.toFixed(1) ?? "—"}
            <span className="text-xs text-muted ml-1">mg/L</span>
          </p>
        </div>
        {/* COD */}
        <div className="rounded-xl border border-border-primary bg-card p-3 sm:p-4">
          <p className="text-xs text-muted">COD</p>
          <p className="mt-1 font-mono text-xl font-bold text-purple-500 dark:text-purple-400 sm:text-2xl">
            {inference?.cod_predicted?.toFixed(1) ?? "—"}
            <span className="text-xs text-muted ml-1">mg/L</span>
          </p>
        </div>
      </div>

      {/* ── Impact row ────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border-primary bg-card p-3 sm:p-4 text-center">
          <Droplets className="mx-auto h-4 w-4 text-blue-500" />
          <p className="mt-1 font-mono text-lg font-bold text-blue-600 dark:text-blue-300 sm:text-xl">
            {(latest?.liters_saved ?? 0).toFixed(1)}
          </p>
          <p className="text-[10px] text-muted">Liters Saved</p>
        </div>
        <div className="rounded-xl border border-border-primary bg-card p-3 sm:p-4 text-center">
          <Banknote className="mx-auto h-4 w-4 text-emerald-500" />
          <p className="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-300 sm:text-xl">
            ₹{(latest?.money_saved ?? 0).toFixed(0)}
          </p>
          <p className="text-[10px] text-muted">Money Saved</p>
        </div>
        <div className="rounded-xl border border-border-primary bg-card p-3 sm:p-4 text-center">
          <Waves className="mx-auto h-4 w-4 text-cyan-500" />
          <p className="mt-1 font-mono text-lg font-bold text-cyan-600 dark:text-cyan-300 sm:text-xl">
            {(latest?.lake_impact_score ?? 0).toFixed(1)}
          </p>
          <p className="text-[10px] text-muted">Lake Impact</p>
        </div>
      </div>

      {/* ── Time-series chart ─────────────────────────── */}
      <TimeSeriesChart history={history} />

      {/* ── Sustainability nudge ──────────────────────── */}
      <NudgeCard reading={reading} />
    </div>
  );
}
