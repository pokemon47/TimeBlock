import { createClient } from '@/lib/supabase/server';

/**
 * Get today's stats for a user: planned, actual, overtime, paused, break minutes, accuracy, and category breakdown.
 */
export async function getTodayStats(userId: string) {
  function getTodayRange() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  const supabase = await createClient();
  const { start, end } = getTodayRange();

  // Planned minutes: sum of today's task estimates
  const { data: plannedRows, error: plannedErr } = await supabase
    .from('tasks')
    .select('duration_estimated')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lt('created_at', end);
  if (plannedErr) throw new Error(plannedErr.message);
  const plannedMinutes = (plannedRows ?? []).reduce((sum, t) => sum + (t.duration_estimated ?? 0), 0) / 60;

  // Actual, overtime, paused: sum from today's time_logs
  const { data: logRows, error: logErr } = await supabase
    .from('time_logs')
    .select('duration_actual,overtime_duration,paused_ms,started_at')
    .eq('user_id', userId)
    .gte('started_at', start)
    .lt('started_at', end);
  if (logErr) throw new Error(logErr.message);
  let actualMinutes = 0, overtimeMinutes = 0, pausedMinutes = 0;
  for (const row of logRows ?? []) {
    actualMinutes += row.duration_actual ?? 0;
    overtimeMinutes += row.overtime_duration ?? 0;
    pausedMinutes += (row.paused_ms ?? 0) / 60000;
  }

  // Break minutes: sum from today's break_logs
  const { data: breakRows, error: breakErr } = await supabase
    .from('break_logs')
    .select('duration_ms,started_at')
    .eq('user_id', userId)
    .gte('started_at', start)
    .lt('started_at', end);
  if (breakErr) throw new Error(breakErr.message);
  const breakMinutes = (breakRows ?? []).reduce((sum, b) => sum + (b.duration_ms ?? 0), 0) / 60000;

  // Category breakdown: sum actual minutes per category
  const { data: catRows, error: catErr } = await supabase
    .from('time_logs')
    .select('duration_actual,task_id')
    .eq('user_id', userId)
    .gte('started_at', start)
    .lt('started_at', end);
  if (catErr) throw new Error(catErr.message);
  const categoryBreakdown = {} as Record<string, { minutes: number; tasks: number }>;
  if (catRows && catRows.length > 0) {
    // Fetch all tasks for today
    const taskIds = catRows.map(r => r.task_id).filter(Boolean) as string[];
    const { data: tasks, error: tasksErr } = await supabase
      .from('tasks')
      .select('id,category_id')
      .in('id', taskIds);
    if (tasksErr) throw new Error(tasksErr.message);
    // Fetch all categories
    const catIds = [...new Set((tasks ?? []).map(t => t.category_id).filter(Boolean))] as string[];
    let categories: { id: string; name: string }[] = [];
    if (catIds.length > 0) {
      const { data: cats, error: catsErr } = await supabase
        .from('categories')
        .select('id,name');
      if (catsErr) throw new Error(catsErr.message);
      categories = (cats ?? []).filter((c: { id: string }) => catIds.includes(c.id));
    }
    // Build breakdown
    for (const row of catRows) {
      const task = (tasks ?? []).find(t => t.id === row.task_id);
      const catId = task?.category_id;
      const cat = (categories ?? []).find(c => c.id === catId);
      const catName = cat?.name || 'Uncategorised';
      if (!categoryBreakdown[catName]) categoryBreakdown[catName] = { minutes: 0, tasks: 0 };
      categoryBreakdown[catName].minutes += row.duration_actual ?? 0;
      categoryBreakdown[catName].tasks += 1;
    }
    // Convert seconds to minutes
    for (const k of Object.keys(categoryBreakdown)) {
      categoryBreakdown[k].minutes = Math.round(categoryBreakdown[k].minutes);
    }
  }

  // Planning accuracy
  const accuracyPercent = plannedMinutes > 0 ? Math.round((actualMinutes / plannedMinutes) * 100) : 0;

  return {
    plannedMinutes: Math.round(plannedMinutes),
    actualMinutes: Math.round(actualMinutes),
    overtimeMinutes: Math.round(overtimeMinutes),
    pausedMinutes: Math.round(pausedMinutes),
    breakMinutes: Math.round(breakMinutes),
    accuracyPercent,
    categoryBreakdown,
  };
}

export type TodayStats = {
  plannedMinutes: number;
  actualMinutes: number;
  overtimeMinutes: number;
  pausedMinutes: number;
  breakMinutes: number;
  accuracyPercent: number;
  categoryBreakdown: Record<string, { minutes: number; tasks: number }>;
}; 