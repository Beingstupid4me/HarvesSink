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

    fetchApi<SustainabilityNudge>(`/api/nudge/${reading.device_id}`)
      .then(setNudge)
      .catch(() => {});

    return () => clearInterval(timer);
  }, [reading?.device_id]);

  if (!nudge) return null;

  return (
    <div className="rounded-xl border border-border-primary bg-card p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
        <div>
          <p className="text-xs font-semibold sm:text-sm">
            💡 Sustainability Tip
          </p>
          {nudge.activity_guess && (
            <p className="mt-0.5 text-[10px] text-muted sm:text-xs">
              Detected: {nudge.activity_guess}
            </p>
          )}
          <p className="mt-1.5 text-xs text-secondary sm:mt-2 sm:text-sm">{nudge.tip || nudge.message}</p>
        </div>
      </div>
    </div>
  );
}
