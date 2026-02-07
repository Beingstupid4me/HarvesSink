"use client";

import type { NodeSummary } from "@/lib/types";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface ClusterAnalysisProps {
  nodes: NodeSummary[];
}

export default function ClusterAnalysis({ nodes }: ClusterAnalysisProps) {
  // Simple zone-based clustering: group by rough lat/lng grid
  const zones = new Map<string, NodeSummary[]>();

  nodes.forEach((node) => {
    // ~1km grid cells
    const zoneKey = `${Math.round(node.lat * 50)}_${Math.round(node.lng * 50)}`;
    if (!zones.has(zoneKey)) zones.set(zoneKey, []);
    zones.get(zoneKey)!.push(node);
  });

  // Detect zones where majority report poor quality
  const alerts: { zone: string; poorCount: number; total: number }[] = [];
  zones.forEach((members, key) => {
    const poorCount = members.filter((m) => m.quality === "poor").length;
    if (poorCount >= Math.ceil(members.length * 0.5) && members.length >= 2) {
      alerts.push({ zone: key, poorCount, total: members.length });
    }
  });

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
        <CheckCircle className="h-5 w-5 text-green-400" />
        <p className="text-sm text-green-300">
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
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-300">
              Zone {a.zone} — Possible Contamination Event
            </p>
            <p className="text-xs text-slate-400">
              {a.poorCount}/{a.total} nodes reporting poor quality simultaneously
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}