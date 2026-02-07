"use client";

import { Droplets, Banknote, Waves } from "lucide-react";

interface ImpactWidgetProps {
  liters: number;
  money: number;
  lake: number;
}

export default function ImpactWidget({ liters, money, lake }: ImpactWidgetProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-xl border border-harvest-border bg-harvest-card p-4 text-center">
        <Droplets className="mx-auto h-6 w-6 text-blue-400" />
        <p className="mt-2 font-mono text-2xl font-bold text-blue-300">
          {liters.toFixed(1)}
        </p>
        <p className="text-xs text-slate-400">Liters Saved</p>
      </div>

      <div className="rounded-xl border border-harvest-border bg-harvest-card p-4 text-center">
        <Banknote className="mx-auto h-6 w-6 text-emerald-400" />
        <p className="mt-2 font-mono text-2xl font-bold text-emerald-300">
          ₹{money.toFixed(0)}
        </p>
        <p className="text-xs text-slate-400">Money Saved</p>
      </div>

      <div className="rounded-xl border border-harvest-border bg-harvest-card p-4 text-center">
        <Waves className="mx-auto h-6 w-6 text-cyan-400" />
        <p className="mt-2 font-mono text-2xl font-bold text-cyan-300">
          {lake.toFixed(1)}
        </p>
        <p className="text-xs text-slate-400">Lake Impact</p>
      </div>
    </div>
  );
}
