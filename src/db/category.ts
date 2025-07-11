import { createClient } from "@/lib/supabase/browser";
import type { Database } from "../../../types/supabase";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
export type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

/**
 * Create a user sub-category. Pass `parentId` as one of the global parent IDs.
 */
export async function createCategory(parentId: string, name: string, colorHex?: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ parent_id: parentId, name, color_hex: colorHex } satisfies CategoryInsert)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CategoryRow;
}

/** Update name / colour. */
export async function updateCategory(id: string, fields: Partial<Pick<CategoryUpdate, "name" | "color_hex">>) {
  const supabase = createClient();
  const { error } = await supabase.from("categories").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Archive a sub-category and move tasks to its parent. */
export async function archiveCategory(subCategoryId: string) {
  const supabase = createClient();

  // Fetch sub-category to know its parent
  const { data: subCat, error: fetchErr } = await supabase
    .from("categories")
    .select("parent_id")
    .eq("id", subCategoryId)
    .single();
  if (fetchErr) throw new Error(fetchErr.message);

  const parentId = (subCat as any).parent_id as string | null;

  // Reassign tasks first
  if (parentId) {
    await supabase.from("tasks").update({ category_id: parentId }).eq("category_id", subCategoryId);
  } else {
    // If somehow no parent, just set tasks.category_id = NULL
    await supabase.from("tasks").update({ category_id: null }).eq("category_id", subCategoryId);
  }

  // Archive the category
  const { error } = await supabase.from("categories").update({ archived: true }).eq("id", subCategoryId);
  if (error) throw new Error(error.message);
}

/** Reverse archive (un-archive). */
export async function unarchiveCategory(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("categories").update({ archived: false }).eq("id", id);
  if (error) throw new Error(error.message);
} 