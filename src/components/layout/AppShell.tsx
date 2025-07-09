"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import TimerScreen from "@/components/timer/TimerScreen";
import { useTimer } from "@/contexts/TimerContext";
import clsx from "clsx";
import TaskListClient from "@/components/tasks/TaskListClient";
import AddTaskModal from "@/components/tasks/AddTaskModal";

interface Props {
  user: { id: string; email?: string | null };
  children: React.ReactNode;
}

export default function AppShell({ user, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const timer = useTimer();

  // Auto-hide sidebar when a task is running and not paused
  const showSidebar = sidebarOpen;

  // Auto-collapse when a task starts running
  useEffect(() => {
    if (timer.activeTaskId && !timer.isPaused) {
      setSidebarOpen(false);
    }
  }, [timer.activeTaskId]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header with toggle */}
      <Header
        user={user}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={clsx(
            "transition-all duration-300 border-r bg-card overflow-y-auto",
            showSidebar ? "w-full max-w-[25vw]" : "w-0 overflow-hidden"
          )}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <h2 className="text-sm font-semibold">Tasks</h2>
            <AddTaskModal />
          </div>
          <TaskListClient userId={user.id} />
        </aside>

        {/* Main timer panel */}
        <main className="flex-1 overflow-y-auto">
          <TimerScreen />
        </main>
      </div>
    </div>
  );
} 