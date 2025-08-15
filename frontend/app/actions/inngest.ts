"use server";
import { cookies } from "next/headers";
import { getSubscriptionToken, Realtime } from "@inngest/realtime";

import { inngest } from "@/lib/inngest";
import { Task } from "@/stores/tasks";
import { getInngestApp, taskChannel } from "@/lib/inngest";

export type TaskChannelToken = Realtime.Token<
  typeof taskChannel,
  ["status", "update"]
>;

export const createTaskAction = async ({
  task,
  sessionId,
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

  // Send Omni-compatible event with correct data structure
  await inngest.send({
    name: "omni/create.task", // Changed from "clonedx/create.task"
    data: {
      task,
      userId, // Use environment user ID instead of GitHub token
      prompt: prompt || task.title, // Use prompt or fallback to task title
    },
  });
};

// Pull request functionality not needed for Project Omni
// Omni focuses on investor materials, not code PRs  
export const createPullRequestAction = async ({
  sessionId,
}: {
  sessionId?: string;
}) => {
  throw new Error("Pull request creation not implemented for Project Omni. Focus is on investor materials.");
};

export async function fetchRealtimeSubscriptionToken(): Promise<TaskChannelToken> {
  const token = await getSubscriptionToken(getInngestApp(), {
    channel: taskChannel(),
    topics: ["status", "update"],
  });

  return token;
}
