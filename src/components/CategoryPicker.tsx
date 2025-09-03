"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Props {
  value: string | null; // selected category_id (parent or sub)
  onChange: (id: string) => void;
}

interface Category {
  id: string;
  parent_id: string | null;
  name: string;
}

export default function CategoryPicker({ value, onChange }: Props) {
  const supabase = createClient();
  const [parents, setParents] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Category[]>([]);
  const [parentId, setParentId] = useState<string | "">("");
  const [subId, setSubId] = useState<string | "">("");

  // Sub-category creation has been disabled in the add-task modal.

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
  // Creation helpers removed.

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
              {/* Sub-category creation disabled */}
            </div>

            {/* Creation form removed */}
          </div>
        )}
      </div>
    </div>
  );
} 