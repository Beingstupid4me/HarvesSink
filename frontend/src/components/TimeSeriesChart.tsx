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

interface TimeSeriesChartProps {
  history: LivePacket[];
}

export default function TimeSeriesChart({ history }: TimeSeriesChartProps) {
  const data = history.map((p, i) => ({
    idx: i,
    pH: p.reading.ph,
    TDS: p.reading.tds,
    Turbidity: p.reading.turbidity,
    BOD: p.inference.bod_predicted,
    COD: p.inference.cod_predicted,
  }));

  return (
    <div className="rounded-xl border border-harvest-border bg-harvest-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-300">
        📈 Live Sensor Stream
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="idx"
            stroke="#64748b"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${v}`}
          />
          <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Line
            type="monotone"
            dataKey="pH"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="TDS"
            stroke="#34d399"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Turbidity"
            stroke="#fbbf24"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
