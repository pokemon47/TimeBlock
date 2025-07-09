"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { Button } from "@/components/ui/button";
import NewTaskForm from "@/components/tasks/NewTaskForm";

export default function AddTaskModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Add Task
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center">
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <div className="relative bg-card rounded p-6 w-full max-w-lg z-50 overflow-y-auto max-h-[90vh]">
          <Dialog.Title className="text-lg font-semibold mb-4">New Task</Dialog.Title>
          <NewTaskForm onSuccess={() => setOpen(false)} />
          <div className="mt-4 text-right">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
} 