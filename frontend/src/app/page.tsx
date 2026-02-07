"use client";

import { useState } from "react";
import { Droplets, Building2 } from "lucide-react";
import HouseholdDashboard from "@/components/HouseholdDashboard";
import MunicipalDashboard from "@/components/MunicipalDashboard";

export default function Home() {
  const [persona, setPersona] = useState<"household" | "municipal">(
    "household"
  );

  return (
    <main className="min-h-screen">
      {/* ── Top Nav ────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-harvest-border bg-harvest-dark/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-6 w-6 text-blue-400" />
            <span className="text-lg font-bold tracking-tight">
              HarvesSink
            </span>
            <span className="ml-2 rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
              LIVE
            </span>
          </div>

          {/* Persona toggle */}
          <div className="flex rounded-lg border border-harvest-border bg-harvest-card p-1">
            <button
              onClick={() => setPersona("household")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                persona === "household"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Droplets className="h-4 w-4" />
              Household
            </button>
            <button
              onClick={() => setPersona("municipal")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                persona === "municipal"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Building2 className="h-4 w-4" />
              Municipal
            </button>
          </div>
        </div>
      </nav>

      {/* ── Dashboard Content ──────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {persona === "household" ? (
          <HouseholdDashboard />
        ) : (
          <MunicipalDashboard />
        )}
      </div>
    </main>
  );
}
