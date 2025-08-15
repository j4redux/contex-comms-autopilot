import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Queries
export const list = query({
  args: {
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let sessions;

    if (args.createdBy) {
      sessions = await ctx.db
        .query("sessions")
        .withIndex("by_createdBy", (q) => q.eq("createdBy", args.createdBy))
        .order("desc")
        .collect();
    } else {
      sessions = await ctx.db.query("sessions").order("desc").collect();
    }

    // Get messages for each session
    const sessionsWithMessages = await Promise.all(
      sessions.map(async (session) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .order("asc")
          .collect();

        return {
          ...session,
          id: session._id,
          messages: messages.map((msg) => ({
            ...msg,
            id: msg._id,
          })),
        };
      })
    );

    return sessionsWithMessages;
  },
});

export const getById = query({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    if (!session) return null;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .order("asc")
      .collect();

    return {
      ...session,
      id: session._id,
      messages: messages.map((msg) => ({
        ...msg,
        id: msg._id,
      })),
    };
  },
});

// Mutations
export const create = mutation({
  args: {
    sessionId: v.optional(v.string()),
    branch: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    repository: v.optional(v.string()),
    pullRequest: v.optional(v.any()),
    name: v.string(),
    tunnelUrl: v.optional(v.string()),
    templateId: v.string(),
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
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("sessions", {
      ...args,
    });

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("sessions"),
    sessionId: v.optional(v.string()),
    name: v.optional(v.string()),
    tunnelUrl: v.optional(v.string()),
    repository: v.optional(v.string()),
    pullRequest: v.optional(v.any()),
    templateId: v.optional(v.string()),
    branch: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("IN_PROGRESS"),
        v.literal("CLONING_REPO"),
        v.literal("INSTALLING_DEPENDENCIES"),
        v.literal("STARTING_DEV_SERVER"),
        v.literal("CREATING_TUNNEL"),
        v.literal("CUSTOM"),
        v.literal("RUNNING")
      )
    ),
    statusMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    // Delete all messages for this session first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(args.id);
  },
});
