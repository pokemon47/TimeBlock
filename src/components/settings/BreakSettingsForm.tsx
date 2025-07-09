"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import { useTimer } from "@/contexts/TimerContext";

interface Values {
  break_every_mins: number;
  break_duration_mins: number;
  long_pause_mins: number;
}

export default function BreakSettingsForm({ initialValues, userId }: { initialValues: Values; userId: string }) {
  const [values, setValues] = useState<Values>(initialValues);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();
  const timer = useTimer();

  function handleChange(field: keyof Values) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      let v = Number(e.target.value);
      if (v < 0) v = 0;
      if (v > 60) v = 60;
      setValues({ ...values, [field]: v });
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase.from("break_settings").upsert({
        user_id: userId,
        ...values,
      });
      if (error) throw error;
      timer.updateBreakSettings(values);
      setMessage("Saved!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {[
        ["Work interval (mins)", "break_every_mins"],
        ["Break length (mins)", "break_duration_mins"],
        ["Long-pause reminder (mins, 0 disables)", "long_pause_mins"],
      ].map(([label, field]) => (
        <div key={field as string} className="space-y-1">
          <label className="text-sm font-medium">{label}</label>
          <Input
            type="number"
            required
            value={values[field as keyof Values]}
            onChange={handleChange(field as keyof Values)}
            max={60}
            min={0}
          />
        </div>
      ))}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
} 