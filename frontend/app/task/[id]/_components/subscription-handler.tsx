"use client";

import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useEffect, useRef, useState } from "react";
import { fetchRealtimeSubscriptionToken } from "@/app/actions/inngest";
import { useTaskStore } from "@/stores/tasks";

interface StreamingMessage {
  role: "user" | "assistant";
  type: string;
  data: Record<string, unknown> & {
    text?: string;
    isStreaming?: boolean;
    streamId?: string;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

interface IncomingMessage {
  role: "user" | "assistant";
  type: string;
  data: Record<string, unknown> & {
    text?: string;
    isStreaming?: boolean;
    streamId?: string;
    chunkIndex?: number;
    totalChunks?: number;
    call_id?: string;
    action?: {
      command?: string[];
    };
    output?: string;
  };
}

// Type guard to check if a message has streaming properties
function isStreamingMessage(message: unknown): message is IncomingMessage & {
  data: { isStreaming: true; streamId: string };
} {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "message" &&
    "data" in message &&
    typeof message.data === "object" &&
    message.data !== null &&
    "isStreaming" in message.data &&
    message.data.isStreaming === true &&
    "streamId" in message.data &&
    typeof message.data.streamId === "string"
  );
}

// Type guard to check if a message is a completed stream
function isCompletedStreamMessage(
  message: unknown
): message is IncomingMessage & {
  data: { streamId: string; isStreaming: false };
} {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "message" &&
    "data" in message &&
    typeof message.data === "object" &&
    message.data !== null &&
    "streamId" in message.data &&
    typeof message.data.streamId === "string" &&
    (!("isStreaming" in message.data) || message.data.isStreaming === false)
  );
}

// Type guard to check if message is a valid incoming message
function isValidIncomingMessage(message: unknown): message is IncomingMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    "data" in message &&
    typeof message.type === "string" &&
    typeof message.data === "object" &&
    (
      // Regular messages need role
      ("role" in message && (message.role === "user" || message.role === "assistant")) ||
      // File messages don't need role
      (message.type === "file_created" || message.type === "file_content")
    )
  );
}

interface Props {
  taskId: string;
  streamingMessages: Map<string, StreamingMessage>;
  setStreamingMessages: React.Dispatch<React.SetStateAction<Map<string, StreamingMessage>>>;
}

export function SubscriptionHandler({ taskId, streamingMessages, setStreamingMessages }: Props) {
  const { getTaskById, updateTask } = useTaskStore();
  const task = getTaskById(taskId);
  const isMounted = useRef(true);
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true);

  // Initialize mounted state and cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Delay subscription cleanup to prevent stream cancellation errors
      setTimeout(() => {
        setSubscriptionEnabled(false);
      }, 500);
    };
  }, []);

  // Always call the hook but handle errors gracefully
  let latestData = null;
  let error = null;

  try {
    const result = useInngestSubscription({
      refreshToken: fetchRealtimeSubscriptionToken,
      bufferInterval: 100,
    });
    latestData = result.latestData;
    error = result.error;
  } catch (e) {
    console.warn('Subscription initialization failed:', e);
    // Set error to prevent further processing
    error = e;
  }

  useEffect(() => {
    if (!isMounted.current || !subscriptionEnabled) return;
    
    console.log("🔍 SubscriptionHandler latestData:", latestData);
    
    if (latestData?.channel === "tasks" && latestData.topic === "update") {
      const { taskId: messageTaskId, message } = latestData.data;
      console.log("🔍 SubscriptionHandler message for task:", messageTaskId, "message:", message);

      if (messageTaskId === taskId && message && isValidIncomingMessage(message)) {
        console.log("✅ SubscriptionHandler processing message type:", message.type);
        // Handle streaming messages
        if (isStreamingMessage(message)) {
          const streamId = message.data.streamId;

          setStreamingMessages((prev) => {
            const newMap = new Map(prev);
            const existingMessage = newMap.get(streamId);

            if (existingMessage) {
              // Append to existing streaming message
              newMap.set(streamId, {
                ...existingMessage,
                data: {
                  ...existingMessage.data,
                  text:
                    (existingMessage.data.text || "") +
                    (message.data.text || ""),
                  chunkIndex: message.data.chunkIndex,
                  totalChunks: message.data.totalChunks,
                },
              });
            } else {
              // New streaming message
              newMap.set(streamId, message as StreamingMessage);
            }

            return newMap;
          });
        } else if (isCompletedStreamMessage(message)) {
          // Stream ended, move to regular messages
          const streamId = message.data.streamId;
          const streamingMessage = streamingMessages.get(streamId);

          if (streamingMessage) {
            updateTask(taskId, {
              messages: [
                ...(task?.messages || []),
                {
                  ...streamingMessage,
                  data: {
                    ...streamingMessage.data,
                    text: message.data.text || streamingMessage.data.text,
                    isStreaming: false,
                  },
                },
              ],
            });

            setStreamingMessages((prev) => {
              const newMap = new Map(prev);
              newMap.delete(streamId);
              return newMap;
            });
          }
        } else if (message.type === "file_created") {
          // Handle file creation message
          console.log("📁 FILE_CREATED message received:", message);
          const data = message.data as {
            filePath: string;
            fileName: string;
            fileType: string;
            directory: string;
            size: number;
            modifiedAt: number;
          };
          
          const updatedFiles = {
            ...task?.files,
            [data.filePath]: {
              metadata: data,
              content: task?.files?.[data.filePath]?.content || "",
              status: 'new' as const,
              updatedAt: Date.now()
            }
          };
          
          console.log("📁 Updating task files:", updatedFiles);
          updateTask(taskId, {
            files: updatedFiles
          });
          
        } else if (message.type === "file_content") {
          // Handle file content message
          console.log("📄 FILE_CONTENT message received:", message);
          const data = message.data as {
            filePath: string;
            content: string;
          };
          
          const existingFile = task?.files?.[data.filePath];
          const updatedFiles = {
            ...task?.files,
            [data.filePath]: {
              metadata: existingFile?.metadata || {
                fileName: data.filePath.split('/').pop() || '',
                fileType: 'text',
                directory: data.filePath.split('/').slice(0, -1).join('/'),
                size: 0,
                modifiedAt: Date.now()
              },
              content: data.content,
              status: existingFile?.status || 'new' as const,
              updatedAt: Date.now()
            }
          };
          
          console.log("📄 Updating task with file content:", updatedFiles);
          updateTask(taskId, {
            files: updatedFiles
          });
        } else {
          // Regular non-streaming message
          updateTask(taskId, {
            messages: [...(task?.messages || []), message],
          });
        }
      }
    }
  }, [latestData, taskId, task?.messages, task?.files, streamingMessages, updateTask, setStreamingMessages, subscriptionEnabled]);

  // Handle subscription errors
  useEffect(() => {
    if (error && isMounted.current) {
      console.warn('Inngest subscription error:', error);
      // Don't throw or crash the app, just log the error
      // If it's a stream cancellation error, disable the subscription temporarily
      const errorMessage = typeof error === 'string' ? error : (error as Error)?.message || '';
      if (errorMessage.includes('ReadableStream') || errorMessage.includes('locked by a reader')) {
        console.warn('Stream error detected, temporarily disabling subscription');
        setSubscriptionEnabled(false);
        // Re-enable after a delay
        setTimeout(() => {
          if (isMounted.current) {
            setSubscriptionEnabled(true);
          }
        }, 1000);
      }
    }
  }, [error]);

  return null; // This component doesn't render anything
}