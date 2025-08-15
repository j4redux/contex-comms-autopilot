import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    createdBy: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    name: v.string(),
    tunnelUrl: v.optional(v.string()),
    repository: v.optional(v.string()),
    templateId: v.string(),
    pullRequest: v.optional(v.any()),
    status: v.union(
      v.literal("IN_PROGRESS"),
      v.literal("CLONING_REPO"),
      v.literal("INSTALLING_DEPENDENCIES"),
      v.literal("STARTING_DEV_SERVER"),
      v.literal("CREATING_TUNNEL"),
      v.literal("CUSTOM"),
      v.literal("RUNNING")
    ),
    statusMessage: v.optional(v.string()),
  }).index("by_createdBy", ["createdBy"]),

  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    edits: v.optional(
      v.object({
        filePath: v.string(),
        oldString: v.string(),
        newString: v.string(),
      })
    ),
    todos: v.optional(
      v.array(
        v.object({
          id: v.string(),
          content: v.string(),
          status: v.string(),
          priority: v.string(),
        })
      )
    ),
    read: v.optional(
      v.object({
        filePath: v.string(),
      })
    ),
    checkpoint: v.optional(
      v.object({
        branch: v.string(),
        patch: v.optional(v.string()),
      })
    ),
    content: v.string(),
  }).index("by_session", ["sessionId"]),
});
