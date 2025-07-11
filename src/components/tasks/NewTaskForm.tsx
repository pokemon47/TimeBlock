"use client";

import TaskForm from "./TaskForm";
import { createClient } from "@/lib/supabase/browser";

export default function NewTaskForm() {
  const supabase = createClient();

  async function handleCreate(payload: {
    title: string;
    duration_estimated: number;
    priority: string;
    difficulty: number;
    category_id: string | null;
  }) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (!user || error) throw new Error("Not authenticated");

      const { error: insertErr } = await supabase.from("tasks").insert({
        user_id: user.id,
      title: payload.title,
      duration_estimated: payload.duration_estimated,
      priority: payload.priority,
      difficulty: payload.difficulty,
      category_id: payload.category_id || null,
    });
    if (insertErr) throw new Error(insertErr.message);
  }

  return <TaskForm onSubmit={handleCreate} submitLabel="Add" />;
} 