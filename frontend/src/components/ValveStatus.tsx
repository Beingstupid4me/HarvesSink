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
    text: "text-green-600 dark:text-green-400",
  },
  caution: {
    icon: ShieldAlert,
    label: "CAUTION",
    sublabel: "Water quality deviating from baseline",
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  drain: {
    icon: ShieldX,
    label: "DRAINING",
    sublabel: "Water exceeds safety thresholds",
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-600 dark:text-red-400",
  },
};

export default function ValveStatus({ decision, anomaly }: ValveStatusProps) {
  const cfg = STATUS_CONFIG[decision];
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 state-transition sm:gap-4 sm:p-4 ${cfg.bg}`}
    >
      <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${cfg.text}`} />
      <div>
        <p className={`text-base font-bold sm:text-lg ${cfg.text}`}>{cfg.label}</p>
        <p className="text-[11px] text-muted sm:text-xs">
          {anomaly ? "⚠️ Sensor anomaly detected — auto-draining" : cfg.sublabel}
        </p>
      </div>
    </div>
  );
}
