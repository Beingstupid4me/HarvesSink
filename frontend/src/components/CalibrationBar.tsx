"use client";

interface CalibrationBarProps {
  progress: number;
  edgeState?: number;      // 0=WARMUP, 1=CALIBRATING, 2=OPERATIONAL
  edgeProgress?: number;   // Arduino's own progress
}

const STATE_LABEL: Record<number, { title: string; sub: string; color: string }> = {
  0: { title: "⏳ Warming Up", sub: "Sensors stabilizing…", color: "text-gray-400 dark:text-gray-500" },
  1: { title: "🔧 Calibrating", sub: "Learning local baseline…", color: "text-blue-600 dark:text-blue-300" },
  2: { title: "✅ Operational", sub: "Edge intelligence active", color: "text-green-600 dark:text-green-300" },
};

export default function CalibrationBar({ progress, edgeState = 2, edgeProgress }: CalibrationBarProps) {
  // If Arduino is in warmup, show warmup UI
  if (edgeState === 0) {
    return (
      <div className="rounded-xl border border-gray-500/30 bg-gray-500/10 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 sm:text-sm">
              ⏳ Stabilizing Sensors…
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400/70 sm:text-xs">
              Arduino is warming up — please wait
            </p>
          </div>
          <div className="h-4 w-4 animate-pulse rounded-full bg-gray-400/50" />
        </div>
      </div>
    );
  }

  // Server-side calibration in progress
  const displayProgress = progress;
  const stateInfo = STATE_LABEL[edgeState] ?? STATE_LABEL[1];

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-semibold sm:text-sm ${stateInfo.color}`}>
            {stateInfo.title}
          </p>
          <p className="mt-0.5 text-[10px] text-blue-500/70 dark:text-blue-400/70 sm:text-xs">
            {stateInfo.sub} ({displayProgress.toFixed(0)}%)
          </p>
        </div>
        <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-300 sm:text-lg">
          {displayProgress.toFixed(0)}%
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-slate-700 sm:mt-3 sm:h-2">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${Math.min(displayProgress, 100)}%` }}
        />
      </div>
    </div>
  );
}
