"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import EditTaskModal from "./EditTaskModal";
import { createClient } from "@/lib/supabase/browser";
import type { TaskRow } from "@/db/listTasksToday";
import { useRouter } from "next/navigation";
import { useTimer } from "@/contexts/TimerContext";
import { createPortal } from "react-dom";
import { playAlert } from "@/lib/playAlert";
import { startRepeatAlert, stopRepeatAlert } from "@/lib/playAlert";

interface Props {
  task: TaskRow;
}

export default function TaskItem({ task }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useTimer();

  // Category names
  const [parentName, setParentName] = useState<string | null>(null);
  const [subName, setSubName] = useState<string | null>(null);
  const [colorHex, setColorHex] = useState<string | null>(null);

  useEffect(() => {
    if (!task.category_id) return;
    let cancelled = false;
    (async () => {
      // fetch the category row
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,parent_id,color_hex")
        .eq("id", task.category_id)
        .single();
      if (error || cancelled || !data) return;
      const cat = data as any;
      if (cat.parent_id) {
        const { data: parentRow } = await supabase
          .from("categories")
          .select("name,color_hex")
          .eq("id", cat.parent_id)
          .single();
        setParentName(parentRow?.name ?? "");
        setSubName(cat.name);
        setColorHex(cat.color_hex ?? parentRow?.color_hex ?? null);
      } else {
        setParentName(cat.name);
        setSubName(null);
        setColorHex(cat.color_hex ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.category_id]);

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
          playAlert();
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

  const [showDelete, setShowDelete] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuHeight = 72; // approx height of menu (2 items * 32px + padding)

  // close menu on Esc or outside click
  useEffect(() => {
    if (!showMenu) return;
    function handleWheel() {
      setShowMenu(false);
    }
    function handleTouchMove() {
      setShowMenu(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowMenu(false);
    }
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [showMenu]);

  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (!showDelete) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowDelete(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDelete]);

  async function confirmDelete() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    setLoading(false);
    setShowDelete(false);
    if (error) {
      setError(error.message);
      return;
    }
    // router.refresh(); sidebar realtime listener will remove item
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

  // repeat alert effect
  useEffect(() => {
    const repeat = typeof window !== "undefined" && localStorage.getItem("tb_repeat") === "1";
    const secs = typeof window !== "undefined" ? parseInt(localStorage.getItem("tb_repeat_secs") || "5") : 5;
    if (showOverPrompt && repeat) startRepeatAlert(secs);
    if (!showOverPrompt) stopRepeatAlert();
  }, [showOverPrompt]);

  return (
    <li className="rounded border p-3 flex items-center justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {/* Priority badge */}
          <span
            className={
              {
                high: "bg-red-500",
                medium: "bg-yellow-500",
                low: "bg-green-500",
              }[(task.priority ?? "medium") as "low" | "medium" | "high"] +
              " inline-block h-2 w-2 rounded-full"
            }
          />
        <p className="font-medium">{task.title}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Estimated {fmt(Math.round((task.duration_estimated ?? 0) / 60))}
          {countdown && (
            <span className="ml-2 font-mono text-[11px] leading-none inline-block">
              {countdown}
            </span>
          )}
        </p>
        {parentName ? (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium mt-1"
            style={{
              color: colorHex ?? "#374151",
              borderColor: colorHex ?? "#d1d5db",
              backgroundColor: colorHex ? `${colorHex}22` : undefined,
            }}
          >
            {subName ? `${parentName} / ${subName}` : parentName}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground mt-1">Uncategorised</span>
        )}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
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
        <Button size="sm" variant="success" onClick={() => timer.start(task.id)}>
          Start
        </Button>
      )}
      {/* 3-dot menu */}
      <div className="relative">
      <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          ref={buttonRef}
          onClick={() => {
            if (showMenu) {
              setShowMenu(false);
              return;
            }
            const rect = buttonRef.current!.getBoundingClientRect();
            // Determine vertical placement to avoid cutoff
            let top = rect.bottom + 4;
            if (top + menuHeight > window.innerHeight) {
              top = rect.top - menuHeight - 4;
            }
            setMenuPos({ x: rect.right, y: top });
            setShowMenu(true);
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
        {showMenu && menuPos &&
          createPortal(
            <div
              className="fixed z-50 w-28 bg-popover border border-border rounded shadow-md"
              style={{ top: menuPos.y, left: menuPos.x - 112 }}
              ref={menuRef}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full text-left px-3 py-1 text-sm hover:bg-accent disabled:text-muted-foreground disabled:cursor-not-allowed"
                onClick={() => {
                  setShowMenu(false);
                  setShowEdit(true);
                }}
                disabled={timer.activeTaskId === task.id && !timer.isPaused}
              >
                Edit
              </button>
              <button
                className="w-full text-left px-3 py-1 text-sm hover:bg-accent disabled:text-muted-foreground disabled:cursor-not-allowed"
                onClick={() => {
                  setShowMenu(false);
                  setShowDelete(true);
                }}
                disabled={timer.activeTaskId === task.id && !timer.isPaused}
              >
                Delete
              </button>
            </div>,
            document.body
          )}
      </div>

      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDelete(false)}>
          <div
            className="bg-background rounded p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm">Are you sure you want to delete the task “{task.title}”?</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowDelete(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={loading}>
                {loading ? "Deleting…" : "Yes, delete"}
      </Button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <EditTaskModal task={task} onClose={() => setShowEdit(false)} />
      )}
    </li>
  );
} 