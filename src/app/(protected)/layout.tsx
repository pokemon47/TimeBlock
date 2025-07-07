import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/header";

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
    <div className="min-h-screen flex flex-col">
      <Header user={user} />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
} 