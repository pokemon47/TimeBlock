"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

export default function NewTaskForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (!user || userErr) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    try {
      const totalSeconds = hours * 3600 + minutes * 60;

      if (totalSeconds === 0) {
        setError("Duration must be at least 1 minute");
        setLoading(false);
        return;
      }

      const { error: insertErr } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: title.trim(),
        duration_estimated: totalSeconds,
      });
      if (insertErr) throw insertErr;
      setTitle("");
      setHours(0);
      setMinutes(30);
      router.refresh(); // revalidates server components
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create task";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Task title
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Write blog post"
          required
        />
      </div>
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add task"}
      </Button>
    </form>
  );
} 