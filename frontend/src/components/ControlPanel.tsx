"use client";

import { useState, useEffect } from "react";
import { postApi } from "@/lib/api";
import { Shield, ShieldOff, Zap, ZapOff } from "lucide-react";

interface ControlPanelProps {
  killSwitchActive?: boolean;
  guardEnabled?: boolean;
}

export default function ControlPanel({
  killSwitchActive = false,
  guardEnabled = true,
}: ControlPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [localKill, setLocalKill] = useState(false);
  const [localGuard, setLocalGuard] = useState(true);

  // Sync with live WebSocket values
  useEffect(() => { setLocalKill(killSwitchActive); }, [killSwitchActive]);
  useEffect(() => { setLocalGuard(guardEnabled); }, [guardEnabled]);

  const toggleKillSwitch = async () => {
    setLoading("kill");
    try {
      if (localKill) {
        await postApi("/api/killswitch/release");
        setLocalKill(false);
      } else {
        await postApi("/api/killswitch/trigger");
        setLocalKill(true);
      }
    } catch { /* ignore */ }
    setLoading(null);
  };

  const toggleGuard = async () => {
    setLoading("guard");
    try {
      if (localGuard) {
        await postApi("/api/guard/disable");
        setLocalGuard(false);
      } else {
        await postApi("/api/guard/enable");
        setLocalGuard(true);
      }
    } catch { /* ignore */ }
    setLoading(null);
  };

  return (
    <div className="rounded-xl border border-border-primary bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border-primary bg-slate-800/40">
        <p className="text-xs font-semibold tracking-wide text-muted">
          SYSTEM CONTROLS
        </p>
      </div>

      <div className="divide-y divide-border-primary">
        {/* ── Kill-Switch row ── */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                localKill ? "bg-red-500/20" : "bg-indigo-500/10"
              }`}
            >
              {localKill ? (
                <ZapOff className="h-4.5 w-4.5 text-red-500" />
              ) : (
                <Zap className="h-4.5 w-4.5 text-indigo-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">
                Force Drain
              </p>
              <p className="text-[10px] text-muted">
                {localKill
                  ? "Kill-switch active — valve forced to DRAIN"
                  : "Override Arduino → force drain via serial"}
              </p>
            </div>
          </div>

          {/* Toggle switch */}
          <button
            onClick={toggleKillSwitch}
            disabled={loading === "kill"}
            className="relative flex-shrink-0"
            aria-label="Toggle kill-switch"
          >
            <div
              className={`h-6 w-11 rounded-full transition-colors duration-200 ${
                localKill ? "bg-red-500" : "bg-slate-600"
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  localKill ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        </div>

        {/* ── Guard row ── */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                localGuard ? "bg-emerald-500/10" : "bg-slate-500/10"
              }`}
            >
              {localGuard ? (
                <Shield className="h-4.5 w-4.5 text-emerald-500" />
              ) : (
                <ShieldOff className="h-4.5 w-4.5 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">
                Quad-Guard™
              </p>
              <p className="text-[10px] text-muted">
                {localGuard
                  ? "4-tier anomaly detection active"
                  : "Guard disabled — no anomaly override"}
              </p>
            </div>
          </div>

          {/* Toggle switch */}
          <button
            onClick={toggleGuard}
            disabled={loading === "guard"}
            className="relative flex-shrink-0"
            aria-label="Toggle quad-guard"
          >
            <div
              className={`h-6 w-11 rounded-full transition-colors duration-200 ${
                localGuard ? "bg-emerald-500" : "bg-slate-600"
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  localGuard ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Status footer */}
      <div className="px-4 py-2 border-t border-border-primary bg-slate-800/20 flex items-center gap-3 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              localKill ? "bg-red-500 animate-pulse" : "bg-green-500"
            }`}
          />
          Drain: {localKill ? "FORCED" : "AUTO"}
        </span>
        <span className="text-slate-600">|</span>
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              localGuard ? "bg-emerald-500" : "bg-slate-500"
            }`}
          />
          Guard: {localGuard ? "ON" : "OFF"}
        </span>
      </div>
    </div>
  );
}
