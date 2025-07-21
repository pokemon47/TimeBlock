import React from 'react';

/**
 * WeeklyBarChart component for the stats dashboard.
 * @param data - Array of ChartData for each day of the week
 * @param selectedDay - The currently selected day (number)
 * @param onSelectDay - Callback when a day is selected
 * @param mode - 'day' or 'week'
 * @param maxMinutes - Maximum minutes for scaling bar heights
 */
export function WeeklyBarChart({
  data,
  selectedDay,
  onSelectDay,
  mode,
  maxMinutes,
}: {
  data: { value: number; minutes: number; label: string }[];
  selectedDay: number;
  onSelectDay: (day: number, switchToDayMode?: boolean) => void;
  mode: 'day' | 'week';
  maxMinutes: number;
}) {
  return (
    <div className="flex items-end justify-between h-32 gap-1">
      {data.map((d, index) => {
        const isSelected = selectedDay === d.value;
        const isToday = d.value === 4; // Thursday
        const isActive = mode === 'day' ? isSelected : true;
        return (
          <div
            key={index}
            className="flex-1 flex flex-col items-center cursor-pointer"
            onClick={() => {
              if (mode === 'day') {
                onSelectDay(d.value);
              } else {
                onSelectDay(d.value, true);
              }
            }}
          >
            <div className="w-full bg-muted rounded-t-sm relative group">
              {isActive ? (
                <div className="flex flex-col h-full">
                  <div
                    className="bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-600"
                    style={{
                      height: `${(d.minutes * 0.4) / maxMinutes * 100}%`,
                      minHeight: d.minutes > 0 ? '2px' : '0',
                    }}
                    title="Study"
                  />
                  <div
                    className="bg-green-500 transition-all duration-300 hover:bg-green-600"
                    style={{
                      height: `${(d.minutes * 0.36) / maxMinutes * 100}%`,
                      minHeight: d.minutes > 0 ? '2px' : '0',
                    }}
                    title="Work"
                  />
                  <div
                    className="bg-purple-500 transition-all duration-300 hover:bg-purple-600"
                    style={{
                      height: `${(d.minutes * 0.14) / maxMinutes * 100}%`,
                      minHeight: d.minutes > 0 ? '2px' : '0',
                    }}
                    title="Exercise"
                  />
                  <div
                    className="bg-orange-500 rounded-b-sm transition-all duration-300 hover:bg-orange-600"
                    style={{
                      height: `${(d.minutes * 0.1) / maxMinutes * 100}%`,
                      minHeight: d.minutes > 0 ? '2px' : '0',
                    }}
                    title="Admin"
                  />
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div
                    className="bg-gray-400 rounded-t-sm"
                    style={{
                      height: `${(d.minutes * 0.4) / maxMinutes * 100}%`,
                      minHeight: d.minutes > 0 ? '2px' : '0',
                    }}
                    title="Study"
                  />
                  <div
                    className="bg-gray-400"
                    style={{
                      height: `${(d.minutes * 0.36) / maxMinutes * 100}%`,
                      minHeight: d.minutes > 0 ? '2px' : '0',
                    }}
                    title="Work"
                  />
                  <div
                    className="bg-gray-400"
                    style={{
                      height: `${(d.minutes * 0.14) / maxMinutes * 100}%`,
                      minHeight: d.minutes > 0 ? '2px' : '0',
                    }}
                    title="Exercise"
                  />
                  <div
                    className="bg-gray-400 rounded-b-sm"
                    style={{
                      height: `${(d.minutes * 0.1) / maxMinutes * 100}%`,
                      minHeight: d.minutes > 0 ? '2px' : '0',
                    }}
                    title="Admin"
                  />
                </div>
              )}
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                <div className="text-center">
                  <div className="font-medium">{d.label}</div>
                  <div>Total: {d.minutes}m</div>
                  {isActive && (
                    <>
                      <div>Study: {Math.round(d.minutes * 0.4)}m</div>
                      <div>Work: {Math.round(d.minutes * 0.36)}m</div>
                      <div>Exercise: {Math.round(d.minutes * 0.14)}m</div>
                      <div>Admin: {Math.round(d.minutes * 0.1)}m</div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <span className={`text-xs mt-2 ${isToday ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
} 