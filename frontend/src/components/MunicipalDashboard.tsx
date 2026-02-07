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
    const timer = setInterval(refresh, 10000); // refresh every 10s
    return () => clearInterval(timer);
  }, []);

  const good = nodes.filter((n) => n.quality === "good").length;
  const caution = nodes.filter((n) => n.quality === "caution").length;
  const poor = nodes.filter((n) => n.quality === "poor").length;

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-200">
          Municipal Monitor — {nodes.length} Nodes
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-harvest-border bg-harvest-card px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Summary stats ─────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
          <p className="font-mono text-2xl font-bold text-green-400">{good}</p>
          <p className="text-xs text-slate-400">Good</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="font-mono text-2xl font-bold text-amber-400">{caution}</p>
          <p className="text-xs text-slate-400">Caution</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="font-mono text-2xl font-bold text-red-400">{poor}</p>
          <p className="text-xs text-slate-400">Poor</p>
        </div>
      </div>

      {/* ── Geospatial map ────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-300">
          🗺️ Node Heatmap
        </h3>
        <MapView nodes={nodes} />
      </div>

      {/* ── Cluster analysis ──────────────────────────── */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-300">
          🔍 Cluster Analysis
        </h3>
        <ClusterAnalysis nodes={nodes} />
      </div>
    </div>
  );
}