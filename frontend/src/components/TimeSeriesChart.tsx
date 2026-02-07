"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { LivePacket } from "@/lib/types";
import { useTheme } from "@/hooks/useTheme";

interface TimeSeriesChartProps {
  history: LivePacket[];
}

export default function TimeSeriesChart({ history }: TimeSeriesChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const data = history.map((p, i) => ({
    idx: i,
    pH: p.reading.ph,
    TDS: p.reading.tds,
    Turbidity: p.reading.turbidity,
    BOD: p.inference.bod_predicted,
    COD: p.inference.cod_predicted,
  }));

  return (
    <div className="rounded-xl border border-border-primary bg-card p-3 sm:p-4">
      <h3 className="mb-3 text-xs font-semibold text-secondary sm:mb-4 sm:text-sm">
        📈 Live Sensor Stream
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "#334155" : "#e2e8f0"}
          />
          <XAxis
            dataKey="idx"
            stroke={isDark ? "#64748b" : "#94a3b8"}
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${v}`}
          />
          <YAxis
            stroke={isDark ? "#64748b" : "#94a3b8"}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
              borderRadius: "8px",
              fontSize: "12px",
              color: isDark ? "#f1f5f9" : "#0f172a",
            }}
          />
          <Line
            type="monotone"
            dataKey="pH"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="TDS"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Turbidity"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
