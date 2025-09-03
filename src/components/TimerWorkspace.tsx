"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import BreakPickerModal from "@/components/BreakPickerModal";
import ExtendBreakModal from "@/components/ExtendBreakModal";
import { useTimer } from "@/contexts/TimerContext";
import { createClient } from "@/lib/supabase/browser";

function formatHMS(ms: number) {
  const negative = ms < 0;
  const totalSeconds = Math.abs(Math.floor(Math.abs(ms) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const formatted = [h, m, s].map((n) => n.toString().padStart(2, "0")).join(" : ");
  return negative ? `-${formatted}` : formatted;
}

export default function TimerWorkspace() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // --- All hooks must be called unconditionally before any conditional returns ---
  const timer = useTimer();
  const [now, setNow] = useState(() => Date.now());
  const [estimateSecs, setEstimateSecs] = useState(0);
  const [pastSecs, setPastSecs] = useState(0);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showOverPrompt, setShowOverPrompt] = useState(false);
  const lastOverPromptRef = useRef<number>(0);

  const fetchTaskMeta = useCallback(async (taskId: string) => {
    const supabase = createClient();
    const { data: taskRow } = await supabase.from("tasks").select("duration_estimated").eq("id", taskId).single();
    setEstimateSecs(taskRow?.duration_estimated ?? 0);

    const { data: logs } = await supabase
      .from("time_logs")
      .select("duration_actual, overtime_duration")
      .eq("task_id", taskId)
      .not("ended_at", "is", null);

    const secs = (logs ?? []).reduce((sum: number, row: any) => sum + (row.duration_actual ?? 0) + (row.overtime_duration ?? 0), 0);
    setPastSecs(secs);
  }, []);

  useEffect(() => {
    if (timer.activeTaskId) {
      fetchTaskMeta(timer.activeTaskId);
    } else {
      setEstimateSecs(0);
      setPastSecs(0);
    }
  }, [timer.activeTaskId, fetchTaskMeta]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = (() => {
    if (!timer.activeTaskId || estimateSecs === 0) return null;
    const sessionMs = timer.elapsedMs + (!timer.isPaused && timer.startedAt ? now - timer.startedAt : 0);
    return estimateSecs * 1000 - (pastSecs * 1000 + sessionMs);
  })();

  useEffect(() => {
    if (
      remainingMs !== null &&
      remainingMs <= 0 &&
      !showOverPrompt &&
      !timer.isOnBreak &&
      Date.now() - lastOverPromptRef.current > 10 * 60 * 1000
    ) {
      setShowOverPrompt(true);
    }
  }, [remainingMs, showOverPrompt, timer.isOnBreak]);

  useEffect(() => {
    setShowOverPrompt(false);
  }, [timer.activeTaskId]);


  // --- Conditional return after all hooks have been called ---
  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  let displayMs = 0;
  if (timer.isOnBreak && timer.breakStartedAt) {
    const elapsed = now - timer.breakStartedAt;
    displayMs = timer.breakDurationMs - elapsed;
  } else if (timer.activeTaskId) {
    displayMs = timer.elapsedMs;
    if (!timer.isPaused && timer.startedAt) {
      displayMs += now - timer.startedAt;
    }
    if (remainingMs !== null) {
      displayMs = remainingMs;
    }
  }

  const digits = formatHMS(displayMs);

  let subtitle: string;
  if (timer.isOnBreak) subtitle = "Break";
  else if (timer.activeTaskId && timer.isPaused) subtitle = "Paused";
  else if (timer.activeTaskId) subtitle = "Working";
  else subtitle = "Start a task";

  const digitColor = !timer.activeTaskId
    ? "text-black dark:text-white"
    : timer.isOnBreak
    ? "text-green-500"
    : timer.isPaused
    ? "text-yellow-500"
    : "text-primary";

  return (
    <div className="flex flex-col items-center justify-between h-full py-10 select-none">
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className={`font-mono text-8xl sm:text-9xl font-bold ${digitColor}`}>
          {digits}
        </div>
        <p className="text-lg text-muted-foreground">{subtitle}</p>
      </div>

      {timer.activeTaskId && !timer.isOnBreak && (
        <div className="flex justify-center gap-4 pb-8">
          {timer.isPaused ? (
            <Button size="lg" onClick={timer.resume}>
              Resume
            </Button>
          ) : (
            <Button size="lg" onClick={timer.pause}>
              Pause
            </Button>
          )}

          {remainingMs !== null && remainingMs < 0 ? (
            <Button variant="destructive" size="lg" onClick={() => timer.stop(0, true)}>
              Complete Task
            </Button>
          ) : (
            <>
              <Button variant="destructive" size="lg" onClick={() => timer.stop()}>
                Stop
              </Button>
              <Button variant="secondary" size="lg" onClick={() => timer.stop(0, true)}>
                Complete Task
              </Button>
            </>
          )}
          <Button variant="secondary" size="lg" onClick={() => setShowBreakModal(true)}>
            Take Break
          </Button>
        </div>
      )}

      {timer.isOnBreak && (
        <div className="flex justify-center gap-4 pb-8">
          <Button size="lg" onClick={timer.resumeFromBreak}>
            End Break
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setShowExtendModal(true)}>
            Extend
          </Button>
          <Button variant="destructive" size="lg" onClick={() => timer.stop()}>
            Stop
          </Button>
        </div>
      )}

      <BreakPickerModal open={showBreakModal} onClose={() => setShowBreakModal(false)} />
      <ExtendBreakModal open={showExtendModal} onClose={() => setShowExtendModal(false)} />

      {showOverPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded p-6 w-full max-w-sm">
            <p className="mb-4 text-sm">Task time is up. What would you like to do?</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowOverPrompt(false);
                  lastOverPromptRef.current = Date.now();
                }}
              >
                Continue overtime
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setShowOverPrompt(false);
                  timer.stop(0, true);
                }}
              >
                Complete Task
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 