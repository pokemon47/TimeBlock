"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import CategoryPicker from "@/components/CategoryPicker";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

interface Values {
  title: string;
  hours: number;
  minutes: number;
  priority: "low" | "medium" | "high";
  difficulty: number; // 0-10
  categoryId: string | null; // parent or sub id
}

interface Props {
  initial?: Partial<Values>;
  onSubmit: (payload: {
    title: string;
    duration_estimated: number; // seconds
    priority: string;
    difficulty: number;
    category_id: string | null;
  }) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export default function TaskForm({ initial, onSubmit, onCancel, submitLabel = "Save" }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [hours, setHours] = useState(initial?.hours ?? 0);
  const [minutes, setMinutes] = useState(initial?.minutes ?? 30);
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    initial?.priority ?? "medium"
  );
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 5);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  // Sub-category creation removed; no longer tracking creation state.

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const totalSeconds = hours * 3600 + minutes * 60;
    if (totalSeconds === 0) {
      setError("Duration must be at least 1 minute");
      return;
    }
    if (difficulty < 0 || difficulty > 10) {
      setError("Difficulty must be 0-10");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        duration_estimated: totalSeconds,
        priority,
        difficulty,
        category_id: categoryId || null,
      });
      // reset on success
      setTitle("");
      setHours(0);
      setMinutes(30);
      setPriority("medium");
      setDifficulty(5);
      setCategoryId(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Task title
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            // No special handling needed now that sub-category creation is gone.
          }}
          placeholder="Write blog post"
          required
        />
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Expected duration</label>
        <div className="flex items-center gap-2">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="border rounded px-2 py-1 bg-background"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {i.toString().padStart(2, "0")} h
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">:</span>
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="border rounded px-2 py-1 bg-background"
          >
            {Array.from({ length: 60 }, (_, m) => m).map((m) => (
              <option key={m} value={m}>
                {m.toString().padStart(2, "0")} m
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Priority</label>
        <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Difficulty (0–10)</label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min={0}
            max={10}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-16 border rounded px-2 py-1 bg-background"
          />
          <input
            type="range"
            min={0}
            max={10}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="flex-1"
          />
        </div>
      </div>

      {/* Category */}
      <CategoryPicker value={categoryId} onChange={setCategoryId} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? `${submitLabel}…` : submitLabel}
        </Button>
      </div>
    </form>
  );
} 