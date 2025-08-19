"use client";
import { useEffect, useRef, useState } from "react";

import TaskNavbar from "./_components/navbar";
import MessageInput from "./_components/message-input";
import { FileContentRenderer } from "./_components/file-content-renderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTaskStore, type Task } from "@/stores/tasks";
import { 
  Terminal, 
  Bot, 
  User, 
  Loader, 
  FileIcon,
  FileText,
  Mail,
  FileJson,
  Code,
  FileSpreadsheet,
  Presentation
} from "lucide-react";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { Markdown } from "@/components/markdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useInngestRealtime } from "@/providers/inngest-realtime-provider";

interface Props {
  id: string;
}

export default function TaskClientPage({ id }: Props) {
  const { getTaskById, updateTask } = useTaskStore();
  const task = getTaskById(id);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatScrollAreaRef = useRef<HTMLDivElement>(null);
  const hasMarkedViewedRef = useRef<string | null>(null);
  const [activeFileTab, setActiveFileTab] = useState<string>("");

  // Get global subscription status for debugging
  const { isConnected, error } = useInngestRealtime();

  // Function to get the output message for a given shell call message
  const getOutputForCall = (callId: string) => {
    return task?.messages.find(
      (message) =>
        message.type === "local_shell_call_output" &&
        message.data?.call_id === callId
    );
  };

  // Log subscription status for debugging
  useEffect(() => {
    console.log("📱 TaskClientPage subscription status:", { 
      taskId: id,
      isConnected, 
      error,
      messageCount: task?.messages.length || 0
    });
  }, [id, isConnected, error, task?.messages.length]);

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

  // Filter to only show deliverable files
  const getDeliverableFiles = (files: Task['files']) => {
    if (!files) return {};
    
    // Only show files from these deliverable directories
    const deliverablePaths = [
      '/deliverables/',
      '/updates/',
      '/memos/',
      '/emails/',
      '/presentations/',
      '/reports/'
    ];
    
    return Object.fromEntries(
      Object.entries(files).filter(([path]) => 
        deliverablePaths.some(dp => path.includes(dp))
      )
    );
  };

  const deliverableFiles = getDeliverableFiles(task?.files);

  // Get appropriate icon based on file type
  const getFileIcon = (fileType: string, fileName: string, directory: string) => {
    // Check directory for context
    if (directory.includes('/emails/')) return Mail;
    if (directory.includes('/presentations/')) return Presentation;
    
    // Check for weekly reports or updates (use FileText for these)
    if (fileName.toLowerCase().includes('weekly') || 
        fileName.toLowerCase().includes('update') ||
        directory.includes('/updates/')) return FileText;
    
    // Check file type/extension
    if (fileType === 'markdown' || fileName.endsWith('.md')) return FileText;
    if (fileType === 'json' || fileName.endsWith('.json')) return FileJson;
    if (fileType === 'html' || fileName.endsWith('.html')) return Code;
    if (fileType === 'csv' || fileName.endsWith('.csv')) return FileSpreadsheet;
    if (fileName.endsWith('.txt')) return FileText;
    
    // Default icon
    return FileIcon;
  };

  // Set default active tab when files are received
  useEffect(() => {
    const currentDeliverableFiles = getDeliverableFiles(task?.files);
    console.log("📂 Task files updated:", task?.files);
    console.log("📂 Deliverable files:", currentDeliverableFiles);
    console.log("📂 Deliverable count:", Object.keys(currentDeliverableFiles).length);
    
    if (Object.keys(currentDeliverableFiles).length > 0 && !activeFileTab) {
      const firstFilePath = Object.keys(currentDeliverableFiles)[0];
      console.log("📂 Setting active file tab to:", firstFilePath);
      setActiveFileTab(firstFilePath);
    }
  }, [task?.files, activeFileTab]);

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
          
          {(() => {
            const hasDeliverableFiles = Object.keys(deliverableFiles).length > 0;
            console.log("🎨 Right panel - deliverable files:", deliverableFiles);
            console.log("🎨 Right panel - hasDeliverableFiles:", hasDeliverableFiles);
            console.log("🎨 Right panel - activeFileTab:", activeFileTab);
            return hasDeliverableFiles;
          })() ? (
            // File view when files exist
            <div className="flex flex-col h-full">
              <div className="px-6 pt-6 pb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <FileIcon className="h-5 w-5" />
                  Deliverables Created
                </h3>
              </div>
              
              <div className="flex-1 px-6 pb-6 min-h-0">
                <Tabs value={activeFileTab} onValueChange={setActiveFileTab} className="h-full grid grid-rows-[auto_1fr]">
                  <TabsList className="w-full mb-4">
                    {Object.keys(deliverableFiles).map(filePath => {
                      const file = deliverableFiles[filePath];
                      const Icon = getFileIcon(file.metadata.fileType, file.metadata.fileName, file.metadata.directory);
                      const displayText = file.metadata.displayTitle || file.metadata.fileName;
                      
                      return (
                        <TabsTrigger key={filePath} value={filePath} className="flex items-center gap-2">
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{displayText}</span>
                          {file.status === 'new' && (
                            <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  
                  <div className="min-h-0 overflow-hidden">
                    {Object.keys(deliverableFiles).map(filePath => (
                      <TabsContent key={filePath} value={filePath} className="h-full overflow-hidden">
                        <FileContentRenderer 
                          file={deliverableFiles[filePath]}
                          filePath={filePath}
                        />
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              </div>
            </div>
          ) : (
            // Existing shell command view when no files
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
          )}
        </div>
      </div>
    </div>
  );
}