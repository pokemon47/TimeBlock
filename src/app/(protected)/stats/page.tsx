import { createClient } from '@/lib/supabase/server';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import StatsDashboardClient from '@/components/stats/StatsDashboardClient';
import { getTopTasks, TopTaskDisplayRow } from '@/db/getTopTasks';
import { getCategoryBreakdown, CategoryBreakdownRow } from '@/db/getCategoryBreakdown';
import { getTodayStats } from '@/db/getTodayStats';
import { getWeekStats } from '@/db/getWeekStats';
import { getHourlyStats } from '@/db/getHourlyStats';

const getDateContext = (mode: 'day' | 'week', date: Date) => {
  if (mode === 'day') {
    return format(date, 'EEEE, d MMMM');
  } else {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    return `Week of ${format(start, 'd MMM')} – ${format(end, 'd MMM')}`;
  }
};

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Should be handled by middleware, but fallback
    return null;
  }

  // Get real weekly and hourly data
  const weeklyStats = await getWeekStats(user.id);
  const weeklyData = weeklyStats.map((stat, i) => ({
    value: i + 1, // 1=Mon, 7=Sun
    minutes: stat.actualMinutes,
    label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
  }));
  const hourlyDataRaw = await getHourlyStats(user.id);
  const hourlyData = hourlyDataRaw.map(({ hour, minutes }) => ({
    value: hour,
    minutes,
    label: `${hour}`,
  }));
  const maxWeeklyMinutes = Math.max(...weeklyData.map((d) => d.minutes));
  const maxHourlyMinutes = Math.max(...hourlyData.map((d) => d.minutes));

  // For now, default to week mode and current week
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  // For "week" mode, use weekStart/weekEnd; for "day" mode, use dayStart/dayEnd
  // (Later, this will be dynamic based on navigation)
  const [topTasks, categoryBreakdown, todayStats] = await Promise.all([
    getTopTasks(user.id, weekStart.toISOString(), weekEnd.toISOString()),
    getCategoryBreakdown(user.id, weekStart.toISOString(), weekEnd.toISOString()),
    getTodayStats(user.id),
  ]);

  return (
    <StatsDashboardClient
      weeklyData={weeklyData}
      hourlyData={hourlyData}
      todayStats={todayStats}
      categoryBreakdown={categoryBreakdown}
      topTasks={topTasks}
    />
  );
} 