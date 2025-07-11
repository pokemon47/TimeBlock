"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSidebar } from "@/contexts/SidebarContext";
import NewTaskForm from "./NewTaskForm";
import { createClient } from "@/lib/supabase/browser";
import TaskItem from "./TaskItem";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import * as Popover from "@radix-ui/react-popover";
import { Filter } from "lucide-react";
import { useAutoAnimate } from "@formkit/auto-animate/react";

interface Props {
  /** The current authenticated user's id */
  userId: string;
}

export default function TaskSidebar({ userId }: Props) {
  const { open } = useSidebar();
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [search, setSearch] = useState("");

  // Local tasks state
  const [tasks, setTasks] = useState<any[]>([]);
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  /* ---------------- Filters & sorting ---------------- */
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [sort, setSort] = useState<
    | "created-asc"
    | "created-desc"
    | "duration-asc"
    | "duration-desc"
    | "priority-asc"
    | "priority-desc"
    | "difficulty-asc"
    | "difficulty-desc"
  >("created-asc");
  const [listRef] = useAutoAnimate<HTMLUListElement>();

  /* Category data */
  type Cat = { id: string; parent_id: string | null; name: string };
  const [parents, setParents] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Cat[]>([]);
  const [parentFilterId, setParentFilterId] = useState<string | "all" | "uncat">("all");
  const [subFilterId, setSubFilterId] = useState<string>("");

  // fetch categories once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,parent_id,name")
        .eq("archived", false);
      if (error) return;
      const cats = data as Cat[];
      setParents(cats.filter((c) => c.parent_id === null));
      setSubs(cats.filter((c) => c.parent_id !== null));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape key handler for New Task modal
  useEffect(() => {
    if (!showNewTaskModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowNewTaskModal(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showNewTaskModal]);

  const fetchTasks = useCallback(async () => {
    const supabase = createClient();

    // Calculate today (UTC) boundaries like the server util
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    if (!error) {
      setTasks((data as any[]) ?? []);
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`tasks-list-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
        (payload) => {
          setTasks((prev) => {
            const evt = payload.eventType;
            if (evt === "INSERT") {
              return [...prev, payload.new];
            }
            if (evt === "UPDATE") {
              return prev.map((t) => (t.id === payload.new.id ? payload.new : t));
            }
            if (evt === "DELETE") {
              const filtered = prev.filter((t) => t.id !== payload.old.id);
              // Refetch to ensure consistency after a brief delay
              console.log("DOING DELETE")
              setTimeout(fetchTasks, 200);
              return filtered;
            }
            return prev;
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchTasks]);

  // Memoized filtered + sorted tasks
  const visibleTasks = useMemo(() => {
    let list = [...tasks];
    // Search filter
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter((t) => (t.title ?? "").toLowerCase().includes(term));
    }

    // Priority filter
    if (priorityFilter !== "all") {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    // Category filter
    if (subFilterId) {
      list = list.filter((t) => t.category_id === subFilterId);
    } else if (parentFilterId !== "all") {
      if (parentFilterId === "uncat") {
        list = list.filter((t) => t.category_id === null);
      } else {
        const childIds = subs.filter((s) => s.parent_id === parentFilterId).map((s) => s.id);
        list = list.filter((t) => t.category_id === parentFilterId || childIds.includes(t.category_id));
      }
    }

    // Sorting
    const [sortKey, sortDir] = sort.split("-") as [string, "asc" | "desc"];  
    list.sort((a, b) => {
      let compare = 0;
      switch (sortKey) {
        case "created":
          compare = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "duration":
          compare = (a.duration_estimated ?? 0) - (b.duration_estimated ?? 0);
          break;
        case "priority": {
          const order = { high: 3, medium: 2, low: 1 } as Record<string, number>;
          compare = (order[a.priority ?? "medium"] ?? 0) - (order[b.priority ?? "medium"] ?? 0);
          break;
        }
        case "difficulty":
          compare = (a.difficulty ?? 0) - (b.difficulty ?? 0);
          break;
      }
      return sortDir === "asc" ? compare : -compare;
    });

    return list;
  }, [tasks, search, priorityFilter, sort, parentFilterId, subFilterId, subs]);

  // Sidebar open state is managed by provider, no local collapse needed here

  // Helper for width classes
  const widthClass = open ? "w-[25vw] min-w-[300px]" : "w-0";

  // ------------------------- Persistence ------------------------
  const PREF_KEY = "tb_sidebar_prefs";

  // Load on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw);
      if (prefs.search) setSearch(prefs.search);
      if (prefs.priorityFilter) setPriorityFilter(prefs.priorityFilter);
      if (prefs.parentFilterId) setParentFilterId(prefs.parentFilterId);
      if (prefs.subFilterId) setSubFilterId(prefs.subFilterId);
      if (prefs.sort) setSort(prefs.sort);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save whenever any preference changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefs = {
      search,
      priorityFilter,
      parentFilterId,
      subFilterId,
      sort,
    };
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  }, [search, priorityFilter, parentFilterId, subFilterId, sort]);

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`h-full flex flex-col ${widthClass} transition-all duration-300 bg-card border-r border-border`}
      >
        {open && (
          <>
            {/* Header / controls */}
            <div className="p-4 space-y-4 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Tasks</h2>
                <Button size="sm" onClick={() => setShowNewTaskModal(true)}>
                  Add Task
                </Button>
              </div>

              {/* Search & filter trigger */}
              <div className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                {/* Popover trigger */}
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <button
                      aria-label="Filter & sort"
                      className="relative p-2 rounded border border-input bg-background hover:bg-muted transition-colors"
                    >
                      <Filter className="h-4 w-4" />
                      {/* indicator dot */}
                      {(priorityFilter !== "all" || parentFilterId !== "all" || subFilterId || sort !== "created-asc") && (
                        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  </Popover.Trigger>
                  <Popover.Content sideOffset={4} className="z-[60] rounded border border-border bg-popover p-3 w-48 shadow-md">
                    <div className="space-y-3 text-sm">
                      {/* Priority select */}
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Priority</label>
                        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Category parent */}
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Category</label>
                        <Select value={parentFilterId} onValueChange={(v) => {
                          setParentFilterId(v as any);
                          setSubFilterId("");
                        }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="uncat">Uncategorised</SelectItem>
                            {parents.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Category sub */}
                      {parentFilterId !== "all" && parentFilterId !== "uncat" && subs.some(s => s.parent_id === parentFilterId) && (
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Sub</label>
                          <Select
                            value={subFilterId || "all"}
                            onValueChange={(v) => setSubFilterId(v === "all" ? "" : v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              {subs
                                .filter((s) => s.parent_id === parentFilterId)
                                .map((s) => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Combined sort */}
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Sort</label>
                        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Sort" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="created-asc">Created ↑ (default)</SelectItem>
                            <SelectItem value="created-desc">Created ↓</SelectItem>
                            <SelectItem value="duration-asc">Duration ↑</SelectItem>
                            <SelectItem value="duration-desc">Duration ↓</SelectItem>
                            <SelectItem value="priority-asc">Priority ↑</SelectItem>
                            <SelectItem value="priority-desc">Priority ↓</SelectItem>
                            <SelectItem value="difficulty-asc">Difficulty ↑</SelectItem>
                            <SelectItem value="difficulty-desc">Difficulty ↓</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Clear filters */}
                      {(priorityFilter !== "all" || parentFilterId !== "all" || subFilterId || sort !== "created-asc") && (
                        <button
                          className="mt-2 text-xs underline text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setPriorityFilter("all");
                            setParentFilterId("all");
                            setSubFilterId("");
                            setSort("created-asc");
                          }}
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </Popover.Content>
                </Popover.Root>
              </div>
            </div>

            {/* Scrollable task list with left-side scrollbar */}
            <div className="flex-1 overflow-y-auto px-4 pb-4" dir="rtl">
              <div dir="ltr" className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks for today yet.</p>
                ) : (
                  <ul ref={listRef} className="space-y-2">
                    {visibleTasks.map((t) => (
                      <TaskItem key={t.id} task={t as any} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* New Task modal */}
      {showNewTaskModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowNewTaskModal(false)}
        >
          <div
            className="bg-background rounded p-6 w-full max-w-lg max-h-[90vh] overflow-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">New Task</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNewTaskModal(false)}>
                ✕
              </Button>
            </div>
            <NewTaskForm />
          </div>
        </div>
      )}
    </>
  );
} 