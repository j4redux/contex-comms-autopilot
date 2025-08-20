// Simplified server using clean Daytona implementation
// This removes the complex knowledge processing for now and focuses on basic command execution

import { Effect } from "effect"
import { loadConfig } from "./services/config"
import { createSandbox, getSandboxStatus } from "./services/sandbox"
import { executeCommand, executeCommandAsync, getCommandStatus, ensureSandboxRunning } from "./services/daytona"
import { inngest, taskResultsCache } from "./services/inngest"
import { inngestHandler } from "./api/inngest"
import crypto from "node:crypto"

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null

function json(body: Json, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 
      "content-type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    ...init,
  })
}

function apiError(code: string, message: string, details?: unknown, status = 400) {
  return new Response(JSON.stringify({ error: { code, message, details } }, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  })
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
  taskId: string
  model?: string
  env?: Record<string, string>
}
function validateProcessBody(raw: unknown): ProcessKnowledgeBody | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const r = raw as Record<string, unknown>
  if (typeof r.input !== "string" || r.input.trim() === "") return undefined
  if (typeof r.sandboxId !== "string" || r.sandboxId.trim() === "") return undefined
  if (typeof r.userId !== "string" || r.userId.trim() === "") return undefined
  if (typeof r.taskId !== "string" || r.taskId.trim() === "") return undefined
  return {
    input: r.input,
    sandboxId: r.sandboxId,
    userId: r.userId,
    taskId: r.taskId,
    model: typeof r.model === "string" ? r.model : undefined,
    env: typeof r.env === "object" && !Array.isArray(r.env) ? r.env as Record<string, string> : undefined,
  }
}

const config = loadConfig()



const server = Bun.serve({
  port: config.port,
  fetch(req: Request) {
    const url = new URL(req.url)
    
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      })
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

    // Get task results from cache
    if (url.pathname === "/api/task/results") {
      if (req.method !== "GET") return methodNotAllowed()
      const taskId = url.searchParams.get("taskId")
      if (!taskId) return apiError("VALIDATION_ERROR", "Missing taskId", undefined, 400)
      
      const result = taskResultsCache.get(taskId)
      if (!result) {
        return json({ 
          found: false,
          taskId 
        }, { status: 200 })
      }
      
      return json({ 
        found: true,
        taskId,
        success: result.success,
        result: result.result,
        messages: result.messages,
        files: result.files,
        error: result.error,
        timestamp: result.timestamp
      }, { status: 200 })
    }

    // Simple knowledge processing
    if (url.pathname === "/api/knowledge/process") {
      if (req.method !== "POST") return methodNotAllowed()
      const eff = Effect.gen(function* () {
        const raw = (yield* Effect.promise(() => readJson(req))) as unknown
        const body = validateProcessBody(raw)
        if (!body) return apiError("VALIDATION_ERROR", "Invalid request body", { expected: "{ input, sandboxId, userId, taskId }" }, 400)
        
        // Check sandbox status and handle auto-restart
        const sb = yield* Effect.promise(() => getSandboxStatus(body.sandboxId))
        if (!sb) return apiError("SANDBOX_NOT_FOUND", "Sandbox not found", { sandboxId: body.sandboxId }, 404)

        // Handle different sandbox states
        if (sb.status === "stopped") {
          try {
            console.log(`🔄 Auto-restarting stopped sandbox for processing: ${body.sandboxId}`)
            yield* Effect.promise(() => ensureSandboxRunning(body.sandboxId))
            console.log(`✅ Sandbox restarted successfully: ${body.sandboxId}`)
            // Continue with processing using restarted sandbox
          } catch (restartError) {
            console.error(`❌ Failed to restart sandbox ${body.sandboxId}:`, restartError)
            return apiError("SANDBOX_RESTART_FAILED", "Failed to restart stopped sandbox", { 
              sandboxId: body.sandboxId,
              error: String(restartError) 
            }, 500)
          }
        } else if (sb.status === "creating") {
          return apiError("SANDBOX_NOT_READY", "Sandbox still being created", { 
            status: sb.status,
            sandboxId: body.sandboxId 
          }, 409)
        } else if (sb.status === "error") {
          return apiError("SANDBOX_ERROR", "Sandbox in error state", { 
            status: sb.status,
            sandboxId: body.sandboxId 
          }, 500)
        } else if (sb.status !== "ready") {
          return apiError("SANDBOX_NOT_READY", "Sandbox not ready", { 
            status: sb.status,
            sandboxId: body.sandboxId 
          }, 409)
        }
        
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        
        // Trigger Inngest function to handle the processing and real-time events
        console.log("🔥 About to trigger Inngest function with data:", {
          name: "omni/process.knowledge",
          data: {
            taskId: body.taskId,
            sandboxId: body.sandboxId,
            userId: body.userId,
            input: body.input,
            model: body.model,
            jobId,
          }
        })
        
        yield* Effect.promise(() => inngest.send({
          name: "omni/process.knowledge",
          data: {
            taskId: body.taskId,
            sandboxId: body.sandboxId,
            userId: body.userId,
            input: body.input,
            model: body.model,
            jobId,
          }
        }).then(result => {
          console.log("✅ Inngest send successful:", result)
          return result
        }).catch(error => {
          console.error("❌ Inngest send failed:", error)
          throw error
        }))
        
        return json({ jobId, accepted: true }, { status: 202 })
      })
      return Effect.runPromise(eff)
    }

    // Knowledge query
    if (url.pathname === "/api/knowledge/query") {
      if (req.method !== "GET") return methodNotAllowed()
      return json({ entities: [], tasks: [], patterns: [] })
    }

    // Inngest API route
    if (url.pathname === "/api/inngest") {
      return inngestHandler(req)
    }

    return notFound()
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