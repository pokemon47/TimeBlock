"use client";

import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
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
      <span className="text-sm">Logged in as {user.email}</span>
      <Button variant="outline" onClick={handleLogout}>
        Logout
      </Button>
    </header>
  );
} 