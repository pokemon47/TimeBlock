import { createClient } from "@/lib/supabase/server";
import BreakSettingsForm from "@/components/settings/BreakSettingsForm";
import AppearanceForm from "@/components/settings/AppearanceForm";
import CategoryManager from "@/components/settings/CategoryManager";

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
    <main className="p-6 flex gap-8 max-w-5xl mx-auto">
      {/* Sidebar index */}
      <nav className="w-40 shrink-0 space-y-3 sticky top-6 self-start text-sm">
        <a href="#breaks" className="block hover:underline">Breaks</a>
        <a href="#appearance" className="block hover:underline">Appearance</a>
        <a href="#categories" className="block hover:underline">Categories</a>
      </nav>

      {/* Content */}
      <div className="flex-1 space-y-12">
        <section id="breaks">
          <h2 className="text-lg font-semibold mb-4">Break Settings</h2>
      <BreakSettingsForm
        initialValues={{
          break_every_mins: data?.break_every_mins ?? 50,
          break_duration_mins: data?.break_duration_mins ?? 10,
          long_pause_mins: data?.long_pause_mins ?? 10,
        }}
        userId={user.id}
      />
        </section>

        <section id="appearance">
          <h2 className="text-lg font-semibold mb-4">Appearance</h2>
          <AppearanceForm userId={user.id} />
        </section>

        <section id="categories">
          <h2 className="text-lg font-semibold mb-4">Categories</h2>
          <CategoryManager />
        </section>
      </div>
    </main>
  );
} 