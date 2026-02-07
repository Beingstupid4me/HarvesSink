"use client";

import { useState } from "react";
import { postApi } from "@/lib/api";
import { FlaskConical } from "lucide-react";

const SCENARIOS = [
  { id: "clean", label: "Clean Water", emoji: "💧" },
  { id: "dishwashing", label: "Dishwashing", emoji: "🍽️" },
  { id: "vegetable_wash", label: "Veggie Wash", emoji: "🥦" },
  { id: "contamination", label: "Contamination", emoji: "☠️" },
  { id: "pipe_breach", label: "Pipe Breach", emoji: "🚰" },
];

export default function ScenarioSwitcher() {
  const [active, setActive] = useState("clean");
  const [loading, setLoading] = useState(false);

  const switchScenario = async (id: string) => {
    setLoading(true);
    try {
      await postApi(`/api/scenario/${id}`);
      setActive(id);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <FlaskConical className="hidden h-4 w-4 text-muted sm:block" />
      <span className="hidden text-xs text-muted sm:inline">Scenario:</span>
      <div className="flex gap-0.5 sm:gap-1">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => switchScenario(s.id)}
            disabled={loading}
            title={s.label}
            className={`rounded px-1.5 py-1 text-xs transition-all sm:px-2 ${
              active === s.id
                ? "bg-blue-600/30 text-blue-600 dark:text-blue-300"
                : "text-muted hover:bg-gray-100 hover:text-secondary dark:hover:bg-slate-700"
            }`}
          >
            {s.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
