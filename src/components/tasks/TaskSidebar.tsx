"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSidebar } from "@/contexts/SidebarContext";
import NewTaskForm from "./NewTaskForm";
import { createClient } from "@/lib/supabase/browser";
import TaskItem from "./TaskItem";

interface Props {
  /** The current authenticated user's id */
  userId: string;
}

export default function TaskSidebar({ userId }: Props) {
  const { open } = useSidebar();
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [search, setSearch] = useState("");

  // Local tasks state
  const [tasks, setTasks] = useState<any[]>([]);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  // Escape key handler for New Task modal
  useEffect(() => {
    if (!showNewTaskModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowNewTaskModal(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showNewTaskModal]);

  const fetchTasks = useCallback(async () => {
    const supabase = createClient();

    // Calculate today (UTC) boundaries like the server util
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    if (!error) {
      setTasks((data as any[]) ?? []);
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`tasks-list-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
        (payload) => {
          setTasks((prev) => {
            const evt = payload.eventType;
            if (evt === "INSERT") {
              return [...prev, payload.new];
            }
            if (evt === "UPDATE") {
              return prev.map((t) => (t.id === payload.new.id ? payload.new : t));
            }
            if (evt === "DELETE") {
              const filtered = prev.filter((t) => t.id !== payload.old.id);
              // Refetch to ensure consistency after a brief delay
              console.log("DOING DELETE")
              setTimeout(fetchTasks, 200);
              return filtered;
            }
            return prev;
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchTasks]);

  // Sidebar open state is managed by provider, no local collapse needed here

  // Helper for width classes
  const widthClass = open ? "w-[25vw] min-w-[300px]" : "w-0";

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`h-full ${widthClass} transition-all duration-300 bg-card border-r border-border overflow-y-auto`}
      >
        {open && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tasks</h2>
              <Button size="sm" onClick={() => setShowNewTaskModal(true)}>
                Add Task
              </Button>
            </div>

            <Input
              placeholder="Search… (not yet wired)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* TODO: filter / sort dropdowns – placeholders for now */}
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span>Filter</span>
              <span>Sort</span>
            </div>

            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks for today yet.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <TaskItem key={t.id} task={t as any} />
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>

      {/* New Task modal */}
      {showNewTaskModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowNewTaskModal(false)}
        >
          <div
            className="bg-background rounded p-6 w-full max-w-lg max-h-[90vh] overflow-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">New Task</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNewTaskModal(false)}>
                ✕
              </Button>
            </div>
            <NewTaskForm />
            <div className="flex justify-end mt-4">
              <Button variant="ghost" size="sm" onClick={() => setShowNewTaskModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 