"use client";

import { useEffect, useState, useCallback } from "react";
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
  const timer = useTimer();
  const [now, setNow] = useState(() => Date.now());

  // Task meta
  const [estimateSecs, setEstimateSecs] = useState(0); // 0 means no estimate
  const [pastSecs, setPastSecs] = useState(0);

  // Fetch task data & past logs when activeTaskId changes
  const fetchTaskMeta = useCallback(async (taskId: string) => {
    const supabase = createClient();

    // Task row for estimate
    const {
      data: taskRow,
      error: taskErr,
    } = await supabase.from("tasks").select("duration_estimated").eq("id", taskId).single();
    if (!taskErr && taskRow) {
      setEstimateSecs(taskRow.duration_estimated ?? 0);
    } else {
      setEstimateSecs(0);
    }

    // Past time logs
    const { data: logs } = await supabase
      .from("time_logs")
      .select("duration_actual, overtime_duration")
      .eq("task_id", taskId)
      .not("ended_at", "is", null);

    const secs = (logs ?? []).reduce((sum: number, row: any) => {
      const d = row.duration_actual ?? 0;
      const o = row.overtime_duration ?? 0;
      return sum + d + o;
    }, 0);
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

  // tick each second when timer running or on break
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  let displayMs = 0;
  if (timer.isOnBreak && timer.breakStartedAt) {
    const elapsed = now - timer.breakStartedAt;
    displayMs = timer.breakDurationMs - elapsed;
  } else if (timer.activeTaskId) {
    // elapsed for current session
    displayMs = timer.elapsedMs;
    if (!timer.isPaused && timer.startedAt) {
      displayMs += now - timer.startedAt;
    }

    const remainingMs = estimateSecs > 0 ? estimateSecs * 1000 - (pastSecs * 1000 + displayMs) : null;
    if (remainingMs !== null) {
      // countdown (could be negative for overtime)
      displayMs = remainingMs;
    }
  }

  const digits = formatHMS(displayMs);

  // Status subtitle
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
  const digitStyle = undefined;
  const containerStyle = undefined;

  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);

  return (
    <div className="flex flex-col items-center justify-between h-full py-10 select-none">
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className={`font-mono text-8xl sm:text-9xl font-bold ${digitColor}`}>
          {digits}
        </div>
        <p className="text-lg text-muted-foreground">{subtitle}</p>
      </div>

      {/* Controls */}
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
          <Button variant="destructive" size="lg" onClick={() => timer.stop()}>
            Stop
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setShowBreakModal(true)}>
            Take Break
          </Button>
        </div>
      )}

      {/* Controls during break */}
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

      {/* Break picker modal */}
      <BreakPickerModal open={showBreakModal} onClose={() => setShowBreakModal(false)} />
      {/* Extend break modal */}
      <ExtendBreakModal open={showExtendModal} onClose={() => setShowExtendModal(false)} />
    </div>
  );
} 