"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import type { NodeSummary } from "@/lib/types";
import MapView from "./MapView";
import ClusterAnalysis from "./ClusterAnalysis";
import { RefreshCw } from "lucide-react";

export default function MunicipalDashboard() {
  const [nodes, setNodes] = useState<NodeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<NodeSummary[]>("/api/municipal/nodes");
      setNodes(data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, []);

  const good = nodes.filter((n) => n.quality === "good").length;
  const caution = nodes.filter((n) => n.quality === "caution").length;
  const poor = nodes.filter((n) => n.quality === "poor").length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold sm:text-lg">
          Municipal Monitor — {nodes.length} Nodes
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border-primary bg-card px-2.5 py-1.5 text-xs text-secondary hover:text-primary disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Summary stats ─────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center sm:p-4">
          <p className="font-mono text-xl font-bold text-green-500 sm:text-2xl">{good}</p>
          <p className="text-[10px] text-muted sm:text-xs">Good</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center sm:p-4">
          <p className="font-mono text-xl font-bold text-amber-500 sm:text-2xl">{caution}</p>
          <p className="text-[10px] text-muted sm:text-xs">Caution</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center sm:p-4">
          <p className="font-mono text-xl font-bold text-red-500 sm:text-2xl">{poor}</p>
          <p className="text-[10px] text-muted sm:text-xs">Poor</p>
        </div>
      </div>

      {/* ── Geospatial map ────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-xs font-semibold text-secondary sm:text-sm">
          🗺️ Node Heatmap
        </h3>
        <MapView nodes={nodes} />
      </div>

      {/* ── Cluster analysis ──────────────────────────── */}
      <div>
        <h3 className="mb-2 text-xs font-semibold text-secondary sm:text-sm">
          🔍 Cluster Analysis
        </h3>
        <ClusterAnalysis nodes={nodes} />
      </div>
    </div>
  );
}