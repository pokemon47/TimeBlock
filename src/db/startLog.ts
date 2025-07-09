import { createClient } from "@/lib/supabase/browser";
import type { Database } from "../../../types/supabase";

type TimeLogInsert = Database["public"]["Tables"]["time_logs"]["Insert"];

export async function startLog(userId: string, taskId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("time_logs")
    .insert({
      user_id: userId,
      task_id: taskId,
      started_at: new Date().toISOString(),
      paused_ms: 0,
    } satisfies TimeLogInsert)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data!.id as string;
} 