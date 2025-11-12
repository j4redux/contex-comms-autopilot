"use server";
import { getSubscriptionToken, Realtime } from "@inngest/realtime";

import { inngest, taskChannel } from "@/lib/inngest";
import { Task } from "@/stores/tasks";

export type TaskChannelToken = Realtime.Token<
  typeof taskChannel,
  ["status", "update"]
>;

export const createTaskAction = async ({
  task,
  prompt,
}: {
  task: Task;
  sessionId?: string;
  prompt?: string;
}) => {
  // Get userId from environment for development (no auth required)
  const userId = process.env.NEXT_PUBLIC_DEV_USER_ID;
  
  if (!userId) {
    throw new Error("No user ID configured. Set NEXT_PUBLIC_DEV_USER_ID in environment.");
  }

  // Send Inngest event to trigger backend task creation flow
  await inngest.send({
    name: "contex/create.task",
    data: {
      task,
      userId,
      prompt: prompt || task.title,
    },
  });
};

export async function fetchRealtimeSubscriptionToken(): Promise<TaskChannelToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: taskChannel(),
    topics: ["status", "update"],
  });

  return token;
}
