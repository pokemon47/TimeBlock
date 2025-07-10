import { createClient } from "@/lib/supabase/server";
import BreakSettingsForm from "@/components/settings/BreakSettingsForm";
import AppearanceForm from "@/components/settings/AppearanceForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Should be handled by middleware, but fallback
    return null;
  }

  const { data } = await supabase
    .from("break_settings")
    .select()
    .eq("user_id", user.id)
    .single();

  return (
    <main className="p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold mb-6">Settings</h1>
      <BreakSettingsForm
        initialValues={{
          break_every_mins: data?.break_every_mins ?? 50,
          break_duration_mins: data?.break_duration_mins ?? 10,
          long_pause_mins: data?.long_pause_mins ?? 10,
        }}
        userId={user.id}
      />

      <AppearanceForm userId={user.id} />
    </main>
  );
} 