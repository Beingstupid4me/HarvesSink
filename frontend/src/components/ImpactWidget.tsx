"use client";

import { Droplets, Banknote, Waves } from "lucide-react";

interface ImpactWidgetProps {
  liters: number;
  money: number;
  lake: number;
}

export default function ImpactWidget({ liters, money, lake }: ImpactWidgetProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      <div className="rounded-xl border border-border-primary bg-card p-3 text-center sm:p-4">
        <Droplets className="mx-auto h-5 w-5 text-blue-500 sm:h-6 sm:w-6" />
        <p className="mt-1.5 font-mono text-lg font-bold text-blue-600 dark:text-blue-300 sm:mt-2 sm:text-2xl">
          {liters.toFixed(1)}
        </p>
        <p className="text-[10px] text-muted sm:text-xs">Liters Saved</p>
      </div>

      <div className="rounded-xl border border-border-primary bg-card p-3 text-center sm:p-4">
        <Banknote className="mx-auto h-5 w-5 text-emerald-500 sm:h-6 sm:w-6" />
        <p className="mt-1.5 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-300 sm:mt-2 sm:text-2xl">
          ₹{money.toFixed(0)}
        </p>
        <p className="text-[10px] text-muted sm:text-xs">Money Saved</p>
      </div>

      <div className="rounded-xl border border-border-primary bg-card p-3 text-center sm:p-4">
        <Waves className="mx-auto h-5 w-5 text-cyan-500 sm:h-6 sm:w-6" />
        <p className="mt-1.5 font-mono text-lg font-bold text-cyan-600 dark:text-cyan-300 sm:mt-2 sm:text-2xl">
          {lake.toFixed(1)}
        </p>
        <p className="text-[10px] text-muted sm:text-xs">Lake Impact</p>
      </div>
    </div>
  );
}
