import { Inngest } from "inngest";
import { realtimeMiddleware, channel, topic } from "@inngest/realtime";

// Create a client to SEND events only (no functions)
export const inngest = new Inngest({
  id: "contex-frontend",
  middleware: [realtimeMiddleware()],
});

// Task channel for real-time updates (keep same structure for UI compatibility)
export const taskChannel = channel("tasks")
  .addTopic(
    topic("status").type<{
      taskId: string;
      status: "IN_PROGRESS" | "DONE";
      sessionId: string;
    }>()
  )
  .addTopic(
    topic("update").type<{
      taskId: string;
      message: Record<string, unknown>;
    }>()
  );

// REMOVED: No frontend functions - pure event sending only
// All processing functions are in the backend (/server/src/services/inngest.ts)

// Client app for real-time subscriptions only
let app: Inngest | undefined;

export const getInngestApp = () => {
  return (app ??= new Inngest({
    id: typeof window !== "undefined" ? "client" : "server",
    middleware: [realtimeMiddleware()],
  }));
};