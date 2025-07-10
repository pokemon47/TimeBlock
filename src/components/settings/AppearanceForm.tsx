"use client";

import React from "react";
import { createClient } from "@/lib/supabase/browser";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ThemeChoice = "light" | "dark";

export default function AppearanceForm({ userId }: { userId: string }) {
  const supabase = createClient();
  const { setTheme } = useTheme();

  const [choice, setChoice] = React.useState<ThemeChoice>("dark");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("theme")
        .eq("user_id", userId)
        .single();
      if (data?.theme === "light") setChoice("light");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      await supabase.from("user_preferences").upsert({ user_id: userId, theme: choice });
      setTheme(choice);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-10 space-y-4">
      <h2 className="text-lg font-semibold">Appearance</h2>
      <RadioGroup value={choice} onValueChange={(v) => setChoice(v as ThemeChoice)} className="flex gap-6">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="light" id="light" />
          <label htmlFor="light" className="text-sm">Light</label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="dark" id="dark" />
          <label htmlFor="dark" className="text-sm">Dark</label>
        </div>
      </RadioGroup>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={handleSave} disabled={loading}>{loading ? "Saving…" : "Save Preferences"}</Button>
    </section>
  );
} 