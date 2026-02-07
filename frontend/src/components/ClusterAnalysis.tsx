"use client";

import type { NodeSummary } from "@/lib/types";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface ClusterAnalysisProps {
  nodes: NodeSummary[];
}

export default function ClusterAnalysis({ nodes }: ClusterAnalysisProps) {
  const zones = new Map<string, NodeSummary[]>();

  nodes.forEach((node) => {
    const zoneKey = `${Math.round(node.lat * 50)}_${Math.round(node.lng * 50)}`;
    if (!zones.has(zoneKey)) zones.set(zoneKey, []);
    zones.get(zoneKey)!.push(node);
  });

  const alerts: { zone: string; poorCount: number; total: number }[] = [];
  zones.forEach((members, key) => {
    const poorCount = members.filter((m) => m.quality === "poor").length;
    if (poorCount >= Math.ceil(members.length * 0.5) && members.length >= 2) {
      alerts.push({ zone: key, poorCount, total: members.length });
    }
  });

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-3 sm:p-4">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <p className="text-xs text-green-700 dark:text-green-300 sm:text-sm">
          All zones are reporting normal water quality.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.zone}
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 sm:p-4"
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="text-xs font-semibold text-red-700 dark:text-red-300 sm:text-sm">
              Zone {a.zone} — Possible Contamination Event
            </p>
            <p className="text-[10px] text-muted sm:text-xs">
              {a.poorCount}/{a.total} nodes reporting poor quality simultaneously
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}