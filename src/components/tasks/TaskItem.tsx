"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import type { TaskRow } from "@/db/listTasksToday";
import { useRouter } from "next/navigation";
import { useTimer } from "@/contexts/TimerContext";

interface Props {
  task: TaskRow;
}

export default function TaskItem({ task }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useTimer();

  // Total minutes already spent on this task in previous logs (excluding current session)
  const [pastSeconds, setPastSeconds] = useState(0);

  // Fetch past time when component mounts or when task becomes active
  useEffect(() => {
    let cancelled = false;
    async function fetchPast() {
      const { data, error } = await supabase
        .from("time_logs")
        .select("duration_actual, overtime_duration") // seconds
        .eq("task_id", task.id)
        .not("ended_at", "is", null);
      if (error || cancelled) return;
      const seconds = (data ?? []).reduce((sum: number, row: any) => {
        const d = row.duration_actual ?? 0;
        const o = row.overtime_duration ?? 0;
        return sum + d + o;
      }, 0);
      setPastSeconds(seconds);
    }

    // fetch if task becomes active (start) or on first render
    fetchPast();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, timer.currentLogId]);

  // Local tick to force re-render every second while active & running
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timer.activeTaskId === task.id && !timer.isPaused) {
      // Update immediately to avoid stale timestamp then keep ticking each second
      setNow(Date.now());
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }
  }, [timer.activeTaskId, timer.isPaused, task.id]);

  function formatHMS(ms: number) {
    const totalSeconds = Math.abs(Math.round(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const parts = [h, m, s].map((n) => n.toString().padStart(2, "0"));
    return parts.join(":");
  }

  // Compute remaining or overtime
  let countdown: string | null = null;
  const [showOverPrompt, setShowOverPrompt] = useState(false);
  const [overtimeAck, setOvertimeAck] = useState(false);

  if (timer.activeTaskId === task.id) {
    let elapsedMs = timer.elapsedMs;
    if (!timer.isPaused && timer.startedAt) {
      elapsedMs += now - timer.startedAt;
    }
    const priorMs = pastSeconds * 1000;
    const estSeconds = task.duration_estimated ?? 0;
    if (estSeconds > 0) {
      const remainingMs = estSeconds * 1000 - (elapsedMs + priorMs);
      if (remainingMs >= 0) {
        countdown = formatHMS(remainingMs);
        // Reset flags when back under estimate (shouldn't really happen but safe)
        if (showOverPrompt) setShowOverPrompt(false);
        if (overtimeAck) setOvertimeAck(false);
      } else {
        // overtime
        countdown = "-" + formatHMS(remainingMs);
        if (!overtimeAck && !showOverPrompt && !timer.isPaused) {
          setShowOverPrompt(true);
        }
      }
    } else {
      // No estimate → simple stopwatch
      countdown = formatHMS(elapsedMs);
    }
  }

  // Handler when user finishes
  async function handleFinished() {
    const estSecs = task.duration_estimated ?? 0;
    // calculate elapsed so far similar to above
    let elapsedMs = timer.elapsedMs + pastSeconds * 1000;
    const elapsedSecs = Math.round(elapsedMs / 1000);
    const overtimeSecs = Math.max(0, elapsedSecs - estSecs);

    // Stop current log
    await timer.stop(overtimeSecs);

    // pastSeconds will refresh automatically when log closes

    setShowOverPrompt(false);
  }

  function handleKeepGoing() {
    setShowOverPrompt(false);
    setOvertimeAck(true);
  }

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  function fmt(minutes: number | null) {
    if (!minutes || minutes <= 0) return "?";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const parts = [] as string[];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    return parts.join(" ");
  }

  return (
    <li className="rounded border p-3 flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="font-medium">{task.title}</p>
        <p className="text-xs text-muted-foreground">
          Estimated {fmt(Math.round((task.duration_estimated ?? 0) / 60))}
          {countdown && (
            <span className="ml-2 font-mono text-[11px] leading-none inline-block">
              {countdown}
            </span>
          )}
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      {showOverPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded p-6 w-full max-w-sm">
            <p className="mb-4 text-sm">Time&apos;s up for this task. Finished?</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={handleKeepGoing}>
                Keep going
              </Button>
              <Button size="sm" onClick={handleFinished}>
                Mark done
              </Button>
            </div>
          </div>
        </div>
      )}
      {timer.activeTaskId === task.id && !timer.isPaused ? (
        <Button size="sm" onClick={() => timer.pause()}>
          Pause
        </Button>
      ) : timer.activeTaskId === task.id && timer.isPaused ? (
        <Button size="sm" onClick={() => timer.resume()}>Resume</Button>
      ) : (
        <Button size="sm" onClick={() => timer.start(task.id)}>Start</Button>
      )}
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={loading || (timer.activeTaskId === task.id && !timer.isPaused)}
        title={
          timer.activeTaskId === task.id && !timer.isPaused
            ? "Pause timer before deleting"
            : undefined
        }
      >
        {loading ? "…" : "Delete"}
      </Button>
    </li>
  );
} 