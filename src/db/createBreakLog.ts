import { createClient } from "@/lib/supabase/browser";
import type { Database } from "../../../types/supabase";
type BreakInsert = Database["public"]["Tables"]["break_logs"]["Insert"];

/**
 * Record a completed break in Supabase.
 * @param userId     User ID owning this break
 * @param startedAt  ISO timestamp when the break began
 * @param endedAt    ISO timestamp when the break ended
 * @param durationMs Total milliseconds of the break
 */
export async function createBreakLog(
  userId: string,
  startedAt: string,
  endedAt: string,
  durationMs: number
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("break_logs")
    .insert({
      user_id: userId,
      started_at: startedAt,
      ended_at: endedAt,
      duration_ms: durationMs,
    } as BreakInsert);

  if (error) throw new Error(error.message);
} 