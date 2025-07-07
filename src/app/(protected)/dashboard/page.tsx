import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome back, {user?.email}</h1>
      <p className="mt-2 text-muted-foreground">
        This is your TimeBlock dashboard. More features coming soon.
      </p>
    </div>
  );
} 