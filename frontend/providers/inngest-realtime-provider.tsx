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

// Extract title from file content based on file type
function extractTitleFromContent(content: string, fileType: string, fileName: string): string {
  try {
    // Check for email subject line first (emails might be markdown files)
    const subjectMatch = content.match(/^Subject:\s*(.+)$/mi);
    if (subjectMatch && subjectMatch[1]) {
      return subjectMatch[1].trim();
    }
    
    // For Markdown files
    if (fileType === 'markdown' || fileName.endsWith('.md')) {
      // Look for first # heading
      const h1Match = content.match(/^#\s+(.+)$/m);
      if (h1Match) return h1Match[1].trim();
      
      // Fallback: look for any heading
      const anyHeadingMatch = content.match(/^#{1,6}\s+(.+)$/m);
      if (anyHeadingMatch) return anyHeadingMatch[1].trim();
      
      // Fallback: look for bold text at the beginning
      const boldMatch = content.match(/^\*\*(.+?)\*\*/);
      if (boldMatch) return boldMatch[1].trim();
    }
    
    // For JSON files
    if (fileType === 'json' || fileName.endsWith('.json')) {
      try {
        const parsed = JSON.parse(content);
        // Look for common title fields
        if (parsed.title) return parsed.title;
        if (parsed.subject) return parsed.subject;
        if (parsed.name) return parsed.name;
        if (parsed.header) return parsed.header;
      } catch {
        // JSON parsing failed, continue with other methods
      }
    }
    
    // For HTML files
    if (fileType === 'html' || fileName.endsWith('.html')) {
      // Look for <title> tag
      const titleMatch = content.match(/<title[^>]*>(.+?)<\/title>/i);
      if (titleMatch) return titleMatch[1].trim();
      
      // Look for first <h1>
      const h1Match = content.match(/<h1[^>]*>(.+?)<\/h1>/i);
      if (h1Match) return h1Match[1].replace(/<[^>]+>/g, '').trim();
    }
    
    // For plain text or CSV: use first non-empty line (if reasonable length)
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length < 100 && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
        // Check if it looks like a title (not code or data)
        if (!trimmed.includes('{') && !trimmed.includes('}') && !trimmed.includes(';')) {
          return trimmed;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to extract title from content:', e);
  }
  
  // Fallback: clean up the fileName to make it more readable
  return fileName
    .replace(/\.[^.]+$/, '') // Remove extension
    .replace(/_/g, ' ')      // Replace underscores with spaces
    .replace(/-/g, ' ')      // Replace hyphens with spaces
    .replace(/\b\w/g, l => l.toUpperCase()) // Title case
    .replace(/\s+/g, ' ')    // Clean up multiple spaces
    .trim();
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
        } else if (message.type === "file_created") {
          // Handle file creation message
          console.log("📁 FILE_CREATED message received (global):", message);
          const currentTask = getTaskById(taskId);
          const data = message.data as {
            filePath: string;
            fileName: string;
            fileType: string;
            directory: string;
            size: number;
            modifiedAt: number;
          };
          
          if (currentTask) {
            const updatedFiles = {
              ...currentTask.files,
              [data.filePath]: {
                metadata: data,
                content: currentTask.files?.[data.filePath]?.content || "",
                status: 'new' as const,
                updatedAt: Date.now()
              }
            };
            
            console.log("📁 Updating task files (global):", updatedFiles);
            updateTask(taskId, {
              files: updatedFiles
            });
          }
        } else if (message.type === "file_content") {
          // Handle file content message
          console.log("📄 FILE_CONTENT message received (global):", message);
          const currentTask = getTaskById(taskId);
          const data = message.data as {
            filePath: string;
            content: string;
          };
          
          if (currentTask) {
            const existingFile = currentTask.files?.[data.filePath];
            const fileMetadata = existingFile?.metadata || {
              fileName: data.filePath.split('/').pop() || '',
              fileType: 'text',
              directory: data.filePath.split('/').slice(0, -1).join('/'),
              size: 0,
              modifiedAt: Date.now()
            };
            
            // Extract title from content
            const displayTitle = extractTitleFromContent(
              data.content,
              fileMetadata.fileType,
              fileMetadata.fileName
            );
            
            console.log("📄 Extracted title:", displayTitle, "from file:", fileMetadata.fileName);
            
            const updatedFiles = {
              ...currentTask.files,
              [data.filePath]: {
                metadata: {
                  ...fileMetadata,
                  displayTitle
                },
                content: data.content,
                status: existingFile?.status || 'new' as const,
                updatedAt: Date.now()
              }
            };
            
            console.log("📄 Updating task with file content (global):", updatedFiles);
            updateTask(taskId, {
              files: updatedFiles
            });
          }
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