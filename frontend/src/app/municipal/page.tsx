"use client";

import { Droplets, Building2, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import MunicipalDashboard from "@/components/MunicipalDashboard";
import Link from "next/link";

export default function MunicipalPage() {
  const { theme, toggle } = useTheme();

  return (
    <main className="min-h-screen bg-primary">
      {/* ── Top Nav ────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border-primary bg-nav backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500 sm:h-6 sm:w-6" />
            <span className="text-base font-bold tracking-tight sm:text-lg">
              HarvesSink
            </span>
            <span className="ml-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-500 dark:text-blue-300 sm:ml-2 sm:px-2 sm:text-xs">
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Nav links */}
            <div className="flex rounded-lg border border-border-primary bg-card p-0.5 sm:p-1">
              <Link
                href="/"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-secondary hover:text-primary sm:px-3 sm:py-1.5 sm:text-sm"
              >
                <Droplets className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Household</span>
              </Link>
              <span className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white sm:px-3 sm:py-1.5 sm:text-sm">
                <Building2 className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Municipal</span>
              </span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="rounded-lg border border-border-primary bg-card p-1.5 text-secondary hover:text-primary sm:p-2"
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Dashboard Content ──────────────────────────── */}
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <MunicipalDashboard />
      </div>
    </main>
  );
}
