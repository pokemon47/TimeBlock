"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { startLog } from "@/db/startLog";
import { stopLog } from "@/db/stopLog";
import { createBreakLog } from "@/db/createBreakLog";
import { Button } from "@/components/ui/button";
import { playAlert, startRepeatAlert, stopRepeatAlert } from "@/lib/playAlert";

type TimerState = {
  activeTaskId: string | null;
  currentLogId: string | null;
  startedAt: number | null; // epoch ms
  elapsedMs: number; // accumulated when paused
  isPaused: boolean;
  pauseStartedAt: number | null; // ts since epoch when pause began
  pausedMs: number; // total paused milliseconds
  workMsSinceBreak: number;
  isOnBreak: boolean;
  breakStartedAt: number | null;
};

interface TimerContextValue extends TimerState {
  start: (taskId: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  /**
   * Stop the current log.
   * @param overtimeMinutes Minutes beyond the task estimate to record (default 0)
   */
  stop: (overtimeMinutes?: number) => Promise<void>;
  updateBreakSettings: (vals: { break_every_mins?: number; break_duration_mins?: number; long_pause_mins?: number }) => void;
  breakDurationMs: number;
  startBreak: (durationMs: number) => void;
  resumeFromBreak: () => void;
  extendBreak: (additionalMs?: number) => void;
  // internal: but exposed to UI prompt
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

const STORAGE_KEY = "timeblock-timer-state";

// Default 10 minutes; will be overridden by user setting
const DEFAULT_LONG_PAUSE_MS = 10 * 60 * 1000;

function loadState(): TimerState {
  if (typeof window === "undefined") return {
    activeTaskId: null,
    currentLogId: null,
    startedAt: null,
    elapsedMs: 0,
    isPaused: true,
    pauseStartedAt: null,
    pausedMs: 0,
    workMsSinceBreak: 0,
    isOnBreak: false,
    breakStartedAt: null,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error();
    const parsed = JSON.parse(raw);
    return {
      activeTaskId: parsed.activeTaskId ?? null,
      currentLogId: parsed.currentLogId ?? null,
      startedAt: parsed.startedAt ?? null,
      elapsedMs: parsed.elapsedMs ?? 0,
      isPaused: parsed.isPaused ?? true,
      pauseStartedAt: parsed.pauseStartedAt ?? null,
      pausedMs: parsed.pausedMs ?? 0,
      workMsSinceBreak: parsed.workMsSinceBreak ?? 0,
      isOnBreak: parsed.isOnBreak ?? false,
      breakStartedAt: parsed.breakStartedAt ?? null,
    } as TimerState;
  } catch {
    return {
      activeTaskId: null,
      currentLogId: null,
      startedAt: null,
      elapsedMs: 0,
      isPaused: true,
      pauseStartedAt: null,
      pausedMs: 0,
      workMsSinceBreak: 0,
      isOnBreak: false,
      breakStartedAt: null,
    };
  }
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>(() => loadState());
  const [showPrompt, setShowPrompt] = useState(false);
  const longPauseTimerRef = useRef<number | null>(null);
  const [longPauseMs, setLongPauseMs] = useState<number>(DEFAULT_LONG_PAUSE_MS);
  const [breakEveryMs, setBreakEveryMs] = useState<number>(50 * 60 * 1000); // default 50 min
  const [breakDurationMs, setBreakDurationMs] = useState<number>(10 * 60 * 1000);
  const defaultBreakMsRef = useRef<number>(10 * 60 * 1000);
  const [showBreakPrompt, setShowBreakPrompt] = useState(false);
  const [showBreakEndPrompt, setShowBreakEndPrompt] = useState(false);
  const breakTimerRef = useRef<number | null>(null);
  const breakEndTimerRef = useRef<number | null>(null);

  // fetch user id once
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      if (user) {
        // fetch break settings
        const { data } = await supabase
          .from("break_settings")
          .select("long_pause_mins, break_every_mins, break_duration_mins")
          .eq("user_id", user.id)
          .single();

        if (data) {
          if (typeof data.long_pause_mins === "number") {
            setLongPauseMs(data.long_pause_mins > 0 ? data.long_pause_mins * 60 * 1000 : 0);
          }
          if (typeof data.break_every_mins === "number" && data.break_every_mins > 0) {
            setBreakEveryMs(data.break_every_mins * 60 * 1000);
          }
          if (typeof data.break_duration_mins === "number" && data.break_duration_mins > 0) {
            setBreakDurationMs(data.break_duration_mins * 60 * 1000);
            defaultBreakMsRef.current = data.break_duration_mins * 60 * 1000;
          }
        }
      }
    })();
  }, []);

  /* ------------------- Restore any active log on cold start ------------------- */
  useEffect(() => {
    if (!userId) return;
    if (state.activeTaskId) return; // already have local session

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("time_logs")
        .select("id, task_id, started_at, paused_ms")
        .eq("user_id", userId)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .maybeSingle();

      if (cancelled || error || !data) return;

      const startedAtTs = data.started_at ? new Date(data.started_at).getTime() : Date.now();

      setState((prev) => ({
        ...prev,
        activeTaskId: data.task_id ?? null,
        currentLogId: data.id,
        startedAt: startedAtTs,
        elapsedMs: 0,
        isPaused: false,
        pauseStartedAt: null,
        pausedMs: data.paused_ms ?? 0,
      }));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* ------------------- Realtime sync across tabs/devices ------------------- */
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`timelogs-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "time_logs",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row: any = payload.new ?? payload.old;

          // INSERT of a new running log
          if (payload.eventType === "INSERT" && row.ended_at === null) {
            setState((prev) => ({
              ...prev,
              activeTaskId: row.task_id ?? null,
              currentLogId: row.id,
              startedAt: row.started_at ? new Date(row.started_at).getTime() : Date.now(),
              elapsedMs: 0,
              isPaused: false,
              pauseStartedAt: null,
              pausedMs: row.paused_ms ?? 0,
              isOnBreak: false,
              breakStartedAt: null,
            }));
            return;
          }

          // UPDATE closing the current log
          if (
            payload.eventType === "UPDATE" &&
            row.id === state.currentLogId &&
            row.ended_at !== null
          ) {
            setState((prev) => ({
              ...prev,
              activeTaskId: null,
              currentLogId: null,
              startedAt: null,
              elapsedMs: 0,
              isPaused: true,
              pauseStartedAt: null,
              pausedMs: 0,
            }));
          }
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
  }, [userId, state.currentLogId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  /* -------- Break suggestion effect -------- */
  useEffect(() => {
    if (breakEveryMs === 0) return; // disabled

    // if timer is running (not paused)
    if (state.activeTaskId && !state.isPaused && state.startedAt) {
      const now = Date.now();
      const activeElapsed = now - state.startedAt;
      const already = state.workMsSinceBreak;
      const remaining = breakEveryMs - already - activeElapsed;

      if (remaining <= 0) {
        setShowBreakPrompt(true);
        playAlert();
        return; // we won't schedule further until break taken or skipped
      }

      breakTimerRef.current = window.setTimeout(() => {
        setShowBreakPrompt(true);
        playAlert();
      }, remaining);

      return () => {
        if (breakTimerRef.current) {
          clearTimeout(breakTimerRef.current);
          breakTimerRef.current = null;
        }
      };
    }

    // clear timer if paused/stopped
    if (breakTimerRef.current) {
      clearTimeout(breakTimerRef.current);
      breakTimerRef.current = null;
    }
  }, [state.activeTaskId, state.isPaused, state.startedAt, state.workMsSinceBreak, breakEveryMs, state.isOnBreak]);

  /* -------- Break end timer effect -------- */
  useEffect(() => {
    if (!state.isOnBreak || !state.breakStartedAt) {
      if (breakEndTimerRef.current) {
        clearTimeout(breakEndTimerRef.current);
        breakEndTimerRef.current = null;
      }
      return;
    }

    const now = Date.now();
    const elapsed = now - state.breakStartedAt;
    const remaining = breakDurationMs - elapsed;

    if (remaining <= 0) {
      setShowBreakEndPrompt(true);
      playAlert();
      return;
    }

    breakEndTimerRef.current = window.setTimeout(() => {
      setShowBreakEndPrompt(true);
      playAlert();
    }, remaining);

    return () => {
      if (breakEndTimerRef.current) {
        clearTimeout(breakEndTimerRef.current);
        breakEndTimerRef.current = null;
      }
    };
  }, [state.isOnBreak, state.breakStartedAt, breakDurationMs]);

  async function start(taskId: string) {
    if (!userId) return; // not ready

    // Finalise previous log (running OR paused) if one exists
    if (state.currentLogId) {
      const now = Date.now();
      let elapsedMs = state.elapsedMs;
      let totalPaused = state.pausedMs;

      if (state.isPaused) {
        // Timer was paused; accumulate the current pause duration
        if (state.pauseStartedAt) {
          totalPaused += now - state.pauseStartedAt;
        }
        // elapsedMs already accounts for active time before pause
      } else if (state.startedAt) {
        // Timer is running; include active time since last start/resume
        elapsedMs += now - state.startedAt;
      }

      const seconds = Math.round(elapsedMs / 1000);
      try {
        await stopLog(state.currentLogId, seconds, totalPaused);
      } catch {}
    }

    // start new log
    let newLogId: string | null = null;
    try {
      newLogId = await startLog(userId, taskId);
    } catch {}

    setState({
      activeTaskId: taskId,
      currentLogId: newLogId,
      startedAt: Date.now(),
      elapsedMs: 0,
      isPaused: false,
      pauseStartedAt: null,
      pausedMs: 0,
      workMsSinceBreak: state.workMsSinceBreak, // carry over
      isOnBreak: false,
      breakStartedAt: null,
    });

    // clear any pending prompt timer
    if (longPauseTimerRef.current) {
      clearTimeout(longPauseTimerRef.current);
      longPauseTimerRef.current = null;
    }
    setShowPrompt(false);
  }

  function pause() {
    setState((prev) => {
      if (prev.isPaused || prev.startedAt === null) return prev;
      return {
        ...prev,
        isPaused: true,
        elapsedMs: prev.elapsedMs + (Date.now() - prev.startedAt),
        startedAt: null,
        pauseStartedAt: Date.now(),
        workMsSinceBreak: prev.workMsSinceBreak + (Date.now() - prev.startedAt!),
      };
    });
  }

  function resume() {
    setState((prev) => {
      if (!prev.isPaused || !prev.activeTaskId) return prev;
      const now = Date.now();
      const additionalPaused = prev.pauseStartedAt ? now - prev.pauseStartedAt : 0;
      return {
        ...prev,
        isPaused: false,
        startedAt: now,
        pausedMs: prev.pausedMs + additionalPaused,
        pauseStartedAt: null,
      };
    });

    setShowPrompt(false);
  }

  async function stop(overtimeSeconds: number = 0) {
    // If stopping while on a break, finalise that break log first
    if (state.isOnBreak && userId && state.breakStartedAt) {
      const now = Date.now();
      const duration = now - state.breakStartedAt;
      try {
        await createBreakLog(
          userId,
          new Date(state.breakStartedAt).toISOString(),
          new Date(now).toISOString(),
          duration
        );
      } catch {}
    }

    if (state.currentLogId) {
      const now = Date.now();
      const additionalPaused = state.isPaused && state.pauseStartedAt ? now - state.pauseStartedAt : 0;
      const elapsedMs = state.elapsedMs + (state.startedAt ? now - state.startedAt : 0);
      const seconds = Math.round(elapsedMs / 1000);
      const totalPausedMs = state.pausedMs + additionalPaused;

      // accumulate work time
      const activeMs = state.startedAt ? now - state.startedAt : 0;
      setState((prev) => ({ ...prev, workMsSinceBreak: prev.workMsSinceBreak + activeMs }));

      try {
        await stopLog(state.currentLogId, seconds, totalPausedMs, overtimeSeconds);
      } catch {}
    }

    setState({
      activeTaskId: null,
      currentLogId: null,
      startedAt: null,
      elapsedMs: 0,
      isPaused: true,
      pauseStartedAt: null,
      pausedMs: 0,
      workMsSinceBreak: 0,
      isOnBreak: false,
      breakStartedAt: null,
    });

    setShowPrompt(false);
  }

  // Prompt handlers
  function handleContinueNow() {
    resume();
  }

  function handleContinueLater() {
    stop();
  }

  function handleStayPaused() {
    setShowPrompt(false);

    // reset pause timer from now
    longPauseTimerRef.current = window.setTimeout(() => {
      setShowPrompt(true);
      playAlert();
    }, longPauseMs);

    // reset pauseStartedAt
    setState((prev) => ({ ...prev, pauseStartedAt: Date.now() }));
  }

  // Break prompt handlers
  function handleStartBreak() {
    // Delegate to unified startBreak helper
    startBreak(breakDurationMs);
    setShowBreakPrompt(false);
  }

  /* -------- Public startBreak -------- */
  function startBreak(durationMs: number) {
    // pause current task if running
    if (!state.isPaused) {
    pause();
    }

    // reset work counter
    setState((prev) => ({ ...prev, workMsSinceBreak: 0 }));

    // set custom duration for this break
    setBreakDurationMs(durationMs);

    // begin break
    setState((prev) => ({ ...prev, isOnBreak: true, breakStartedAt: Date.now() }));
  }

  function handleSkipBreak() {
    // reset counter to 0 so next suggestion after full interval
    setState((prev) => ({ ...prev, workMsSinceBreak: 0 }));
    setShowBreakPrompt(false);
  }

  function handleResumeFromBreak() {
    // Record break log before switching back to work
    if (userId && state.breakStartedAt) {
      const now = Date.now();
      const duration = now - state.breakStartedAt;
      createBreakLog(
        userId,
        new Date(state.breakStartedAt).toISOString(),
        new Date(now).toISOString(),
        duration
      ).catch(() => {});
    }

    // End break and resume work immediately
    setState((prev) => ({
      ...prev,
      isOnBreak: false,
      breakStartedAt: null,
      isPaused: false,
      startedAt: Date.now(),
      pauseStartedAt: null,
    }));
    setShowBreakEndPrompt(false);

    // Restore default break length
    setBreakDurationMs(defaultBreakMsRef.current);
  }

  function handleExtendBreak() {
    // reset break start to now to extend another duration (same length)
    extendBreak();
  }

  /**
   * Public extender – if additionalMs provided, add that many milliseconds to the
   * current break duration. If omitted, fallback to legacy behaviour of restarting
   * the break with the same duration.
   */
  function extendBreak(additionalMs?: number) {
    if (additionalMs && additionalMs > 0) {
      setBreakDurationMs((prev) => prev + additionalMs);
      setShowBreakEndPrompt(false);
    } else {
      // Fallback: restart timer with same duration
    setState((prev) => ({ ...prev, breakStartedAt: Date.now() }));
    setShowBreakEndPrompt(false);
    }
  }

  /** Update break-related settings live */
  function updateBreakSettings(vals: { break_every_mins?: number; break_duration_mins?: number; long_pause_mins?: number }) {
    if (typeof vals.break_every_mins === "number" && vals.break_every_mins >= 0) {
      setBreakEveryMs(vals.break_every_mins * 60 * 1000);
    }
    if (typeof vals.break_duration_mins === "number" && vals.break_duration_mins >= 0) {
      setBreakDurationMs(vals.break_duration_mins * 60 * 1000);
      defaultBreakMsRef.current = vals.break_duration_mins * 60 * 1000;
    }
    if (typeof vals.long_pause_mins === "number" && vals.long_pause_mins >= 0) {
      setLongPauseMs(vals.long_pause_mins === 0 ? 0 : vals.long_pause_mins * 60 * 1000);
    }
  }

  // -------- Long-pause timer effect --------
  useEffect(() => {
    // Ignore entirely while the user is on a break
    if (state.isOnBreak) {
      // Clear any existing long-pause timer so it doesn't fire mid-break
      if (longPauseTimerRef.current) {
        clearTimeout(longPauseTimerRef.current);
        longPauseTimerRef.current = null;
      }
      return;
    }

    // If we’re paused (but NOT on break), start / reset the countdown
    if (state.isPaused && state.pauseStartedAt) {
      const now = Date.now();
      const elapsedSincePause = now - state.pauseStartedAt;

      // calculate remaining time until threshold
      if (longPauseMs === 0) return; // disabled

      const remaining = longPauseMs - elapsedSincePause;

      if (remaining <= 0) {
        // Already exceeded threshold – show immediately
        setShowPrompt(true);
        playAlert();
        return;
      }

      longPauseTimerRef.current = window.setTimeout(() => {
        setShowPrompt(true);
        playAlert();
      }, remaining);

      return () => {
        if (longPauseTimerRef.current) {
          clearTimeout(longPauseTimerRef.current);
          longPauseTimerRef.current = null;
        }
      };
    }

    // If not paused, clear any pending timer
    if (longPauseTimerRef.current) {
      clearTimeout(longPauseTimerRef.current);
      longPauseTimerRef.current = null;
    }
  }, [state.isPaused, state.pauseStartedAt, state.isOnBreak]);

  /* -------- Repeat alert driver for prompts ------- */
  useEffect(() => {
    const repeat = typeof window !== "undefined" && localStorage.getItem("tb_repeat") === "1";
    const secs = typeof window !== "undefined" ? parseInt(localStorage.getItem("tb_repeat_secs") || "5") : 5;

    if (showPrompt || showBreakPrompt || showBreakEndPrompt) {
      if (repeat) startRepeatAlert(secs);
    } else {
      stopRepeatAlert();
    }
  }, [showPrompt, showBreakPrompt, showBreakEndPrompt]);


  return (
    <TimerContext.Provider value={{ ...state, start, pause, resume, stop, updateBreakSettings, breakDurationMs, startBreak, resumeFromBreak: handleResumeFromBreak, extendBreak }}>
      {children}

      {showPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded p-6 w-full max-w-sm">
            <p className="mb-4 text-sm">You’ve been paused for a while. What would you like to do?</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={handleStayPaused}>
                Stay paused
              </Button>
              <Button variant="destructive" size="sm" onClick={handleContinueLater}>
                Continue later
              </Button>
              <Button size="sm" onClick={handleContinueNow}>
                Continue now
              </Button>
            </div>
          </div>
        </div>
      )}

      {showBreakPrompt && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 shadow-md rounded px-4 py-3 z-50 flex items-center gap-4">
          <span className="text-sm">Time for a break?</span>
          <Button size="sm" onClick={handleStartBreak}>Start break</Button>
          <Button size="sm" variant="ghost" onClick={handleSkipBreak}>Skip</Button>
        </div>
      )}

      {showBreakEndPrompt && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 shadow-md rounded px-4 py-3 z-50 flex items-center gap-4">
          <span className="text-sm">Break finished. Ready to resume?</span>
          <Button size="sm" onClick={handleResumeFromBreak}>Resume work</Button>
          <Button size="sm" variant="ghost" onClick={handleExtendBreak}>Extend break</Button>
        </div>
      )}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be inside TimerProvider");
  return ctx;
} 