"use client";

import { ShieldCheck, ShieldAlert, ShieldX, Droplets, AlertTriangle } from "lucide-react";

interface ValveStatusProps {
  decision: "harvest" | "caution" | "drain";
  anomaly?: boolean;
  killSwitch?: boolean;
  edgeNudge?: boolean;
}

const STATUS_CONFIG = {
  harvest: {
    icon: ShieldCheck,
    label: "STORING WATER",
    sublabel: "Water quality is within safe limits — valve open, collecting greywater",
    bg: "bg-green-500/10 border-green-500/40",
    text: "text-green-500",
    iconBg: "bg-green-500/20",
    tagBg: "bg-green-500/20 text-green-400",
    tagText: "HARVEST",
  },
  caution: {
    icon: ShieldAlert,
    label: "CAUTION",
    sublabel: "Water quality deviating from baseline — monitoring closely",
    bg: "bg-amber-500/10 border-amber-500/40",
    text: "text-amber-500",
    iconBg: "bg-amber-500/20",
    tagBg: "bg-amber-500/20 text-amber-400",
    tagText: "CAUTION",
  },
  drain: {
    icon: ShieldX,
    label: "DRAINING WATER",
    sublabel: "Water exceeds safety thresholds — valve closed, draining to sewer",
    bg: "bg-red-500/10 border-red-500/40",
    text: "text-red-500",
    iconBg: "bg-red-500/20",
    tagBg: "bg-red-500/20 text-red-400",
    tagText: "DRAIN",
  },
};

export default function ValveStatus({ decision, anomaly, killSwitch, edgeNudge }: ValveStatusProps) {
  const cfg = STATUS_CONFIG[decision];
  const Icon = cfg.icon;

  let subtitle = cfg.sublabel;
  if (killSwitch) {
    subtitle = "🛑 Kill-switch active — Server overrode Arduino, forcing drain via serial";
  } else if (anomaly) {
    subtitle = "⚠️ Sensor anomaly detected — auto-draining to protect storage";
  } else if (edgeNudge === false) {
    subtitle = "📊 Arduino adaptive nudge triggered — water deviating from learned baseline";
  }

  const isStoring = decision === "harvest";

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border-2 p-4 state-transition sm:p-5 ${cfg.bg}`}
    >
      {/* Large animated icon */}
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${cfg.iconBg} sm:h-14 sm:w-14`}>
        {isStoring ? (
          <Droplets className={`h-6 w-6 sm:h-7 sm:w-7 ${cfg.text}`} />
        ) : decision === "drain" ? (
          <AlertTriangle className={`h-6 w-6 sm:h-7 sm:w-7 ${cfg.text} ${killSwitch || anomaly ? "animate-pulse" : ""}`} />
        ) : (
          <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${cfg.text}`} />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <p className={`text-lg font-bold sm:text-xl ${cfg.text}`}>
            {cfg.label}
          </p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${cfg.tagBg}`}>
            {cfg.tagText}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted sm:text-xs leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Right-side water state indicator */}
      <div className="hidden sm:flex flex-col items-center gap-1">
        <div className={`relative h-10 w-10 rounded-lg border-2 overflow-hidden ${
          isStoring ? "border-green-500/50" : "border-red-500/50"
        }`}>
          {/* Water fill animation */}
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ${
              isStoring
                ? "bg-green-500/30 h-[70%]"
                : "bg-red-500/30 h-[20%]"
            }`}
          />
          <Droplets className={`absolute inset-0 m-auto h-5 w-5 ${
            isStoring ? "text-green-500" : "text-red-500"
          }`} />
        </div>
        <span className={`text-[9px] font-bold tracking-wider ${cfg.text}`}>
          {isStoring ? "FILLING" : decision === "caution" ? "WATCHING" : "EMPTYING"}
        </span>
      </div>
    </div>
  );
}
