"use client";

import { useEffect, useRef } from "react";
import type { NodeSummary } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const QUALITY_COLORS: Record<string, string> = {
  good: "#22c55e",
  caution: "#f59e0b",
  poor: "#ef4444",
};

interface MapViewProps {
  nodes: NodeSummary[];
}

export default function MapView({ nodes }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === "your_mapbox_token_here") {
      // No valid token — skip map init, fallback UI handles it
      return;
    }

    import("mapbox-gl").then((mapboxgl) => {
      (mapboxgl as any).accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [77.209, 28.6139],
        zoom: 11,
      });

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when nodes change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    import("mapbox-gl").then((mapboxgl) => {
      nodes.forEach((node) => {
        const el = document.createElement("div");
        el.style.width = "12px";
        el.style.height = "12px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = QUALITY_COLORS[node.quality] || "#22c55e";
        el.style.border = "2px solid rgba(255,255,255,0.3)";
        el.style.boxShadow = `0 0 8px ${QUALITY_COLORS[node.quality] || "#22c55e"}`;
        el.title = `${node.device_id} — pH: ${node.ph}, TDS: ${node.tds}`;

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([node.lng, node.lat])
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });
    });
  }, [nodes]);

  // Fallback when no Mapbox token
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === "your_mapbox_token_here") {
    return (
      <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-harvest-border bg-harvest-card">
        <p className="text-sm text-slate-400">🗺️ Map requires a Mapbox token</p>
        <p className="mt-1 text-xs text-slate-500">
          Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local
        </p>
        {/* Fallback: simple node list */}
        <div className="mt-4 max-h-40 w-full overflow-y-auto px-6">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {nodes.slice(0, 12).map((n) => (
              <div
                key={n.device_id}
                className="flex items-center gap-2 rounded border border-harvest-border px-2 py-1 text-xs"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: QUALITY_COLORS[n.quality] }}
                />
                <span className="text-slate-300">{n.device_id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className="h-80 w-full rounded-xl border border-harvest-border"
    />
  );
}