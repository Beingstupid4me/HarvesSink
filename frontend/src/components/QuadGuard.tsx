"use client";

import { AnomalyTiers } from "@/lib/types";
import { Shield } from "lucide-react";

interface QuadGuardProps {
  tiers: AnomalyTiers | undefined;
}

const TIER_SHORT: Record<string, string> = {
  t1: "Boundary",
  t2: "Signal",
  t3: "Z-Score",
  t4: "Cross-Sensor",
};

function dotColor(fault: boolean, severity: string): string {
  if (!fault) return "bg-green-500";
  if (severity === "critical") return "bg-red-500";
  return "bg-amber-500";
}

const SEVERITY_STYLE: Record<string, { text: string; icon: string }> = {
  ok:       { text: "text-green-500", icon: "text-green-500" },
  warning:  { text: "text-amber-500", icon: "text-amber-500" },
  critical: { text: "text-red-500",   icon: "text-red-500" },
};

const SEVERITY_LABEL: Record<string, string> = {
  ok: "ALL CLEAR",
  warning: "WARNING",
  critical: "CRITICAL",
};

export default function QuadGuard({ tiers }: QuadGuardProps) {
  if (!tiers) return null;

  const tierKeys = ["t1", "t2", "t3", "t4"] as const;
  const style = SEVERITY_STYLE[tiers.severity] ?? SEVERITY_STYLE.ok;
  const faultTier = tierKeys.find((k) => tiers.tiers[k]?.fault);
  const faultDetail = faultTier ? tiers.tiers[faultTier]?.detail : null;

  return (
    <div className="rounded-xl border border-border-primary bg-card p-3 sm:p-4 flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted tracking-wide">QUAD-GUARD™</p>
          <Shield className={`h-4 w-4 ${style.icon}`} />
        </div>
        <p className={`font-mono text-lg font-bold sm:text-xl ${style.text}`}>
          {SEVERITY_LABEL[tiers.severity]}
        </p>
      </div>

      {/* 2×2 tier grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
        {tierKeys.map((key) => {
          const tier = tiers.tiers[key];
          if (!tier) return null;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dotColor(tier.fault, tiers.severity)}`} />
              <span className="text-[11px] text-muted truncate">{TIER_SHORT[key]}</span>
            </div>
          );
        })}
      </div>

      {/* Fault detail (only when anomaly) */}
      {faultDetail && (
        <p className="mt-2 text-[10px] text-muted leading-tight line-clamp-2 border-t border-border-primary pt-2">
          {faultDetail}
        </p>
      )}
    </div>
  );
}
