"use client";
import React, { useState } from "react";

export default function StatsTabToggle({
  initialMode,
  onModeChange,
}: {
  initialMode: "day" | "week";
  onModeChange?: (mode: "day" | "week") => void;
}) {
  const [mode, setMode] = useState<"day" | "week">(initialMode);

  return (
    <div className="flex gap-2 ml-4">
      <button
        className={`px-4 py-1 rounded-full border text-sm transition-colors ${
          mode === "day"
            ? "bg-muted border-primary text-primary font-semibold"
            : "bg-transparent border-border text-muted-foreground hover:bg-accent"
        }`}
        onClick={() => {
          setMode("day");
          onModeChange?.("day");
        }}
      >
        Day
      </button>
      <button
        className={`px-4 py-1 rounded-full border text-sm transition-colors ${
          mode === "week"
            ? "bg-muted border-primary text-primary font-semibold"
            : "bg-transparent border-border text-muted-foreground hover:bg-accent"
        }`}
        onClick={() => {
          setMode("week");
          onModeChange?.("week");
        }}
      >
        Week
      </button>
    </div>
  );
} 