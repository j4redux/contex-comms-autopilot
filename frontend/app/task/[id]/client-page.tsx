"use client";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useEffect, useRef } from "react";

import TaskNavbar from "./_components/navbar";
import MessageInput from "./_components/message-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchRealtimeSubscriptionToken } from "@/app/actions/inngest";
import { useTaskStore } from "@/stores/tasks";
import { Terminal, Bot, User, Loader } from "lucide-react";
// TaskMessage type is already defined in the store/component
import { TextShimmer } from "@/components/ui/text-shimmer";
import { Markdown } from "@/components/markdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
}

interface IncomingMessage {
  type: string;
  data?: unknown;
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

export default function TaskClientPage({ id }: Props) {
  const { getTaskById, updateTask } = useTaskStore();
  const task = getTaskById(id);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatScrollAreaRef = useRef<HTMLDivElement>(null);
  const hasMarkedViewedRef = useRef<string | null>(null);

  // Function to get the output message for a given shell call message
  const getOutputForCall = (callId: string) => {
    return task?.messages.find(
      (message) =>
        message.type === "local_shell_call_output" &&
        message.data?.call_id === callId
    );
  };

  const { latestData } = useInngestSubscription({
    refreshToken: fetchRealtimeSubscriptionToken,
    bufferInterval: 0,
  });

  useEffect(() => {
    if (latestData?.channel === "tasks" && latestData.topic === "update") {
      const { taskId, message } = latestData.data;

      if (taskId === id && message && isValidIncomingMessage(message)) {
        console.log("Received message:", message);
        
        // Handle different message types from backend
        if (message.type === "result") {
          // Claude response - add as assistant message
          updateTask(id, {
            messages: [...(task?.messages || []), {
              role: "assistant",
              type: "message", 
              data: {
                text: message.data,
                ...message
              }
            }],
          });
        } else if (message.type === "done") {
          // Task completed - update status
          updateTask(id, {
            status: "DONE",
          });
        } else {
          // Log, error, or other message types - add to messages for debugging
          updateTask(id, {
            messages: [...(task?.messages || []), {
              role: "assistant",
              type: message.type,
              data: message
            }],
          });
        }
      }
    }
  }, [latestData, id, task?.messages, updateTask]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatScrollAreaRef.current) {
      const viewport = chatScrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [task?.messages]);

  useEffect(() => {
    if (task && hasMarkedViewedRef.current !== task.id) {
      hasMarkedViewedRef.current = task.id;
      updateTask(task.id, {
        hasChanges: false,
      });
    }
  }, [task, updateTask]);

  return (
    <div className="flex flex-col h-screen">
      <TaskNavbar id={id} />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar for chat messages */}
        <div className="w-full max-w-3xl mx-auto border-r border-border bg-gradient-to-b from-background to-muted/5 flex flex-col h-full">
          <ScrollArea
            ref={chatScrollAreaRef}
            className="flex-1 overflow-y-auto scroll-area-custom"
          >
            <div className="p-6 flex flex-col gap-y-6">
              {/* Initial task message */}
              <div className="flex justify-end animate-in slide-in-from-right duration-300">
                <div className="max-w-[85%] flex gap-3">
                  <div className="bg-primary text-primary-foreground rounded-2xl px-5 py-3 shadow-sm">
                    <p className="text-sm leading-relaxed">{task?.title}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Render regular messages */}
              {task?.messages
                .filter(
                  (message) =>
                    (message.role === "assistant" || message.role === "user") &&
                    message.type === "message"
                )
                .map((message, index) => {
                  const isAssistant = message.role === "assistant";
                  return (
                    <div
                      key={
                        (message.data as { id?: string })?.id ||
                        `message-${index}-${message.role}` ||
                        index
                      }
                      className={cn(
                        "flex gap-3 animate-in duration-300",
                        isAssistant
                          ? "justify-start slide-in-from-left"
                          : "justify-end slide-in-from-right"
                      )}
                    >
                      {isAssistant && (
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border">
                            <Bot className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-5 py-3 shadow-sm",
                          isAssistant
                            ? "bg-card border border-border"
                            : "bg-primary text-primary-foreground"
                        )}
                      >
                        {isAssistant ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden">
                            <Markdown>
                              {message.data?.text as string}
                            </Markdown>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed break-words">
                            {message.data?.text as string}
                          </p>
                        )}
                      </div>
                      {!isAssistant && (
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}


              {task?.status === "IN_PROGRESS" && (
                  <div className="flex justify-start animate-in slide-in-from-left duration-300">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border animate-pulse">
                          <Bot className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="bg-card border border-border rounded-2xl px-5 py-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Loader className="w-4 h-4 text-muted-foreground animate-spin" />
                          <TextShimmer className="text-sm">
                            {task?.statusMessage
                              ? `${task.statusMessage}`
                              : "Working on task..."}
                          </TextShimmer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </ScrollArea>

          {/* Message input component - fixed at bottom */}
          <div className="flex-shrink-0">
            <MessageInput task={task!} />
          </div>
        </div>

        {/* Right panel for details */}
        <div className="flex-1 bg-gradient-to-br from-muted/50 to-background relative">
          {/* Fade overlay at the top */}
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-muted/50 to-transparent pointer-events-none z-10" />
          <ScrollArea ref={scrollAreaRef} className="h-full scroll-area-custom">
            <div className="max-w-4xl mx-auto w-full py-10 px-6">
              {/* Details content will go here */}
              <div className="flex flex-col gap-y-10">
                {task?.messages.map((message) => {
                  if (message.type === "local_shell_call") {
                    const output = getOutputForCall(
                      message.data?.call_id as string
                    );
                    return (
                      <div
                        key={message.data?.call_id as string}
                        className="flex flex-col"
                      >
                        <div className="flex items-start gap-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="font-medium font-mono text-sm -mt-1 truncate max-w-md cursor-help">
                                  {(
                                    message.data as {
                                      action?: { command?: string[] };
                                    }
                                  )?.action?.command
                                    ?.slice(1)
                                    .join(" ")}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-sm break-words">
                                  {(
                                    message.data as {
                                      action?: { command?: string[] };
                                    }
                                  )?.action?.command
                                    ?.slice(1)
                                    .join(" ")}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {output && (
                          <div className="mt-3 animate-in slide-in-from-bottom duration-300">
                            <div className="rounded-xl bg-card border-2 border-border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
                              <div className="flex items-center gap-2 bg-muted/50 border-b px-4 py-3">
                                <Terminal className="size-4 text-muted-foreground" />
                                <span className="font-medium text-sm text-muted-foreground">
                                  Output
                                </span>
                              </div>
                              <ScrollArea className="max-h-[400px]">
                                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed p-4 text-muted-foreground">
                                  {(() => {
                                    try {
                                      const parsed = JSON.parse(
                                        (output.data as { output?: string })
                                          ?.output || "{}"
                                      );
                                      return parsed.output || "No output";
                                    } catch {
                                      return "Failed to parse output";
                                    }
                                  })()}
                                </pre>
                              </ScrollArea>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
