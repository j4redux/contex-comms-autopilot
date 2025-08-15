"use server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export async function generateSessionTitle(prompt: string) {
  const response = await generateObject({
    model: anthropic("claude-3-5-sonnet-20240620"),
    schema: z.object({
      title: z.string(),
    }),
    prompt:
      `Generate a title for a session based on the following prompt: ${prompt}\n` +
      "Maximum of three words.",
  });

  return response.object.title;
}
