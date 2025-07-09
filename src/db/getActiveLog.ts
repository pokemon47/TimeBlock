import { createClient } from "@/lib/supabase/browser";
import type { Database } from "../../../types/supabase";

export type TimeLogRow = Database["public"]["Tables"]["time_logs"]["Row"];

export async function getActiveLog(userId: string): Promise<TimeLogRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("time_logs")
    .select("*")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
} 