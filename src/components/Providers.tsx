"use client";

import { ReactNode } from "react";
import { TimerProvider } from "@/contexts/TimerContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ThemeProvider } from "next-themes";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TimerProvider>
        <SidebarProvider>{children}</SidebarProvider>
      </TimerProvider>
    </ThemeProvider>
  );
} 