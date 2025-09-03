import { createClient } from '@/lib/supabase/server';
import type { Database } from '../../../types/supabase';

/**
 * Type for a time_log row joined with its task and category, using generated types as building blocks.
 */
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type TaskRow = Database['public']['Tables']['tasks']['Row'];
type TimeLogRow = Database['public']['Tables']['time_logs']['Row'];

// This type matches the shape returned by the deep join query
export type TopTaskRow = Omit<TimeLogRow, 'tasks'> & {
  tasks: (Omit<TaskRow, 'categories'> & {
    categories: CategoryRow[] | null;
  }) | null;
};

// Type for the display objects returned by getTopTasks
export type TopTaskDisplayRow = {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  plannedMinutes: number;
  actualMinutes: number;
  overtimeMinutes: number;
  isOvertime: boolean;
};

/**
 * Get the top 10 most time-spent tasks for a user, ordered by actualMinutes descending.
 * Returns: id, title, category, categoryColor, plannedMinutes, actualMinutes, isOvertime
 */
export async function getTopTasks(userId: string, startDate: string, endDate: string): Promise<TopTaskDisplayRow[]> {
  const supabase = await createClient();

  // Get all time_logs for user, join with tasks and categories
  const { data: logs, error: logErr } = await supabase
    .from('time_logs')
    .select(`id, task_id, duration_actual, overtime_duration, started_at, tasks (id, title, duration_estimated, category_id, categories (id, name, color_hex))`)
    .eq('user_id', userId)
    .gte('started_at', startDate)
    .lt('started_at', endDate);
  if (logErr) throw new Error(logErr.message);

  // Use unknown cast first to avoid TS linter error with deep joins
  const typedLogs = logs as unknown as TopTaskRow[];

  // Aggregate by task
  const taskMap: Record<string, any> = {};
  for (const log of typedLogs ?? []) {
    let task = log.tasks;
    if (Array.isArray(task)) task = task[0];
    if (!task) continue;
    // Handle categories as array or object
    let categoryArr = task.categories as CategoryRow[] | null;
    let categoryObj: CategoryRow | null = null;
    if (Array.isArray(categoryArr)) categoryObj = categoryArr[0] ?? null;
    else if (categoryArr && typeof categoryArr === 'object') categoryObj = categoryArr as any;
    // Now categoryObj is either a single object or null
    if (!taskMap[task.id]) {
      taskMap[task.id] = {
        id: task.id,
        title: task.title,
        plannedMinutes: Math.round((task.duration_estimated ?? 0) / 60),
        actualMinutes: 0,
        overtimeMinutes: 0,
        category: categoryObj?.name || 'Uncategorised',
        categoryColor: categoryObj?.color_hex ? `bg-[${categoryObj.color_hex}]` : 'bg-gray-500',
      };
    }
    taskMap[task.id].actualMinutes += log.duration_actual ?? 0;
    taskMap[task.id].overtimeMinutes += log.overtime_duration ?? 0;
  }

  // Convert to array and sort by actualMinutes descending
  const tasks: TopTaskDisplayRow[] = Object.values(taskMap)
    .map((t: any) => ({
      ...t,
      isOvertime: t.overtimeMinutes > 0,
    }))
    .sort((a, b) => b.actualMinutes - a.actualMinutes)
    .slice(0, 10);

  return tasks;
} 