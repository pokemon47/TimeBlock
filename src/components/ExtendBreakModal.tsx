"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTimer } from "@/contexts/TimerContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ExtendBreakModal({ open, onClose }: Props) {
  const timer = useTimer();

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5); // default add 5 minutes
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function handleExtend() {
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes <= 0) {
      setError("Duration must be greater than 0");
      return;
    }
    timer.extendBreak(totalMinutes * 60 * 1000);
    onClose();
  }

  function applyPreset(mins: number) {
    setHours(0);
    setMinutes(mins);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-background rounded p-6 w-full max-w-sm shadow-lg space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">Extend Break</h3>

        <div className="space-y-3">
          <p className="text-sm">Add time</p>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15].map((m) => (
              <Button key={m} variant="secondary" size="sm" onClick={() => applyPreset(m)}>
                +{m}m
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Input
              type="number"
              min={0}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-20"
              placeholder="Hours"
            />
            <span className="text-muted-foreground">h</span>
            <Input
              type="number"
              min={0}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-20"
              placeholder="Minutes"
            />
            <span className="text-muted-foreground">m</span>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExtend}>Extend</Button>
        </div>
      </div>
    </div>
  );
} 