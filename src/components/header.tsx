"use client";

import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/contexts/SidebarContext";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

interface HeaderProps {
  user: {
    id: string;
    email?: string;
  };
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const { toggle, open } = useSidebar();
  const { theme, setTheme } = useTheme();
  const headerStyle = undefined;
  const buttonStyle = undefined;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b px-4 py-2" style={headerStyle}>
      <div className="flex items-center gap-4">
        {/* Sidebar toggle */}
        <button
          onClick={toggle}
          aria-label={open ? "Close sidebar" : "Open sidebar"}
          className="p-2 rounded border border-input bg-background hover:bg-muted transition-colors"
          style={buttonStyle}
        >
          {/* icon bars */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
            />
          </svg>
        </button>

        <Link href="/dashboard" className="font-semibold hover:underline">
          TimeBlock
        </Link>
      </div>
      <div className="flex items-center gap-3">
        {/* Theme toggle (hidden for now) */}
        {false && (
          <button
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded border border-input bg-background hover:bg-muted transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}
        <Link href="/settings" className="text-sm hover:underline">
          Settings
        </Link>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
} 