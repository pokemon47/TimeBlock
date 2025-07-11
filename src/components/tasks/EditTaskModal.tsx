"use client";

import { TaskUpdate, updateTask } from "@/db/updateTask";
import { Button } from "@/components/ui/button";
import TaskForm from "./TaskForm";
import { useState, useEffect } from "react";

interface Props {
  task: {
    id: string;
    title: string;
    duration_estimated: number | null;
    priority: string | null;
    difficulty: number | null;
    category_id: string | null;
  };
  onClose: () => void;
}

export default function EditTaskModal({ task, onClose }: Props) {
  // esc key close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const initial = {
    title: task.title,
    hours: Math.floor((task.duration_estimated ?? 0) / 3600),
    minutes: Math.floor(((task.duration_estimated ?? 0) % 3600) / 60),
    priority: (task.priority ?? "medium") as any,
    difficulty: task.difficulty ?? 5,
    categoryId: task.category_id,
  };

  async function handleSave(values: {
    title: string;
    duration_estimated: number;
    priority: string;
    difficulty: number;
    category_id: string | null;
  }) {
    const update: TaskUpdate = {
      title: values.title,
      duration_estimated: values.duration_estimated,
      priority: values.priority,
      difficulty: values.difficulty,
      category_id: values.category_id,
    };
    await updateTask(task.id, update);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-background rounded p-6 w-full max-w-lg max-h-[90vh] overflow-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Task</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <TaskForm initial={initial} onSubmit={handleSave} onCancel={onClose} submitLabel="Save" />
      </div>
    </div>
  );
} 