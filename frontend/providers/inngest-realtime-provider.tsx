"use client";
import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { fetchRealtimeSubscriptionToken } from "@/app/actions/inngest";
import { useTaskStore } from "@/stores/tasks";

interface IncomingMessage {
  type: string;
  data?: unknown;
  jobId?: string;
  ts?: number;
  [key: string]: unknown;
}

// Type guard to check if message is a valid incoming message
function isValidIncomingMessage(message: unknown): message is IncomingMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    typeof message.type === "string"
  );
}

interface InngestRealtimeContextType {
  isConnected: boolean;
  error: unknown;
}

const InngestRealtimeContext = createContext<InngestRealtimeContextType>({
  isConnected: false,
  error: null,
});

export const useInngestRealtime = () => useContext(InngestRealtimeContext);

interface InngestRealtimeProviderProps {
  children: ReactNode;
}

export function InngestRealtimeProvider({ children }: InngestRealtimeProviderProps) {
  const { updateTask, getTaskById } = useTaskStore();
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const subscriptionReadyRef = useRef(false);

  const { latestData, error } = useInngestSubscription({
    refreshToken: fetchRealtimeSubscriptionToken,
    bufferInterval: 0,
  });

  // Track subscription ready state
  useEffect(() => {
    if (latestData && !subscriptionReadyRef.current) {
      subscriptionReadyRef.current = true;
      console.log("✅ Global Inngest subscription ready");
    }
    
    if (error) {
      console.error("❌ Global Inngest subscription error:", error);
    }
  }, [latestData, error]);

  // Global message handler - routes messages to task store
  useEffect(() => {
    if (latestData?.channel === "tasks" && latestData.topic === "update") {
      const { taskId, message } = latestData.data;

      if (taskId && message && isValidIncomingMessage(message)) {
        // Create unique message ID to prevent duplicate processing
        const messageId = `${taskId}-${message.type}-${message.jobId || 'no-job'}-${message.ts || 'no-ts'}`;
        
        if (processedMessagesRef.current.has(messageId)) {
          console.log("⚠️ Skipping duplicate message:", message.type, messageId.slice(-20));
          return;
        }
        
        processedMessagesRef.current.add(messageId);
        console.log("🌐 Global subscription processing message:", message.type, "for task:", taskId);
        
        // Route messages to task store based on type
        if (message.type === "result") {
          console.log("✅ RESULT MESSAGE (global):", { data: message.data, type: typeof message.data });
          const currentTask = getTaskById(taskId);
          if (currentTask) {
            updateTask(taskId, {
              messages: [
                ...currentTask.messages,
                {
                  role: "assistant" as const,
                  type: "message",
                  data: {
                    text: typeof message.data === 'string' ? message.data : String(message.data || ''),
                    messageType: message.type,
                    jobId: message.jobId,
                    timestamp: message.ts
                  }
                }
              ],
            });
          }
        } else if (message.type === "done") {
          console.log("✅ DONE MESSAGE (global) for task:", taskId);
          updateTask(taskId, {
            status: "DONE",
          });
        } else if (message.type === "error") {
          console.log("❌ ERROR MESSAGE (global):", message);
          const currentTask = getTaskById(taskId);
          if (currentTask) {
            updateTask(taskId, {
              messages: [
                ...currentTask.messages,
                {
                  role: "assistant" as const,
                  type: "message",
                  data: {
                    text: `Error: ${(message as IncomingMessage & { message?: string }).message || message.data || 'Unknown error'}`,
                    messageType: "error",
                    jobId: message.jobId,
                    timestamp: message.ts
                  }
                }
              ],
              status: "DONE"
            });
          }
        } else if (message.type === "log") {
          // Don't spam UI with log messages, just console log
          console.log("📝 LOG (global):", message.data);
        } else {
          console.log("❓ OTHER MESSAGE (global):", message.type, message);
          const currentTask = getTaskById(taskId);
          if (currentTask) {
            updateTask(taskId, {
              messages: [
                ...currentTask.messages,
                {
                  role: "assistant" as const,
                  type: "message",
                  data: {
                    text: `System: ${message.type} - ${String(message.data || '')}`,
                    messageType: message.type,
                    jobId: message.jobId,
                    timestamp: message.ts
                  }
                }
              ],
            });
          }
        }
      }
    }
  }, [latestData, updateTask, getTaskById]);

  const contextValue: InngestRealtimeContextType = {
    isConnected: subscriptionReadyRef.current,
    error,
  };

  return (
    <InngestRealtimeContext.Provider value={contextValue}>
      {children}
    </InngestRealtimeContext.Provider>
  );
}