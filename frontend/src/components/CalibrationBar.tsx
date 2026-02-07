"use client";

interface CalibrationBarProps {
  progress: number;
}

export default function CalibrationBar({ progress }: CalibrationBarProps) {
  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 sm:text-sm">
            🔧 Calibration in Progress
          </p>
          <p className="mt-0.5 text-[10px] text-blue-500/70 dark:text-blue-400/70 sm:text-xs">
            Learning your water baseline… ({progress.toFixed(0)}%)
          </p>
        </div>
        <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-300 sm:text-lg">
          {progress.toFixed(0)}%
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-slate-700 sm:mt-3 sm:h-2">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
