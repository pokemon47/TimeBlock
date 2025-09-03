"use client";

import React from 'react';
import type { TodayStats } from '@/db/getTodayStats';

/**
 * SummaryCards component for the stats dashboard.
 * Receives today's summary stats as a prop.
 * @param data - TodayStats object
 * @param formatTime - Function to format minutes as a string
 */
export default function SummaryCards({
  data,
  formatTime,
}: {
  data: TodayStats;
  formatTime: (minutes: number) => string;
}) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Time Card */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Time</p>
            <p className="text-2xl font-semibold mt-1">{formatTime(data.actualMinutes)}</p>
          </div>
        </div>
      </div>
      {/* Planned vs Actual Card */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Planned vs Actual</p>
            <p className="text-2xl font-semibold mt-1">{formatTime(data.actualMinutes)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Planned: {formatTime(data.plannedMinutes)}
            </p>
          </div>
        </div>
      </div>
      {/* Focus Accuracy Card */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Focus Accuracy</p>
            <p className="text-2xl font-semibold mt-1">{data.accuracyPercent}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.accuracyPercent >= 80 ? 'Excellent' : data.accuracyPercent >= 60 ? 'Good' : 'Needs work'}
            </p>
          </div>
        </div>
      </div>
      {/* Tasks Completed Card (not available in today stats, so show breaks instead) */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Break Time</p>
            <p className="text-2xl font-semibold mt-1">{formatTime(data.breakMinutes)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Paused: {formatTime(data.pausedMinutes)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 