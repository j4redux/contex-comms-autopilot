// Simplified server using clean Daytona implementation
// This removes the complex knowledge processing for now and focuses on basic command execution

import { Effect } from "effect"
import { loadConfig } from "./services/config"
import { createSandbox, getSandboxStatus } from "./services/sandbox"
import { executeCommand, executeCommandAsync, getCommandStatus } from "./services/daytona"
import { broadcastDone, broadcastError, broadcastLog, broadcastResult, register, startHeartbeat, unregister } from "./services/ws"
import crypto from "node:crypto"
import type { ServerWebSocket } from "bun"

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null

function json(body: Json, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init,
  })
}

function apiError(code: string, message: string, details?: unknown, status = 400) {
  return json({ error: { code, message, details } }, { status })
}

function notFound() {
  return apiError("NOT_FOUND", "Not Found", undefined, 404)
}

function methodNotAllowed() {
  return apiError("METHOD_NOT_ALLOWED", "Method Not Allowed", undefined, 405)
}

async function readJson<T = unknown>(req: Request): Promise<T | undefined> {
  const ct = req.headers.get("content-type") || ""
  if (!ct.includes("application/json")) return undefined
  try {
    return (await req.json()) as T
  } catch {
    return undefined
  }
}

// Validation functions
type CreateSandboxBody = { userId: string }
function validateCreateSandboxBody(raw: unknown): CreateSandboxBody | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const r = raw as Record<string, unknown>
  if (typeof r.userId !== "string" || r.userId.trim() === "") return undefined
  return { userId: r.userId }
}

type ProcessKnowledgeBody = {
  input: string
  sandboxId: string
  userId: string
  model?: string
  env?: Record<string, string>
}
function validateProcessBody(raw: unknown): ProcessKnowledgeBody | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const r = raw as Record<string, unknown>
  if (typeof r.input !== "string" || r.input.trim() === "") return undefined
  if (typeof r.sandboxId !== "string" || r.sandboxId.trim() === "") return undefined
  if (typeof r.userId !== "string" || r.userId.trim() === "") return undefined
  return {
    input: r.input,
    sandboxId: r.sandboxId,
    userId: r.userId,
    model: typeof r.model === "string" ? r.model : undefined,
    env: typeof r.env === "object" && !Array.isArray(r.env) ? r.env as Record<string, string> : undefined,
  }
}

const config = loadConfig()

// WS connection data
type WsData = { userId: string }

// Start WS heartbeat
startHeartbeat()

// JWT verification (simplified)
function verifyJwt(token: string, secret: string): any | undefined {
  // Simplified for now - in production use proper JWT library
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return undefined
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"))
    return payload
  } catch {
    return undefined
  }
}

const server = Bun.serve({
  port: config.port,
  fetch(req: Request) {
    const url = new URL(req.url)

    // WebSocket for streaming logs/results
    if (url.pathname === "/ws") {
      const env = process.env.NODE_ENV || "development"
      const dev = env === "development"
      let userId: string | undefined
      if (dev) {
        userId = url.searchParams.get("userId") || undefined
      } else {
        // JWT auth for production
        const auth = req.headers.get("authorization") || ""
        const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : ""
        const payload = token ? verifyJwt(token, config.jwtSecret) : undefined
        if (payload) {
          userId = (payload.userId as string) || (payload.sub as string)
        }
        if (!userId) {
          return apiError("UNAUTHORIZED", "JWT required for WebSocket", undefined, 401)
        }
      }
      if (!userId) return apiError("BAD_REQUEST", "Missing userId", undefined, 400)
      if (server.upgrade(req, { data: { userId } })) {
        return new Response(undefined, { status: 101 })
      }
      return apiError("UPGRADE_FAILED", "WebSocket upgrade failed", undefined, 400)
    }

    // Sandbox creation
    if (url.pathname === "/api/sandbox/create") {
      if (req.method !== "POST") return methodNotAllowed()
      const eff = Effect.gen(function* () {
        const raw = (yield* Effect.promise(() => readJson(req))) as unknown
        const body = validateCreateSandboxBody(raw)
        if (!body) return apiError("VALIDATION_ERROR", "Invalid request body", { expected: "{ userId: string }" }, 400)
        try {
          const sb = yield* Effect.promise(() => createSandbox(body.userId))
          return json({ sandboxId: sb.id, status: sb.status }, { status: 200 })
        } catch (e: any) {
          const msg = String(e?.message || e)
          return apiError("SERVER_ERROR", msg, undefined, 500)
        }
      })
      return Effect.runPromise(eff)
    }

    // Sandbox status
    if (url.pathname === "/api/sandbox/status") {
      if (req.method !== "GET") return methodNotAllowed()
      const id = url.searchParams.get("id")
      if (!id) return apiError("VALIDATION_ERROR", "Missing id", undefined, 400)
      return Effect.runPromise(
        Effect.gen(function* () {
          const sb = yield* Effect.promise(() => getSandboxStatus(id))
          if (!sb) return notFound()
          return json({ sandboxId: sb.id, status: sb.status, createdAt: sb.createdAt })
        })
      )
    }

    // Simple knowledge processing
    if (url.pathname === "/api/knowledge/process") {
      if (req.method !== "POST") return methodNotAllowed()
      const eff = Effect.gen(function* () {
        const raw = (yield* Effect.promise(() => readJson(req))) as unknown
        const body = validateProcessBody(raw)
        if (!body) return apiError("VALIDATION_ERROR", "Invalid request body", { expected: "{ input, sandboxId, userId }" }, 400)
        
        // Check sandbox status
        const sb = yield* Effect.promise(() => getSandboxStatus(body.sandboxId))
        if (!sb) return apiError("SANDBOX_NOT_FOUND", "Sandbox not found", { sandboxId: body.sandboxId }, 404)
        if (sb.status !== "ready") return apiError("SANDBOX_NOT_READY", "Sandbox not ready", { status: sb.status }, 409)
        
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        
        // Fire-and-forget job execution
        void (async () => {
          try {
            broadcastLog({ userId: body.userId, sandboxId: body.sandboxId, jobId, data: "job started" })
            broadcastLog({ userId: body.userId, sandboxId: body.sandboxId, jobId, data: "artifact base: /workspace" })
            
            // Check if we need to fallback to daytona home
            const workspaceCheck = await executeCommand(body.sandboxId, "ls /workspace > /dev/null 2>&1")
            const artifactBase = workspaceCheck.exitCode === 0 ? "/workspace" : "/home/daytona"
            if (artifactBase === "/home/daytona") {
              broadcastLog({ userId: body.userId, sandboxId: body.sandboxId, jobId, data: "artifact base fallback: /home/daytona" })
            }
            
            // Verify Claude Code is available
            const claudeCheck = await executeCommand(body.sandboxId, "claude --version")
            if (claudeCheck.exitCode === 0) {
              broadcastLog({ userId: body.userId, sandboxId: body.sandboxId, jobId, data: "claude --version OK" })
            } else {
              broadcastError({ 
                userId: body.userId, 
                sandboxId: body.sandboxId, 
                jobId, 
                code: "CLAUDE_NOT_AVAILABLE", 
                message: "Claude Code CLI not available in sandbox" 
              })
              return
            }
            
            // Verify API key
            const apiKeyCheck = await executeCommand(body.sandboxId, "test -n \"$ANTHROPIC_API_KEY\" && echo present || echo missing")
            broadcastLog({ userId: body.userId, sandboxId: body.sandboxId, jobId, data: `ANTHROPIC_API_KEY: ${apiKeyCheck.stdout.trim()}` })
            
            // DNS and network preflight checks
            broadcastLog({ userId: body.userId, sandboxId: body.sandboxId, jobId, data: "dns preflight: api.anthropic.com" })
            await executeCommand(body.sandboxId, "nslookup api.anthropic.com > /dev/null 2>&1")
            
            broadcastLog({ userId: body.userId, sandboxId: body.sandboxId, jobId, data: "https preflight: api.anthropic.com" })
            await executeCommand(body.sandboxId, "curl -s --head https://api.anthropic.com > /dev/null 2>&1")
            
            // Use the working Claude CLI pattern from our tests
            const model = body.model || "sonnet"
            const escapedInput = body.input.replace(/"/g, '\\"')
            const command = `echo "${escapedInput}" | claude -p --output-format json --model ${model}`
            
            broadcastLog({ userId: body.userId, sandboxId: body.sandboxId, jobId, data: `executing claude command` })
            const result = await executeCommand(body.sandboxId, command)
            
            if (result.exitCode === 0) {
              // Parse Claude's JSON response
              try {
                const claudeResponse = JSON.parse(result.stdout)
                broadcastLog({ userId: body.userId, sandboxId: body.sandboxId, jobId, data: `claude response: ${claudeResponse.result?.substring(0, 100)}...` })
                
                // Send the result from Claude's response
                broadcastResult({ 
                  userId: body.userId, 
                  sandboxId: body.sandboxId, 
                  jobId, 
                  format: "text", 
                  data: claudeResponse.result || result.stdout
                })
                broadcastDone({ userId: body.userId, sandboxId: body.sandboxId, jobId, exitCode: 0 })
              } catch (parseError) {
                // Fallback to raw output if JSON parsing fails
                broadcastLog({ userId: body.userId, sandboxId: body.sandboxId, jobId, data: "json parse failed, using raw output" })
                broadcastResult({ 
                  userId: body.userId, 
                  sandboxId: body.sandboxId, 
                  jobId, 
                  format: "text", 
                  data: result.stdout 
                })
                broadcastDone({ userId: body.userId, sandboxId: body.sandboxId, jobId, exitCode: 0 })
              }
            } else {
              broadcastError({ 
                userId: body.userId, 
                sandboxId: body.sandboxId, 
                jobId, 
                code: "CLAUDE_COMMAND_FAILED", 
                message: `Claude command failed with exit code ${result.exitCode}: ${result.stderr}` 
              })
              broadcastDone({ userId: body.userId, sandboxId: body.sandboxId, jobId, exitCode: result.exitCode })
            }
          } catch (error: any) {
            const msg = String(error?.message || error)
            broadcastError({ userId: body.userId, sandboxId: body.sandboxId, jobId, code: "EXECUTION_ERROR", message: msg })
            broadcastDone({ userId: body.userId, sandboxId: body.sandboxId, jobId, exitCode: 1 })
          }
        })()
        
        return json({ jobId, accepted: true }, { status: 202 })
      })
      return Effect.runPromise(eff)
    }

    // Knowledge query
    if (url.pathname === "/api/knowledge/query") {
      if (req.method !== "GET") return methodNotAllowed()
      return json({ entities: [], tasks: [], patterns: [] })
    }

    return notFound()
  },
  websocket: {
    open(ws: ServerWebSocket<WsData>) {
      const data = ws.data!
      const userId = data.userId
      register(userId, ws as ServerWebSocket<WsData>)
      try {
        ws.send(JSON.stringify({ type: "heartbeat", ts: Date.now() }))
      } catch {}
    },
    message(ws: ServerWebSocket<WsData>, message: string | Buffer) {
      try {
        const parsed = typeof message === "string" ? JSON.parse(message) : JSON.parse(Buffer.from(message as any).toString("utf8"))
        if (parsed?.type === "ping") {
          ws.send(JSON.stringify({ type: "heartbeat", ts: Date.now() }))
        }
      } catch {
        // ignore
      }
    },
    close(ws: ServerWebSocket<WsData>) {
      const data = ws.data!
      unregister(data.userId, ws as ServerWebSocket<WsData>)
    },
  },
})

console.log(`Clean server listening on http://localhost:${server.port}`)

// Graceful shutdown
function setupShutdown() {
  const shutdown = (sig: string) => {
    try {
      console.log(`Received ${sig}, stopping server...`)
      server.stop()
    } catch {}
    setTimeout(() => process.exit(0), 10)
  }
  try {
    ;["SIGINT", "SIGTERM"].forEach((sig) => {
      // @ts-ignore - Node-style signals available in Bun
      process.on(sig, () => shutdown(sig))
    })
  } catch {}
}

setupShutdown()