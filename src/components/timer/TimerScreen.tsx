"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTimer } from "@/contexts/TimerContext";
import clsx from "clsx";

function formatHMS(ms: number) {
  const total = Math.abs(Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s]
    .map((n) => n.toString().padStart(2, "0"))
    .join(":");
}

export default function TimerScreen() {
  const timer = useTimer();
  const [now, setNow] = useState(() => Date.now());

  // tick every second when timer running or paused stopwatch
  useEffect(() => {
    if (timer.activeTaskId) {
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }
  }, [timer.activeTaskId]);

  if (!timer.activeTaskId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4">
        <div className="text-6xl font-mono">00:00:00</div>
        <p className="text-muted-foreground">Start a task</p>
      </div>
    );
  }

  let displayMs = 0;
  if (timer.isPaused || timer.isOnBreak) {
    // stopwatch counts up from pause / break start
    const startRef = timer.isOnBreak ? timer.breakStartedAt : timer.pauseStartedAt;
    displayMs = startRef ? now - startRef : 0;
  } else {
    const activeElapsed = timer.startedAt ? now - timer.startedAt : 0; // ms since current start/resume
    const totalActiveMs = timer.activePastSeconds * 1000 + timer.elapsedMs + activeElapsed; // include past sessions

    if (typeof timer.activeEstimateSecs === "number" && timer.activeEstimateSecs > 0) {
      const remainingMs = timer.activeEstimateSecs * 1000 - totalActiveMs;
      displayMs = Math.abs(remainingMs);
    } else {
      // fallback stopwatch if no estimate
      displayMs = totalActiveMs;
    }
  }

  const status = timer.isOnBreak ? "Break" : timer.isPaused ? "Paused" : "Working";

  return (
    <div className="flex flex-col items-center justify-between h-full py-10">
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div
          className={clsx(
            "font-mono text-8xl sm:text-9xl font-bold",
            timer.isOnBreak ? "text-green-500" : timer.isPaused ? "text-yellow-500" : "text-primary"
          )}
        >
          {formatHMS(displayMs)}
        </div>
        <p className="text-lg text-muted-foreground">{status}</p>
      </div>

      <div className="flex justify-center gap-4 pb-8">
        {timer.isPaused ? (
          <Button size="lg" onClick={() => timer.resume()}>Resume</Button>
        ) : (
          <Button size="lg" onClick={() => timer.pause()}>Pause</Button>
        )}
        <Button variant="destructive" size="lg" onClick={() => timer.stop()}>Stop</Button>
        {!timer.isOnBreak && (
          <Button variant="secondary" size="lg" onClick={() => timer.pause()}>Take Break</Button>
        )}
      </div>
    </div>
  );
} 