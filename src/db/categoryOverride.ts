import { createClient } from "@/lib/supabase/browser";

export async function getOverrides(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("category_overrides")
    .select("category_id,color_hex")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data as { category_id: string; color_hex: string | null }[];
}

export async function upsertOverride(userId: string, categoryId: string, colorHex: string | null) {
  const supabase = createClient();
  const { error } = await supabase.from("category_overrides").upsert({
    user_id: userId,
    category_id: categoryId,
    color_hex: colorHex,
  });
  if (error) throw new Error(error.message);
} 