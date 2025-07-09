import { createClient } from "@/lib/supabase/browser";

/**
 * Finalise a running log.
 * @param logId        The `time_logs.id` to update
 * @param durationSecs Total active seconds (excluding pauses)
 * @param pausedMs     Accumulated paused milliseconds during the session
 * @param overtime     Optional overtime minutes recorded (defaults 0 → null)
 */
export async function stopLog(
  logId: string,
  durationSecs: number,
  pausedMs: number,
  overtime = 0
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("time_logs")
    .update({
      ended_at: new Date().toISOString(),
      duration_actual: durationSecs,
      overtime_duration: overtime || null,
      paused_ms: pausedMs,
    })
    .eq("id", logId);

  if (error) throw new Error(error.message);
} 