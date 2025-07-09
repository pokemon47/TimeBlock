import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/layout/AppShell";
import { TimerProvider } from "@/contexts/TimerContext";

interface Props {
  children: ReactNode;
}

export default async function ProtectedLayout({ children }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <TimerProvider>
      <AppShell user={user}>{children}</AppShell>
    </TimerProvider>
  );
} 