"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/browser";
import { useThemePrefs } from "@/contexts/ThemePreferencesContext";

export default function ApplyUserTheme() {
  const { setTheme } = useTheme();
  const { setTheme: setLocalTheme, setPalette } = useThemePrefs();

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // user_preferences row
      const { data: pref } = await supabase.from("user_preferences").select().eq("user_id", user.id).single();
      if (!pref) return;

      const dbTheme = pref.theme as "light" | "dark" | "custom";
      setTheme(dbTheme);
      setLocalTheme(dbTheme);

      if (dbTheme === "custom" && pref.active_preset_id) {
        const { data: preset } = await supabase.from("theme_presets").select().eq("id", pref.active_preset_id).single();
        if (preset) {
          setPalette({ bg: preset.bg_hex, fg: preset.fg_hex });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
} 