// server/src/services/ws.ts
// WebSocket channel registry, job ring buffers, and broadcast helpers

import type { ServerWebSocket } from "bun"

export type AnyWS = ServerWebSocket<any>

// Channels keyed by userId
const channels = new Map<string, Set<AnyWS>>()

// Small in-memory ring buffer per jobId
const jobBuffers = new Map<string, string[]>()
const MAX_BUFFER_LINES = 200

export function register(userId: string, ws: AnyWS) {
  let set = channels.get(userId)
  if (!set) {
    set = new Set<AnyWS>()
    channels.set(userId, set)
  }
  set.add(ws)
}

export function unregister(userId: string, ws: AnyWS) {
  const set = channels.get(userId)
  if (set) {
    set.delete(ws)
    if (set.size === 0) channels.delete(userId)
  }
}

export function appendJobLog(jobId: string, line: string) {
  const buf = jobBuffers.get(jobId) ?? []
  buf.push(line)
  if (buf.length > MAX_BUFFER_LINES) buf.shift()
  jobBuffers.set(jobId, buf)
}

export function getJobBuffer(jobId: string): string[] {
  return jobBuffers.get(jobId) ?? []
}

export function broadcastToUser(userId: string, msg: unknown) {
  const set = channels.get(userId)
  if (!set) return
  const payload = JSON.stringify(msg)
  for (const ws of set) {
    try {
      ws.send(payload)
    } catch {}
  }
}

export function broadcastLog(params: {
  userId: string
  sandboxId: string
  jobId: string
  level?: "info" | "error"
  data: string
}) {
  const { userId, sandboxId, jobId, level = "info", data } = params
  appendJobLog(jobId, data)
  broadcastToUser(userId, {
    type: "log",
    sandboxId,
    jobId,
    level,
    ts: Date.now(),
    data,
  })
}

export function broadcastError(params: {
  userId: string
  sandboxId: string
  jobId: string
  code: string
  message: string
}) {
  const { userId, sandboxId, jobId, code, message } = params
  broadcastToUser(userId, {
    type: "error",
    sandboxId,
    jobId,
    ts: Date.now(),
    code,
    message,
  })
}

export function broadcastDone(params: { userId: string; sandboxId: string; jobId: string; exitCode: number }) {
  const { userId, sandboxId, jobId, exitCode } = params
  broadcastToUser(userId, {
    type: "done",
    sandboxId,
    jobId,
    ts: Date.now(),
    exitCode,
  })
}

export function broadcastResult(params: {
  userId: string
  sandboxId: string
  jobId: string
  format: "text" | "markdown"
  data: string
}) {
  const { userId, sandboxId, jobId, format, data } = params
  broadcastToUser(userId, {
    type: "result",
    sandboxId,
    jobId,
    ts: Date.now(),
    format,
    data,
  })
}

let heartbeatTimer: any | undefined
export function startHeartbeat(intervalMs = 25000) {
  if (heartbeatTimer) return
  heartbeatTimer = setInterval(() => {
    const ts = Date.now()
    for (const set of channels.values()) {
      for (const ws of set) {
        try {
          ws.send(JSON.stringify({ type: "heartbeat", ts }))
        } catch {}
      }
    }
  }, intervalMs)
}
