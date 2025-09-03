import { createClient } from '@/lib/supabase/server';

/**
 * Get weekly stats for a user: returns an array of daily stats for the current week (Mon-Sun).
 */
export async function getWeekStats(userId: string) {
  function getWeekRange() {
    const now = new Date();
    // Start from Monday (ISO week)
    const day = now.getUTCDay() || 7;
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1, 0, 0, 0, 0));
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      days.push(new Date(d));
    }
    return days;
  }

  const supabase = await createClient();
  const days = getWeekRange();
  const results = [];

  for (const day of days) {
    const start = new Date(day);
    const end = new Date(day);
    end.setUTCDate(start.getUTCDate() + 1);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // Planned
    const { data: plannedRows, error: plannedErr } = await supabase
      .from('tasks')
      .select('duration_estimated')
      .eq('user_id', userId)
      .gte('created_at', startISO)
      .lt('created_at', endISO);
    if (plannedErr) throw new Error(plannedErr.message);
    const plannedMinutes = (plannedRows ?? []).reduce((sum, t) => sum + (t.duration_estimated ?? 0), 0) / 60;

    // Actual, overtime, paused
    const { data: logRows, error: logErr } = await supabase
      .from('time_logs')
      .select('duration_actual,overtime_duration,paused_ms,started_at')
      .eq('user_id', userId)
      .gte('started_at', startISO)
      .lt('started_at', endISO);
    if (logErr) throw new Error(logErr.message);
    let actualMinutes = 0, overtimeMinutes = 0, pausedMinutes = 0;
    for (const row of logRows ?? []) {
      actualMinutes += row.duration_actual ?? 0;
      overtimeMinutes += row.overtime_duration ?? 0;
      pausedMinutes += (row.paused_ms ?? 0) / 60000;
    }

    // Break
    const { data: breakRows, error: breakErr } = await supabase
      .from('break_logs')
      .select('duration_ms,started_at')
      .eq('user_id', userId)
      .gte('started_at', startISO)
      .lt('started_at', endISO);
    if (breakErr) throw new Error(breakErr.message);
    const breakMinutes = (breakRows ?? []).reduce((sum, b) => sum + (b.duration_ms ?? 0), 0) / 60000;

    // Accuracy
    const accuracyPercent = plannedMinutes > 0 ? Math.round((actualMinutes / plannedMinutes) * 100) : 0;

    results.push({
      date: start.toISOString().slice(0, 10),
      plannedMinutes: Math.round(plannedMinutes),
      actualMinutes: Math.round(actualMinutes),
      overtimeMinutes: Math.round(overtimeMinutes),
      pausedMinutes: Math.round(pausedMinutes),
      breakMinutes: Math.round(breakMinutes),
      accuracyPercent,
    });
  }

  return results;
} 