import { createClient } from "@/lib/supabase/server";
import type { Database } from "../../../types/supabase";

export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];

export async function createTask(values: TaskInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").insert(values).single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
} 