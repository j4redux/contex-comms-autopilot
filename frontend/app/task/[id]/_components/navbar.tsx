"use client";
import Link from "next/link";
import {
  Archive,
  ArrowLeft
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { useTaskStore } from "@/stores/tasks";

interface Props {
  id: string;
}

export default function TaskNavbar({ id }: Props) {
  const { getTaskById, updateTask } = useTaskStore();
  const task = getTaskById(id);

  const handleArchiveTask = useCallback(() => {
    if (!task) return;

    updateTask(id, {
      isArchived: !task.isArchived,
    });
  }, [task, id, updateTask]);

  return (
    <div className="h-14 border-b flex items-center justify-between px-4">
      <div className="flex items-center gap-x-2">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <div className="h-8 border-r" />
        <div className="flex flex-col gap-x-2 ml-4 flex-1 min-w-0">
          <h3 className="font-medium overflow-hidden text-ellipsis whitespace-nowrap max-w-md">{task?.title}</h3>
          <div className="flex items-center gap-x-0">
            <p className="text-sm text-muted-foreground">
              {task?.createdAt
                ? formatDistanceToNow(new Date(task.createdAt), {
                    addSuffix: true,
                  })
                : "Loading..."}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-x-2">
        {task?.isArchived ? (
          <Button
            variant="outline"
            className="rounded-full"
            onClick={handleArchiveTask}
          >
            <Archive />
            Unarchive
          </Button>
        ) : (
          <Button
            variant="outline"
            className="rounded-full"
            onClick={handleArchiveTask}
          >
            <Archive />
            Archive
          </Button>
        )}
        {/* Replaced pull request button with knowledge status */}
        {/* 
        <Button
          className="rounded-full"
          variant="secondary"
          disabled
        >
          {task?.status === "IN_PROGRESS" ? "Processing..." : "Completed"}
        </Button>
        */}
      </div>
    </div>
  );
}