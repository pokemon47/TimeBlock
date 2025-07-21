"use client";
import React from "react";

export default function StatsFilters({
  category,
  setCategory,
  includeBreaks,
  setIncludeBreaks,
}: {
  category: string;
  setCategory: (cat: string) => void;
  includeBreaks: boolean;
  setIncludeBreaks: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
        className="px-3 py-1 text-sm border border-border rounded-md bg-background"
      >
        <option value="all">All Categories</option>
        <option value="study">Study</option>
        <option value="work">Work</option>
        <option value="exercise">Exercise</option>
        <option value="admin">Admin</option>
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeBreaks}
          onChange={e => setIncludeBreaks(e.target.checked)}
          className="rounded"
        />
        Include Breaks
      </label>
    </div>
  );
} 