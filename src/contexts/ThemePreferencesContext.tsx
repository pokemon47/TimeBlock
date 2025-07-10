"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type ThemeChoice = "light" | "dark" | "custom";

interface Palette {
  bg: string; // hex
  fg: string; // hex
}

interface ThemePrefs {
  theme: ThemeChoice;
  palette: Palette;
  setTheme: (t: ThemeChoice) => void;
  setPalette: (p: Palette) => void;
}

const ThemePrefsContext = createContext<ThemePrefs | undefined>(undefined);

export function ThemePrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeChoice>("dark");
  const [palette, setPalette] = useState<Palette>({ bg: "#000000", fg: "#FFFFFF" });

  return (
    <ThemePrefsContext.Provider value={{ theme, palette, setTheme, setPalette }}>
      {children}
    </ThemePrefsContext.Provider>
  );
}

export function useThemePrefs() {
  const ctx = useContext(ThemePrefsContext);
  if (!ctx) throw new Error("useThemePrefs must be within ThemePrefsProvider");
  return ctx;
} 