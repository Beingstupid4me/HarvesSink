"use client";

import { useState } from "react";
import { postApi } from "@/lib/api";
import { Zap, ZapOff } from "lucide-react";

interface KillSwitchProps {
  active?: boolean;
}

export default function KillSwitch({ active = false }: KillSwitchProps) {
  const [loading, setLoading] = useState(false);
  const [localActive, setLocalActive] = useState(false);

  // Prefer live value from WebSocket, fall back to local state
  const isActive = active || localActive;

  const handleTrigger = async () => {
    setLoading(true);
    try {
      await postApi("/api/killswitch/trigger");
      setLocalActive(true);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleRelease = async () => {
    setLoading(true);
    try {
      await postApi("/api/killswitch/release");
      setLocalActive(false);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div
      className={`rounded-xl border-2 p-3 sm:p-4 transition-all duration-300 ${
        isActive
          ? "border-red-500/60 bg-red-500/10"
          : "border-border-primary bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              isActive ? "bg-red-500/20" : "bg-indigo-500/10"
            }`}
          >
            {isActive ? (
              <ZapOff className="h-5 w-5 text-red-500 animate-pulse" />
            ) : (
              <Zap className="h-5 w-5 text-indigo-500" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold">
              {isActive ? (
                <span className="text-red-500">🛑 KILL-SWITCH ACTIVE</span>
              ) : (
                <span className="text-primary">Reverse Handshake</span>
              )}
            </p>
            <p className="text-[10px] text-muted sm:text-xs">
              {isActive
                ? "Server has overridden Arduino — valve forced to DRAIN"
                : "Server → Arduino serial override. Send \"0\" to force drain."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isActive ? (
            <button
              onClick={handleRelease}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-green-500/50 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-500/20 disabled:opacity-50 dark:text-green-400"
            >
              {loading ? "…" : "Release"}
            </button>
          ) : (
            <button
              onClick={handleTrigger}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/20 disabled:opacity-50 dark:text-red-400"
            >
              {loading ? "…" : "⚡ Force Drain"}
            </button>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted">
        <span
          className={`h-2 w-2 rounded-full ${
            isActive ? "bg-red-500 animate-pulse" : "bg-green-500"
          }`}
        />
        <span>
          {isActive
            ? "Serial: sent \"0\" → Arduino relay OFF (DRAIN)"
            : "Standby — Arduino operating normally"}
        </span>
      </div>
    </div>
  );
}
