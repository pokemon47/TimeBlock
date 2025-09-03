import { createClient } from "@/lib/supabase/browser";

export async function finishTask(taskId: string, userId?: string) {
  const supabase = createClient();
  console.log("finishTask →", { taskId, userId });
  let q = supabase.from("tasks").update({ is_finished: true }).eq("id", taskId);
  if (userId) {
    // @ts-ignore chaining conditional filter
    q = q.eq("user_id", userId);
  }
  const { error } = await q;
  if (error) throw new Error(error.message);
}
