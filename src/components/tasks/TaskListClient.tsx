"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import TaskItem from "@/components/tasks/TaskItem";
import { Input } from "@/components/ui/input";

interface Props {
  userId: string;
}

export default function TaskListClient({ userId }: Props) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let ignore = false;
    const channel = supabase
      .channel('tasks-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, payload => {
        // refetch list on any change for this user
        load();
      })
      .subscribe();

    async function load() {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (!ignore) setTasks(data ?? []);
    }

    load();
    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const filtered = tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 space-y-4">
      <Input
        placeholder="Search tasks…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full"
      />
      <ul className="space-y-2">
        {filtered.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </ul>
    </div>
  );
} 