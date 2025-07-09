import { createClient } from "@/lib/supabase/server";
import type { Database } from "../../../types/supabase";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

/**
 * Return tasks created on the provided date (defaults to today, UTC) for a specific user.
 * Orders by created_at ASC.
 */
export async function listTasksToday(userId: string, date: Date = new Date()): Promise<TaskRow[]> {
  // Calculate UTC day range
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as TaskRow[]) ?? [];
} 