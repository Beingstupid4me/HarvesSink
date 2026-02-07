"use client";

import { useEffect, useRef } from "react";
import type { NodeSummary } from "@/lib/types";

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

  // Init map once (dynamic import to avoid SSR)
  useEffect(() => {
    if (!mapContainer.current) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      // If cleanup ran while we were importing, bail out
      if (cancelled || !mapContainer.current) return;

      // If already initialized (e.g. StrictMode double-run), skip
      if (mapRef.current) return;

      // Fix default icon paths for webpack/next
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapContainer.current, {
        center: [28.6139, 77.209],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Fix tile rendering on container resize
      setTimeout(() => map.invalidateSize(), 200);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when nodes change
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      nodes.forEach((node) => {
        const color = QUALITY_COLORS[node.quality] || "#22c55e";
        const marker = L.circleMarker([node.lat, node.lng], {
          radius: 7,
          color: color,
          fillColor: color,
          fillOpacity: 0.8,
          weight: 2,
        })
          .bindPopup(
            `<div style="font-size:12px;line-height:1.5">
              <b>${node.device_id}</b><br/>
              pH: ${node.ph} | TDS: ${node.tds}<br/>
              Turbidity: ${node.turbidity} NTU<br/>
              Quality: <span style="color:${color};font-weight:bold">${node.quality.toUpperCase()}</span>
            </div>`
          )
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });

      // Fit bounds if we have nodes
      if (nodes.length > 0 && markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        mapRef.current!.fitBounds(group.getBounds().pad(0.1));
      }
    });
  }, [nodes]);

  return (
    <div
      ref={mapContainer}
      className="h-64 w-full rounded-xl border border-border-primary sm:h-80 lg:h-96"
      style={{ zIndex: 0 }}
    />
  );
}