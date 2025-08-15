import { Inngest } from "inngest";
import { realtimeMiddleware, channel, topic } from "@inngest/realtime";
import { omniApi } from "./omni-api";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "omni-frontend", // Changed from "clonedx"
  middleware: [realtimeMiddleware()],
});

// Task channel for real-time updates (keep same structure for UI compatibility)
export const taskChannel = channel("tasks")
  .addTopic(
    topic("status").type<{
      taskId: string;
      status: "IN_PROGRESS" | "DONE" | "MERGED";
      sessionId: string;
    }>()
  )
  .addTopic(
    topic("update").type<{
      taskId: string;
      message: Record<string, unknown>;
    }>()
  );

// Helper function to simulate streaming by chunking text
function* chunkText(text: string, chunkSize: number = 10): Generator<string, void, unknown> {
  const words = text.split(' ');
  for (let i = 0; i < words.length; i += chunkSize) {
    yield words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
  }
}

// Create task function - adapted for Project Omni
export const createTask = inngest.createFunction(
  { id: "omni-create-task" },
  { event: "omni/create.task" }, // Changed from "clonedx/create.task"
  async ({ event, step, publish }) => {
    const { task, userId, prompt } = event.data;
    
    // Step 1: Ensure sandbox exists
    const sandbox = await step.run("ensure-sandbox", async () => {
      return await omniApi.createSandbox(userId);
    });

    // Update task status to show processing started
    await publish(
      taskChannel().status({
        taskId: task.id,
        status: "IN_PROGRESS",
        sessionId: sandbox.id,
      })
    );

    // Step 2: Process knowledge with Project Omni backend
    const result = await step.run("process-knowledge", async () => {
      const response = await omniApi.processKnowledge({
        input: prompt || task.title,
        sandboxId: sandbox.id,
        userId: userId,
        model: "sonnet", // Default to Claude Sonnet
      });

      // Simulate real-time streaming for demo (in reality this comes from WebSocket)
      // This provides fallback streaming if WebSocket isn't working
      const streamingText = `Processing your input: "${(prompt || task.title).substring(0, 100)}..."`;
      const messageId = crypto.randomUUID();
      
      // Stream the processing message in chunks
      let accumulatedText = "";
      const chunks = Array.from(chunkText(streamingText, 3)); // 3 words per chunk
      
      chunks.forEach((chunk, index) => {
        accumulatedText += chunk;
        
        setTimeout(() => {
          publish(
            taskChannel().update({
              taskId: task.id,
              message: {
                type: "message",
                role: "assistant",
                data: {
                  id: messageId,
                  text: accumulatedText,
                  isStreaming: index < chunks.length - 1,
                  streamId: messageId,
                  chunkIndex: index,
                  totalChunks: chunks.length,
                }
              },
            })
          );
        }, index * 100); // 100ms delay between chunks
      });

      return response;
    });

    // Mark task as completed
    await publish(
      taskChannel().status({
        taskId: task.id,
        status: "DONE",
        sessionId: sandbox.id,
      })
    );

    return { 
      jobId: result.jobId,
      sandboxId: sandbox.id,
      message: "Knowledge processing initiated successfully" 
    };
  }
);

// Placeholder for future pull request function (not needed for MVP)
export const createPullRequest = inngest.createFunction(
  { id: "omni-create-pr" },
  { event: "omni/create.pull-request" },
  async ({ event }) => {
    // Not implemented for MVP - Project Omni focuses on investor materials, not PRs
    throw new Error("Pull request creation not implemented for Project Omni MVP");
  }
);

let app: Inngest | undefined;

export const getInngestApp = () => {
  return (app ??= new Inngest({
    id: typeof window !== "undefined" ? "client" : "server",
    middleware: [realtimeMiddleware()],
  }));
};