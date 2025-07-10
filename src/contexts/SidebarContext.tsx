"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useTimer } from "@/contexts/TimerContext";

interface SidebarContextValue {
  open: boolean;
  toggle: () => void;
  setOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const timer = useTimer();

  // Auto-collapse when a task is actively running (and not paused)
  useEffect(() => {
    if (timer.activeTaskId && !timer.isPaused) {
      setOpen(false);
    }
  }, [timer.activeTaskId, timer.isPaused]);

  const toggle = () => setOpen((p) => !p);

  return <SidebarContext.Provider value={{ open, toggle, setOpen }}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
} 