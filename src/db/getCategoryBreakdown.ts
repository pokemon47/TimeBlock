import { createClient } from '@/lib/supabase/server';

/**
 * Get category breakdown for a user: returns an array of { name, minutes, tasks, percent } for each category.
 */
export async function getCategoryBreakdown(userId: string, startDate: string, endDate: string) {
  const supabase = await createClient();

  // Get all time_logs for user
  const { data: logRows, error: logErr } = await supabase
    .from('time_logs')
    .select('duration_actual,task_id,started_at')
    .eq('user_id', userId)
    .gte('started_at', startDate)
    .lt('started_at', endDate);
  if (logErr) throw new Error(logErr.message);

  // Get all tasks for user
  const taskIds = (logRows ?? []).map(r => r.task_id).filter(Boolean) as string[];
  const { data: tasks, error: tasksErr } = await supabase
    .from('tasks')
    .select('id,category_id')
    .in('id', taskIds);
  if (tasksErr) throw new Error(tasksErr.message);

  // Get all categories
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
  const breakdown: Record<string, { minutes: number; tasks: number }> = {};
  let totalMinutes = 0;
  for (const row of logRows ?? []) {
    const task = (tasks ?? []).find(t => t.id === row.task_id);
    const catId = task?.category_id;
    const cat = (categories ?? []).find(c => c.id === catId);
    const catName = cat?.name || 'Uncategorised';
    if (!breakdown[catName]) breakdown[catName] = { minutes: 0, tasks: 0 };
    breakdown[catName].minutes += row.duration_actual ?? 0;
    breakdown[catName].tasks += 1;
    totalMinutes += row.duration_actual ?? 0;
  }

  // Convert to array and add percent
  const result = Object.entries(breakdown).map(([name, data]) => ({
    name,
    minutes: Math.round(data.minutes),
    tasks: data.tasks,
    percent: totalMinutes > 0 ? Math.round((data.minutes / totalMinutes) * 100) : 0,
  }));

  return result;
}

export type CategoryBreakdownRow = {
  name: string;
  minutes: number;
  tasks: number;
  percent: number;
}; 