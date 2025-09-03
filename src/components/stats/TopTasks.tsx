"use client";

import React from 'react';
import type { TopTaskDisplayRow } from '@/db/getTopTasks';

/**
 * TopTasks component for the stats dashboard.
 * Receives the most time-spent tasks as a prop.
 * @param data - Array of TopTaskDisplayRow
 * @param formatTime - Function to format minutes as a string
 */
export default function TopTasks({
  data,
  formatTime,
}: {
  data: TopTaskDisplayRow[];
  formatTime: (minutes: number) => string;
}) {
  if (!data || data.length === 0) return <div className="p-4 text-center text-muted-foreground">No top tasks data.</div>;

  const maxActualMinutes = Math.max(...data.map(task => task.actualMinutes));

  return (
    <div className="space-y-4">
      {data.map((task) => (
        <div key={task.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
          {/* Task info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{task.title}</h3>
              <span className={`px-2 py-0.5 text-xs rounded-full text-white ${task.categoryColor || 'bg-gray-500'}`}>
                {task.category}
              </span>
            </div>
            {/* Time labels */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Planned: {formatTime(task.plannedMinutes)}</span>
              <span>Actual: {formatTime(task.actualMinutes)}</span>
              <span className={`${task.isOvertime ? 'text-red-500' : 'text-green-500'}`}>Δ: {task.isOvertime ? '+' : '-'}{formatTime(Math.abs(task.actualMinutes - task.plannedMinutes))} {task.isOvertime ? 'overtime' : 'under'}</span>
            </div>
          </div>
          {/* Duration bar */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-full bg-muted-foreground/20 rounded-full h-2 relative">
              {/* Planned time background */}
              <div
                className="absolute top-0 left-0 h-full bg-muted-foreground/40 rounded-full"
                style={{ width: `${(task.plannedMinutes / maxActualMinutes) * 100}%` }}
              />
              {/* Actual time bar */}
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${task.isOvertime ? 'bg-red-500' : 'bg-primary'}`}
                style={{ width: `${(task.actualMinutes / maxActualMinutes) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTime(task.actualMinutes)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
} 