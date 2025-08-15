"use client";
import { useRef, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useTaskStore } from "@/stores/tasks";
import { createTaskAction } from "@/app/actions/inngest";

export default function TaskForm() {
  const { addTask } = useTaskStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "100px"; // Reset to min height
      textarea.style.height = Math.max(100, textarea.scrollHeight) + "px";
    }
  };

  const handleAddTask = async (mode: "code" | "ask") => {
    if (value) {
      const task = addTask({
        title: value,
        hasChanges: false,
        description: "",
        messages: [],
        status: "IN_PROGRESS",
        branch: "", // Not needed for Omni
        sessionId: "",
        repository: "", // Not needed for Omni
        mode,
      });
      await createTaskAction({ task, prompt: value });
      setValue("");
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-y-10 mt-14">
      <h1 className="text-4xl text-center font-bold">
        What are you working on?
      </h1>
      <div className="p-0.5 rounded-lg bg-muted">
        <div className="flex flex-col gap-y-2 border bg-background rounded-lg p-4">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Share your thoughts on metrics, challenges, wins, plans, or ask questions about your business"
            className="w-full min-h-[100px] resize-none border-none p-0 focus:outline-none focus:border-transparent overflow-hidden"
          />
          <div className="flex items-center justify-end">
            {value && (
              <div className="flex items-center gap-x-2">
                <Button variant="outline" onClick={() => handleAddTask("ask")}>
                  Ask
                </Button>
                <Button onClick={() => handleAddTask("code")}>Process</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
