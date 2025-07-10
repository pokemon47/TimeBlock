import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/header";
import TaskSidebar from "@/components/tasks/TaskSidebar";
import Providers from "@/components/Providers";

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
    <Providers>
      <div className="min-h-screen flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          {/* Sidebar */}
          <TaskSidebar userId={user.id} />

          {/* Main content */}
          <main className="flex-1 p-4">{children}</main>
        </div>
      </div>
    </Providers>
  );
} 