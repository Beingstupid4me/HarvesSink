"use client";

interface GaugeCardProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  safeMin?: number;
  safeMax?: number;
}

export default function GaugeCard({
  label,
  value,
  min,
  max,
  unit,
  safeMin,
  safeMax,
}: GaugeCardProps) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const isUnsafe =
    (safeMin !== undefined && value < safeMin) ||
    (safeMax !== undefined && value > safeMax);

  const color = isUnsafe ? "text-red-500" : "text-green-500";
  const barColor = isUnsafe ? "bg-red-500" : "bg-green-500";
  const glowClass = isUnsafe ? "glow-red" : "glow-green";

  return (
    <div
      className={`rounded-xl border border-border-primary bg-card p-3 state-transition sm:p-4 ${glowClass}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted sm:text-xs">
        {label}
      </p>
      <p className={`mt-1.5 font-mono text-2xl font-bold sm:mt-2 sm:text-3xl ${color}`}>
        {value.toFixed(1)}
        <span className="ml-1 text-xs text-muted sm:text-sm">{unit}</span>
      </p>

      {/* Bar gauge */}
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-slate-700 sm:mt-3 sm:h-2">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Safe range indicator */}
      {(safeMin !== undefined || safeMax !== undefined) && (
        <p className="mt-1 text-[9px] text-muted sm:text-[10px]">
          Safe:{" "}
          {safeMin !== undefined ? safeMin : min}–
          {safeMax !== undefined ? safeMax : max}
        </p>
      )}
    </div>
  );
}
