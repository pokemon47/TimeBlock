import React from 'react';

/**
 * HourlyBarChart component for the stats dashboard.
 * @param data - Array of ChartData for each hour of the day
 * @param maxMinutes - Maximum minutes for scaling bar heights
 * @param formatTime - Function to format minutes as a string
 */
export function HourlyBarChart({
  data,
  maxMinutes,
  formatTime,
}: {
  data: { value: number; minutes: number; label: string }[];
  maxMinutes: number;
  formatTime: (minutes: number) => string;
}) {
  return (
    <div className="flex items-end justify-between h-32 gap-1">
      {data.map((d, index) => (
        <div key={index} className="flex-1 flex flex-col items-center">
          <div className="w-full bg-muted rounded-t-sm relative group">
            <div
              className="bg-primary rounded-t-sm transition-all duration-300 hover:bg-primary/80"
              style={{
                height: `${(d.minutes / maxMinutes) * 100}%`,
                minHeight: d.minutes > 0 ? '4px' : '0',
              }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              {formatTime(d.minutes)}
            </div>
          </div>
          <span className="text-xs text-muted-foreground mt-2">{d.label}</span>
        </div>
      ))}
    </div>
  );
} 