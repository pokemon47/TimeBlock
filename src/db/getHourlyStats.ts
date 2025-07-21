import { createClient } from '@/lib/supabase/server';

export type HourlyStat = {
  hour: number;
  minutes: number;
};

/**
 * Get today's hourly stats for a user: returns an array of 24 objects, one for each hour, with total minutes spent in that hour.
 */
export async function getHourlyStats(userId: string): Promise<HourlyStat[]> {
  const supabase = await createClient();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 1);

  // Fetch all time_logs for today
  const { data: logs, error } = await supabase
    .from('time_logs')
    .select('duration_actual,started_at')
    .eq('user_id', userId)
    .gte('started_at', start.toISOString())
    .lt('started_at', end.toISOString());
  if (error) throw new Error(error.message);

  // Aggregate minutes by hour
  const hourly: number[] = Array(24).fill(0);
  for (const log of logs ?? []) {
    if (!log.started_at || log.duration_actual == null) continue;
    const logDate = new Date(log.started_at);
    const hour = logDate.getUTCHours();
    hourly[hour] += log.duration_actual;
  }

  // Convert seconds to minutes and build result
  return hourly.map((minutes, hour) => ({
    hour,
    minutes: Math.round(minutes),
  }));
} 