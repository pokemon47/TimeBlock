"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";
import { createCategory, updateCategory, archiveCategory, unarchiveCategory } from "@/db/category";
// Overrides no longer used for parent colors

interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  color_hex: string | null;
  archived: boolean;
}

export default function CategoryManager() {
  const supabase = createClient();
  const [parents, setParents] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Category[]>([]);
  const [archivedSubs, setArchivedSubs] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // bulk delete state
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [restoreMode, setRestoreMode] = useState(false);
  const [restoreSelected, setRestoreSelected] = useState<Set<string>>(new Set());

  function toggleRestoreSelect(id: string) {
    setRestoreSelected((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  }

  async function handleBulkRestore() {
    if (restoreSelected.size === 0) return;
    setLoading(true);
    try {
      await Promise.all(Array.from(restoreSelected).map((id) => unarchiveCategory(id)));
      setRestoreSelected(new Set());
      setRestoreMode(false);
      fetchCats();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const colorMap: Record<string, string> = {
    Work: "#1F3A93",
    Personal: "#a283e6",
    Health: "#27AE60",
    Learning: "#F39C12",
    Other: "#7F8C8D",
  };

  const fetchCats = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id,parent_id,name,color_hex,archived");
    if (error) return setError(error.message);
    const cats = data as Category[];
    let parentsList = cats.filter((c) => c.parent_id == null && !c.archived);
    setSubs(cats.filter((c) => c.parent_id != null && !c.archived));

    // Apply overrides
    setParents(parentsList);
    setArchivedSubs(cats.filter((c) => c.parent_id != null && c.archived));
  };

  useEffect(() => {
    // initial fetch
    fetchCats();

    // Listen realtime for updates
    const channel = supabase
      .channel("cats")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        fetchCats();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // no userId dependency anymore

  // Local state for adding sub
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");

  // inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [editModal, setEditModal] = useState<null | { id: string; name: string; color: string | null }>(null);

  async function handleAddSub(parentId: string) {
    if (!newSubName.trim()) return;
    setLoading(true);
    const norm = newSubName.replace(/\s+/g, "").toLowerCase();
    if (subs.some((s) => s.parent_id != null && s.name.replace(/\s+/g, "").toLowerCase() === norm)) {
      setError("A sub-category with this name already exists.");
      setLoading(false);
      return;
    }
    // default colour random pastel (ensure unique)
    let newColor: string | undefined;
    const existingColors = subs.map((s) => s.color_hex).filter(Boolean);
    for (let i = 0; i < 20; i++) {
      const hue = Math.floor(Math.random() * 360);
      newColor = `hsl(${hue} 70% 70%)`;
      if (!existingColors.includes(newColor)) break;
    }
    try {
      const newCat = await createCategory(parentId, newSubName.trim(), newColor);
      setSubs((prev) => [...prev, newCat as any]);
      setNewSubName("");
      setAddingParentId(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function childrenOf(parentId: string) {
    return subs.filter((s) => s.parent_id === parentId);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }

  async function handleBulkArchive() {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      await Promise.all(Array.from(selected).map((id) => archiveCategory(id)));
      setSelected(new Set());
      setSelectMode(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      await updateCategory(id, { name: editName.trim() });
      setEditingId(null);
      setEditName("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Edit modal ---------- */
  function openEdit(cat: Category) {
    setEditModal({ id: cat.id, name: cat.name, color: cat.color_hex ?? "#000000" });
  }

  async function saveEdit() {
    if (!editModal) return;
    setLoading(true);
    const norm = editModal.name.replace(/\s+/g, "").toLowerCase();
    if (
      subs.some(
        (s) => s.id !== editModal.id && s.name.replace(/\s+/g, "").toLowerCase() === norm
      )
    ) {
      setError("A sub-category with this name already exists.");
      setLoading(false);
      return;
    }
    if (
      editModal.color &&
      subs.some((s) => s.id !== editModal.id && s.color_hex === editModal.color)
    ) {
      setError("A sub-category with this colour already exists.");
      setLoading(false);
      return;
    }
    try {
      await updateCategory(editModal.id, { name: editModal.name.trim(), color_hex: editModal.color });
      setEditModal(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* top action bar */}
      <div className="flex justify-end gap-2">
        {selectMode ? (
          <>
            <Button
              size="sm"
              variant="destructive"
              disabled={selected.size === 0 || loading}
              onClick={handleBulkArchive}
            >
              Archive selected ({selected.size})
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>
              Cancel
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setSelectMode(true)}>
            Archive sub-categories
          </Button>
        )}
      </div>
      {parents.map((p) => (
        <div key={p.id} className="border rounded p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectMode && (
                (() => {
                  const childIds = childrenOf(p.id).map((c) => c.id);
                  const allSelected = childIds.every((id) => selected.has(id));
                  const someSelected = childIds.some((id) => selected.has(id));
                  return (
                    <input
                      type="checkbox"
                      className="accent-primary h-4 w-4"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allSelected && someSelected;
                      }}
                      onChange={() => {
                        setSelected((prev) => {
                          const set = new Set(prev);
                          if (allSelected) {
                            childIds.forEach((id) => set.delete(id));
                          } else {
                            childIds.forEach((id) => set.add(id));
                          }
                          return new Set(set);
                        });
                      }}
                    />
                  );
                })()
              )}
              {/* parent color dot and picker */}
              <span
                className="inline-block h-3 w-3 rounded-full border border-border"
                style={{ backgroundColor: colorMap[p.name] ?? "#6b7280" }}
              />
              <h3 className="font-semibold">{p.name}</h3>
            </div>
            <Button size="sm" onClick={() => setAddingParentId(addingParentId === p.id ? null : p.id)}>
              + Add Sub
            </Button>
          </div>
          <ul className="mt-3 space-y-2 pl-4 list-disc">
            {childrenOf(p.id).map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                {selectMode && (
                  <input
                    type="checkbox"
                    className="accent-primary h-4 w-4"
                    checked={selected.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                  />
                )}
                {editingId === s.id ? (
                  <>
                    <input
                      className="flex-1 border border-input rounded px-1 text-sm bg-background"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <Button size="icon" onClick={() => handleRename(s.id)} disabled={loading}>
                      ✓
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                      ✕
                    </Button>
                  </>
                ) : (
                  <>
                    <label className="cursor-pointer inline-flex items-center mr-2">
                      <span className="inline-block h-2 w-2 rounded-full border border-border" style={{ backgroundColor: s.color_hex ?? "#6b7280" }} />
                      <input
                        type="color"
                        className="sr-only"
                        defaultValue={s.color_hex ?? "#000000"}
                        onChange={async (e) => {
                          const hex = e.target.value;
                          try {
                            await updateCategory(s.id, { color_hex: hex });
                            fetchCats();
                          } catch (err) {
                            setError((err as Error).message);
                          }
                        }}
                      />
                    </label>
                    <span className="flex-1">{s.name}</span>
                    {!selectMode && (
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="p-1 hover:bg-muted rounded">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content className="z-[80] bg-popover border border-border rounded shadow-md p-1 text-sm">
                          <DropdownMenu.Item
                            className="px-3 py-1 hover:bg-accent cursor-pointer"
                            onSelect={() => openEdit(s)}
                          >
                            Edit
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            className="px-3 py-1 hover:bg-accent cursor-pointer"
                            onSelect={() => archiveCategory(s.id).then(fetchCats)}
                          >
                            Archive
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    )}
                  </>
                )}
              </li>
            ))}
            {addingParentId === p.id && (
              <li className="flex flex-col gap-1">
                {error && addingParentId === p.id && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    value={newSubName}
                    onChange={(e) => {
                      setNewSubName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Sub-category name"
                    className="h-8"
                  />
                  <Button size="sm" onClick={() => handleAddSub(p.id)} disabled={loading}>
                    Add
                  </Button>
                </div>
              </li>
            )}
          </ul>
        </div>
      ))}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Archived section */}
      <div className="mt-8">
        <button
          className="text-sm underline flex items-center gap-1"
          onClick={() => setShowArchived((p) => !p)}
        >
          {showArchived ? "Hide" : "Show"} Archived ({archivedSubs.length})
        </button>

        {showArchived && (
          <>
            <div className="flex justify-end gap-2 mt-2">
              {restoreMode ? (
                <>
                  <Button size="sm" onClick={handleBulkRestore} disabled={restoreSelected.size === 0 || loading}>
                    Restore selected ({restoreSelected.size})
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setRestoreMode(false); setRestoreSelected(new Set()); }}>
                    Cancel
                  </Button>
                </>
              ) : (
                archivedSubs.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setRestoreMode(true)}>
                    Restore sub-categories
                  </Button>
                )
              )}
            </div>
            <ul className="mt-3 space-y-2 pl-4 list-disc">
              {archivedSubs.length === 0 && <li className="text-sm text-muted-foreground">No archived sub-categories</li>}
              {archivedSubs.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                {restoreMode && (
                  <input
                    type="checkbox"
                    className="accent-primary h-4 w-4"
                    checked={restoreSelected.has(s.id)}
                    onChange={() => toggleRestoreSelect(s.id)}
                  />
                )}
                <span
                  className="inline-block h-2 w-2 rounded-full mr-2"
                  style={{ backgroundColor: s.color_hex ?? "#6b7280" }}
                />
                <span className="flex-1 line-through opacity-70">{s.name}</span>
                {!restoreMode && (
                  <Button size="sm" variant="outline" onClick={() => {
                     unarchiveCategory(s.id).then(fetchCats);
                   }}>
                    Restore
                  </Button>
                )}
              </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setEditModal(null)}>
          <div className="bg-background rounded p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Edit Sub-category</h3>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={editModal.name} onChange={(e) => setEditModal({ ...editModal, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Colour</label>
              <input type="color" value={editModal.color ?? "#000000"} onChange={(e) => setEditModal({ ...editModal, color: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditModal(null)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={loading}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 