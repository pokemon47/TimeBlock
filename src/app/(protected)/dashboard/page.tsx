import NewTaskForm from "@/components/tasks/NewTaskForm";
import TaskList from "@/components/tasks/TaskList";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold">Welcome back, {user.email}</h1>

      <NewTaskForm />

      <h2 className="text-lg font-semibold mt-6">Today&apos;s tasks</h2>
      <TaskList userId={user.id} />
    </div>
  );
} 