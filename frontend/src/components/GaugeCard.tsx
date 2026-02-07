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

  const color = isUnsafe ? "text-red-400" : "text-green-400";
  const barColor = isUnsafe ? "bg-red-500" : "bg-green-500";
  const glowClass = isUnsafe ? "glow-red" : "glow-green";

  return (
    <div
      className={`rounded-xl border border-harvest-border bg-harvest-card p-4 state-transition ${glowClass}`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className={`mt-2 font-mono text-3xl font-bold ${color}`}>
        {value.toFixed(1)}
        <span className="ml-1 text-sm text-slate-500">{unit}</span>
      </p>

      {/* Bar gauge */}
      <div className="mt-3 h-2 w-full rounded-full bg-slate-700">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Safe range indicator */}
      {(safeMin !== undefined || safeMax !== undefined) && (
        <p className="mt-1 text-[10px] text-slate-500">
          Safe:{" "}
          {safeMin !== undefined ? safeMin : min}–
          {safeMax !== undefined ? safeMax : max}
        </p>
      )}
    </div>
  );
}
