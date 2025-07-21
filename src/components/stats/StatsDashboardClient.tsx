"use client";
import React, { useState } from "react";
import StatsTabToggle from "@/components/stats/StatsTabToggle";
import { WeeklyBarChart } from "@/components/stats/WeeklyBarChart";
import { HourlyBarChart } from "@/components/stats/HourlyBarChart";
import SummaryCards from "@/components/stats/SummaryCards";
import CategoryBreakdown from "@/components/stats/CategoryBreakdown";
import TopTasks from "@/components/stats/TopTasks";
import type { TopTaskDisplayRow } from "@/db/getTopTasks";
import type { CategoryBreakdownRow } from "@/db/getCategoryBreakdown";
import type { TodayStats } from "@/db/getTodayStats";

export default function StatsDashboardClient({
  weeklyData,
  hourlyData,
  todayStats,
  categoryBreakdown,
  topTasks,
}: {
  weeklyData: { value: number; minutes: number; label: string }[];
  hourlyData: { value: number; minutes: number; label: string }[];
  todayStats: TodayStats;
  categoryBreakdown: CategoryBreakdownRow[];
  topTasks: TopTaskDisplayRow[];
}) {
  function formatTime(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }
  const [mode, setMode] = useState<'day' | 'week'>("week");

  // For demo: you can add logic to filter/aggregate data for day/week here if needed
  const maxWeeklyMinutes = Math.max(...weeklyData.map((d) => d.minutes));
  const maxHourlyMinutes = Math.max(...hourlyData.map((d) => d.minutes));

  return (
    <main className="max-w-4xl mx-auto p-0 sm:p-6">
      {/* Top nav */}
      <div className="px-4 sm:px-0 py-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Time Analytics</h1>
            {/* You can add date context here if needed */}
          </div>
          {/* Tab toggle (client component) */}
          <StatsTabToggle initialMode={mode} onModeChange={setMode} />
        </div>
      </div>

      {/* Weekly Overview Graph */}
      <div className="px-4 sm:px-0 mt-6">
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Weekly Overview</h2>
              <p className="text-sm text-muted-foreground">
                {mode === 'day' ? 'Click a day to see details' : 'Your activity throughout the week'}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Average: {formatTime(Math.round(weeklyData.reduce((sum, d) => sum + d.minutes, 0) / 7))} per day
            </div>
          </div>
          <WeeklyBarChart
            data={weeklyData}
            selectedDay={0} // Placeholder, can be made interactive
            onSelectDay={() => {}}
            mode={mode}
            maxMinutes={maxWeeklyMinutes}
          />
          {/* Category legend */}
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Study</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Work</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Exercise</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Breakdown (only for day mode) */}
      {mode === 'day' && (
        <div className="px-4 sm:px-0 mt-6">
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Hourly Activity</h2>
                <p className="text-sm text-muted-foreground">Your focus throughout the day</p>
              </div>
              <div className="text-sm text-muted-foreground">
                Peak: 14:00 ({formatTime(60)})
              </div>
            </div>
            <HourlyBarChart
              data={hourlyData}
              maxMinutes={maxHourlyMinutes}
              formatTime={formatTime}
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="px-4 sm:px-0 mt-6">
        <SummaryCards data={todayStats} formatTime={formatTime} />
      </div>

      {/* Category Breakdown */}
      <div className="px-4 sm:px-0 mt-6">
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Time by Category</h2>
              <p className="text-sm text-muted-foreground">Where your time goes</p>
            </div>
          </div>
          <CategoryBreakdown data={categoryBreakdown} formatTime={formatTime} />
        </div>
      </div>

      {/* Most Time-Spent Tasks */}
      <div className="px-4 sm:px-0 mt-6">
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Most Time-Spent Tasks</h2>
              <p className="text-sm text-muted-foreground">Your most demanding activities</p>
            </div>
          </div>
          <TopTasks data={topTasks} formatTime={formatTime} />
        </div>
      </div>
    </main>
  );
} 