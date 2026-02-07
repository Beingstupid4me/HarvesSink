"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import type { SensorReading, SustainabilityNudge } from "@/lib/types";
import { Lightbulb } from "lucide-react";

interface NudgeCardProps {
  reading?: SensorReading;
}

export default function NudgeCard({ reading }: NudgeCardProps) {
  const [nudge, setNudge] = useState<SustainabilityNudge | null>(null);

  useEffect(() => {
    if (!reading) return;

    // Refresh nudge every 15 seconds
    const timer = setInterval(async () => {
      try {
        const n = await fetchApi<SustainabilityNudge>(
          `/api/nudge/${reading.device_id}`
        );
        setNudge(n);
      } catch {
        /* ignore */
      }
    }, 15000);

    // Fetch immediately
    fetchApi<SustainabilityNudge>(`/api/nudge/${reading.device_id}`)
      .then(setNudge)
      .catch(() => {});

    return () => clearInterval(timer);
  }, [reading?.device_id]);

  if (!nudge) return null;

  return (
    <div className="rounded-xl border border-harvest-border bg-harvest-card p-4">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
        <div>
          <p className="text-sm font-semibold text-slate-200">
            💡 Sustainability Tip
          </p>
          {nudge.activity_guess && (
            <p className="mt-0.5 text-xs text-slate-500">
              Detected: {nudge.activity_guess}
            </p>
          )}
          <p className="mt-2 text-sm text-slate-300">{nudge.tip || nudge.message}</p>
        </div>
      </div>
    </div>
  );
}
