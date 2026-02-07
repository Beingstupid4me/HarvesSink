"use client";

import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface ValveStatusProps {
  decision: "harvest" | "caution" | "drain";
  anomaly?: boolean;
}

const STATUS_CONFIG = {
  harvest: {
    icon: ShieldCheck,
    label: "HARVESTING",
    sublabel: "Water quality is within safe limits",
    bg: "bg-green-500/10 border-green-500/30",
    text: "text-green-400",
  },
  caution: {
    icon: ShieldAlert,
    label: "CAUTION",
    sublabel: "Water quality deviating from baseline",
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-400",
  },
  drain: {
    icon: ShieldX,
    label: "DRAINING",
    sublabel: "Water exceeds safety thresholds",
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-400",
  },
};

export default function ValveStatus({ decision, anomaly }: ValveStatusProps) {
  const cfg = STATUS_CONFIG[decision];
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-4 state-transition ${cfg.bg}`}
    >
      <Icon className={`h-8 w-8 ${cfg.text}`} />
      <div>
        <p className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</p>
        <p className="text-xs text-slate-400">
          {anomaly ? "⚠️ Sensor anomaly detected — auto-draining" : cfg.sublabel}
        </p>
      </div>
    </div>
  );
}
