"use client";

import React from 'react';
import type { CategoryBreakdownRow } from '@/db/getCategoryBreakdown';

/**
 * CategoryBreakdown component for the stats dashboard.
 * Receives category breakdown as a prop.
 * @param data - Array of CategoryBreakdownRow
 * @param formatTime - Function to format minutes as a string
 */
export default function CategoryBreakdown({
  data,
  formatTime,
}: {
  data: CategoryBreakdownRow[];
  formatTime: (minutes: number) => string;
}) {
  if (!data || data.length === 0) return <div className="p-4 text-center text-muted-foreground">No category data.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map((category) => (
        <div
          key={category.name}
          className="bg-muted rounded-xl p-4 hover:bg-muted/80 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center text-white text-sm font-medium`}>
                {category.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-medium">{category.name}</h3>
                <p className="text-sm text-muted-foreground">{category.percent}% of total</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatTime(category.minutes)}</p>
            </div>
          </div>
          {/* Subcategory breakdown not available in API, so skip */}
        </div>
      ))}
    </div>
  );
} 