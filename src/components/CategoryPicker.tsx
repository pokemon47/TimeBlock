"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { createCategory } from "@/db/category";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Props {
  value: string | null; // selected category_id (parent or sub)
  onChange: (id: string) => void;
  onCreatingChange?: (creating: boolean) => void;
}

interface Category {
  id: string;
  parent_id: string | null;
  name: string;
}

export default function CategoryPicker({ value, onChange, onCreatingChange }: Props) {
  const supabase = createClient();
  const [parents, setParents] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Category[]>([]);
  const [parentId, setParentId] = useState<string | "">("");
  const [subId, setSubId] = useState<string | "">("");

  // new sub creation UI
  const [creating, setCreating] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Propagate creation state to parent for Enter-key handling
  useEffect(() => {
    onCreatingChange?.(creating);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creating]);

  // fetch categories once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,parent_id,name")
        .eq("archived", false);
      if (error) return;
      const cats = data as any as Category[];
      setParents(cats.filter((c) => c.parent_id === null));
      setSubs(cats.filter((c) => c.parent_id !== null));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when external value changes (edit scenario)
  useEffect(() => {
    if (!value) return;
    const selected = [...parents, ...subs].find((c) => c.id === value);
    if (!selected) return;
    if (selected.parent_id === null) {
      setParentId(selected.id);
      setSubId("");
    } else {
      setParentId(selected.parent_id);
      setSubId(selected.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, parents.length, subs.length]);

  const subOptions = subs.filter((s): s is Category => s != null && s.parent_id === parentId);

  async function confirmCreate() {
    if (!parentId || !newSubName.trim()) return;
    setCreateError(null);
    try {
      const newCat = await createCategory(parentId, newSubName.trim());
      setSubs((prev) => [...prev, newCat]);
      setSubId(newCat.id);
      // Defer onChange until next tick so parent receives updated state before possible form submit
      queueMicrotask(() => onChange(newCat.id));
      setCreating(false);
      setNewSubName("");
      // refocus the main task title input so Enter submits form again
      const titleEl = document.getElementById("title");
      if (titleEl) (titleEl as HTMLElement).focus();
    } catch (err) {
      setCreateError((err as Error).message);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Category</label>
      <div className="flex flex-col gap-2">
        <Select value={parentId} onValueChange={(id) => {
          setParentId(id);
          // reset sub when parent changes
          setSubId("");
          onChange(id);
        }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Uncategorised" />
          </SelectTrigger>
          <SelectContent>
            {parents.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sub selector */}
        {parentId && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Select value={subId || "none"} onValueChange={(val) => {
                if (val === "none") {
                  setSubId("");
                  onChange(parentId);
                } else {
                  setSubId(val);
                  onChange(val);
                }
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sub-category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" onClick={() => setCreating((p) => !p)}>+ New</Button>
            </div>

            {creating && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="flex-1 border border-input rounded px-2 py-1 text-sm bg-background"
                  placeholder="Sub-category name"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                />
                <Button type="button" size="sm" onClick={confirmCreate}>Add</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setCreating(false); setNewSubName(""); }}>Cancel</Button>
              </div>
            )}

            {createError && <p className="text-xs text-red-600 mt-1">{createError}</p>}
          </div>
        )}
      </div>
    </div>
  );
} 