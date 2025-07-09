import { createClient } from "@/lib/supabase/server";
import type { Database } from "../../../types/supabase";

export type TaskUpdate = Partial<Database["public"]["Tables"]["tasks"]["Update"]>;
export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export async function updateTask(taskId: string, values: TaskUpdate): Promise<TaskRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").update(values).eq("id", taskId).single();
  if (error) throw new Error(error.message);
  return data as TaskRow;
} 