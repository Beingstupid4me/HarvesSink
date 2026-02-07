"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { LivePacket } from "@/lib/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/live";
const MAX_HISTORY = 120; // ~60s at 500ms interval

/**
 * WebSocket hook that connects to the backend live stream.
 * Returns the latest packet and a rolling history for charts.
 */
export function useLiveStream() {
  const [latest, setLatest] = useState<LivePacket | null>(null);
  const [history, setHistory] = useState<LivePacket[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const packet: LivePacket = JSON.parse(event.data);
        setLatest(packet);
        setHistory((prev) => {
          const next = [...prev, packet];
          return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
        });
      } catch {
        /* ignore malformed packets */
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 2s
      reconnectTimeout.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { latest, history, connected };
}
