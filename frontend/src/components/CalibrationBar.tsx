"use client";

interface CalibrationBarProps {
  progress: number;
}

export default function CalibrationBar({ progress }: CalibrationBarProps) {
  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-300">
            🔧 Calibration in Progress
          </p>
          <p className="mt-0.5 text-xs text-blue-400/70">
            Learning your water baseline… ({progress.toFixed(0)}%)
          </p>
        </div>
        <span className="font-mono text-lg font-bold text-blue-300">
          {progress.toFixed(0)}%
        </span>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-slate-700">
        <div
          className="h-2 rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
