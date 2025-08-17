"use client";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useEffect } from "react";

import { fetchRealtimeSubscriptionToken } from "@/app/actions/inngest";
import { useTaskStore } from "@/stores/tasks";

// Type definitions for Inngest message data
interface InngestMessageData {
  text?: string;
  id?: string;
  isStreaming?: boolean;
  streamId?: string;
  jobId?: string;
  ts?: number;
  [key: string]: any; // Allow additional properties
}

interface InngestMessage {
  type: string;
  role?: string;
  data?: InngestMessageData;
  action?: { command: string[] };
  output?: string;
}

export default function Container({ children }: { children: React.ReactNode }) {
  const { updateTask, getTaskById } = useTaskStore();
  const { latestData } = useInngestSubscription({
    refreshToken: fetchRealtimeSubscriptionToken,
    bufferInterval: 0,
    enabled: true,
  });

  useEffect(() => {
    if (latestData?.channel === "tasks" && latestData.topic === "status") {
      updateTask(latestData.data.taskId, {
        status: latestData.data.status,
        hasChanges: true,
        sessionId: latestData.data.sessionId,
      });
    }

    if (latestData?.channel === "tasks" && latestData.topic === "update") {
      if (latestData.data.message.type === "git") {
        updateTask(latestData.data.taskId, {
          statusMessage: latestData.data.message.output as string,
        });
      }

      if (latestData.data.message.type === "local_shell_call") {
        const task = getTaskById(latestData.data.taskId);
        const message = latestData.data.message as unknown as InngestMessage;
        updateTask(latestData.data.taskId, {
          statusMessage: `Running command ${message.action?.command?.join(" ") || "unknown command"}`,
          messages: [
            ...(task?.messages || []),
            {
              role: "assistant",
              type: "local_shell_call",
              data: latestData.data.message,
            },
          ],
        });
      }

      if (latestData.data.message.type === "local_shell_call_output") {
        const task = getTaskById(latestData.data.taskId);
        updateTask(latestData.data.taskId, {
          messages: [
            ...(task?.messages || []),
            {
              role: "assistant",
              type: "local_shell_call_output",
              data: latestData.data.message,
            },
          ],
        });
      }

      // Handle our new Inngest message format from the backend
      if (
        latestData.data.message.type === "message" &&
        latestData.data.message.role === "assistant"
      ) {
        const task = getTaskById(latestData.data.taskId);
        
        updateTask(latestData.data.taskId, {
          messages: [
            ...(task?.messages || []),
            {
              role: "assistant",
              type: "message", 
              data: {
                text: (latestData.data.message as unknown as InngestMessage).data?.text,
                id: (latestData.data.message as unknown as InngestMessage).data?.id,
                isStreaming: (latestData.data.message as unknown as InngestMessage).data?.isStreaming,
                streamId: (latestData.data.message as unknown as InngestMessage).data?.streamId,
                jobId: (latestData.data.message as unknown as InngestMessage).data?.jobId,
                ts: (latestData.data.message as unknown as InngestMessage).data?.ts,
              },
            },
          ],
        });
      }
    }
  }, [latestData, updateTask, getTaskById]);

  return children;
}
