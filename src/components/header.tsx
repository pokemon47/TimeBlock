"use client";

import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderProps {
  user: {
    id: string;
    email?: string;
  };
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="font-semibold hover:underline">
          TimeBlock
        </Link>
        <span className="text-sm">Logged in as {user.email}</span>
      </div>
      <div className="flex items-center gap-3">
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