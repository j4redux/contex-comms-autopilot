// server/src/services/sandbox.ts
// Daytona sandbox manager. Uses Daytona when configured; falls back to in-memory stub.

import { isConfigured, createSandbox as createDaytonaSandbox, getSandboxStatus as getDaytonaSandboxStatus } from "./daytona"

export interface Sandbox {
  id: string
  userId: string
  status: "creating" | "ready" | "stopped" | "error"
  createdAt: number
}

const sandboxes = new Map<string, Sandbox>()
// Track a preferred sandbox per user to avoid creating many
const userPreferred = new Map<string, string>()

function requireDaytonaInNonDev() {
  const env = process.env.NODE_ENV || "development"
  const prodLike = env !== "development"
  if (prodLike && !isConfigured()) {
    const err = new Error(
      "Daytona is not configured. Stub sandbox is disabled outside development. Set DAYTONA_API_URL and DAYTONA_API_KEY or run with NODE_ENV=development."
    )
    // @ts-expect-error attach code for upstream mapping when added
    err.code = "DAYTONA_NOT_CONFIGURED"
    throw err
  }
}

export async function createSandbox(userId: string): Promise<Sandbox> {
  if (isConfigured()) {
    // Try to reuse preferred sandbox for this user if it exists and is not error
    const existingId = userPreferred.get(userId)
    if (existingId) {
      try {
        const st = await getDaytonaSandboxStatus(existingId)
        if (st && st.status !== "error") {
          return { id: st.id, userId, status: st.status, createdAt: st.createdAt }
        }
      } catch {}
    }
    const remote = await createDaytonaSandbox(userId)
    // remember for reuse
    userPreferred.set(userId, remote.id)
    return { id: remote.id, userId, status: remote.status, createdAt: remote.createdAt }
  }
  requireDaytonaInNonDev()
  const id = `sand_${Math.random().toString(36).slice(2)}`
  const sb: Sandbox = { id, userId, status: "creating", createdAt: Date.now() }
  sandboxes.set(id, sb)
  // Simulate async provisioning
  setTimeout(() => {
    const s = sandboxes.get(id)
    if (s) s.status = "ready"
  }, 300)
  return sb
}

export async function getSandboxStatus(id: string): Promise<Sandbox | undefined> {
  if (isConfigured()) {
    const remote = await getDaytonaSandboxStatus(id)
    if (!remote) return undefined
    return { id: remote.id, userId: remote.userId, status: remote.status, createdAt: remote.createdAt }
  }
  requireDaytonaInNonDev()
  return sandboxes.get(id)
}

export async function startSandboxJob(
  id: string,
  cmd: string,
  args?: string[],
  env?: Record<string, string>
): Promise<void> {
  if (isConfigured()) {
    // For now, we'll implement this when needed
    // The main execution happens in the server via the clean Daytona service
    console.log("startSandboxJob called but not implemented in clean version yet")
    return
  }
  requireDaytonaInNonDev()
  // Fallback: do nothing in stub mode
}
