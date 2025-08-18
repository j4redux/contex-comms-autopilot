// Clean Daytona implementation based on VibeKit's proven pattern
// This is a minimal, working implementation that we'll build upon

import { Daytona, Sandbox } from "@daytonaio/sdk"
import { loadConfig } from "./config"

export interface DaytonaSandbox {
  id: string
  userId: string  
  status: "creating" | "ready" | "stopped" | "error"
  createdAt: number
}

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export function isConfigured(): boolean {
  const cfg = loadConfig()
  return !!cfg.daytonaApiUrl && !!cfg.daytonaApiKey
}

function createClient(): Daytona {
  const cfg = loadConfig()
  return new Daytona({
    apiKey: cfg.daytonaApiKey!,
    apiUrl: cfg.daytonaApiUrl!
  })
}

// Map Daytona workspace states to our internal states
function mapDaytonaState(daytonaState?: string): "creating" | "ready" | "stopped" | "error" {
  if (!daytonaState) return "error"
  
  switch (daytonaState) {
    case "started": 
      return "ready"
    case "stopped":
    case "archived":
      return "stopped"
    case "creating":
    case "starting":
    case "restoring":
    case "pending_build":
    case "building_snapshot":
    case "pulling_snapshot":
      return "creating"
    case "error":
    case "build_failed":
    case "destroyed":
    case "destroying":
    case "unknown":
    default:
      return "error"
  }
}

// Concurrent restart prevention
const restartingSandboxes = new Set<string>()

// Basic restart metrics
const restartMetrics = {
  attempts: 0,
  successes: 0,
  failures: 0,
  timeouts: 0
}

// Status cache to reduce API calls  
const statusCache = new Map<string, { status: DaytonaSandbox, timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds


// Clean sandbox creation using new snapshot created from current Dockerfile
export async function createSandbox(userId: string): Promise<DaytonaSandbox> {
  if (!isConfigured()) {
    throw new Error("Daytona not configured - missing DAYTONA_API_URL or DAYTONA_API_KEY")
  }
  
  const daytona = createClient()
  
  // Set up environment variables following VibeKit pattern
  const envVars: Record<string, string> = { 
    USER_ID: userId
  }
  
  // Add ANTHROPIC_API_KEY if available (required for Claude CLI)
  if (process.env.ANTHROPIC_API_KEY) {
    envVars.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  }
  
  // Use new snapshot with Claude Code 1.0.80 pre-installed
  const workspace = await daytona.create({
    snapshot: "omni-snapshot-2025-08-18T21-57-49-580Z",
    envVars
  })
  
  // Create session following VibeKit pattern exactly
  await workspace.process.createSession(workspace.id)
  
  // Verify Claude Code is accessible (should be pre-installed in snapshot)
  const verify = await executeCommand(workspace.id, "claude --version")
  if (verify.exitCode !== 0) {
    console.warn(`Claude Code not accessible in snapshot: ${verify.stderr}`)
  } else {
    console.log(`Using Claude Code from snapshot: ${verify.stdout.trim()}`)
  }
  
  return {
    id: workspace.id,
    userId,
    status: "ready", // Daytona workspaces are ready immediately after creation
    createdAt: Date.now()
  }
}

export async function getSandboxStatus(id: string): Promise<DaytonaSandbox | undefined> {
  if (!isConfigured()) {
    throw new Error("Daytona not configured")
  }
  
  // Check cache first
  const cached = statusCache.get(id)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.status
  }
  
  const daytona = createClient()
  try {
    const workspace = await daytona.get(id)
    const status = {
      id: workspace.id,
      userId: "unknown", // We don't track userId in status lookup
      status: mapDaytonaState(workspace.state), // ✅ CHECK ACTUAL STATE
      createdAt: workspace.createdAt ? new Date(workspace.createdAt).getTime() : Date.now()
    }
    
    // Cache the result
    statusCache.set(id, { status, timestamp: Date.now() })
    
    return status
  } catch (error) {
    // Handle 404 as undefined (sandbox doesn't exist)
    if (String(error).includes("404") || String(error).includes("not found")) {
      return undefined
    }
    console.error(`Error getting sandbox status for ${id}:`, error)
    throw error
  }
}

// Auto-restart logic to ensure sandbox is running
export async function ensureSandboxRunning(sandboxId: string): Promise<DaytonaSandbox> {
  const status = await getSandboxStatus(sandboxId)
  
  if (!status) {
    throw new Error(`Sandbox not found: ${sandboxId}`)
  }
  
  if (status.status === "error") {
    throw new Error(`Sandbox in error state: ${sandboxId}`)
  }
  
  if (status.status === "creating") {
    // Wait for sandbox to finish creating
    console.log(`⏳ Sandbox still creating: ${sandboxId}`)
    return status
  }
  
  if (status.status === "ready") {
    // Already running
    return status
  }
  
  if (status.status === "stopped") {
    // Check if another restart is already in progress
    if (restartingSandboxes.has(sandboxId)) {
      console.log(`⏳ Waiting for ongoing restart: ${sandboxId}`)
      // Wait for ongoing restart to complete
      while (restartingSandboxes.has(sandboxId)) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      // Get fresh status after restart completes
      return await getSandboxStatus(sandboxId) as DaytonaSandbox
    }
    
    console.log(`🔄 Auto-restarting stopped sandbox: ${sandboxId}`)
    restartingSandboxes.add(sandboxId)
    restartMetrics.attempts++
    
    try {
      const daytona = createClient()
      const workspace = await daytona.get(sandboxId)
      
      // Restart the workspace with timeout
      await daytona.start(workspace, 60) // 60 second timeout
      console.log(`✅ Sandbox restarted successfully: ${sandboxId}`)
      
      // Recreate session after restart (critical!)
      try {
        await workspace.process.createSession(workspace.id)
        console.log(`✅ Session recreated for sandbox: ${sandboxId}`)
      } catch (sessionError) {
        console.error(`❌ Failed to recreate session for ${sandboxId}:`, sessionError)
        // Continue anyway - session might recover on first command
        console.warn(`⚠️ Session recreation failed but sandbox is running: ${sandboxId}`)
      }
      
      // Clear cache to force fresh status check
      statusCache.delete(sandboxId)
      restartMetrics.successes++
      
      return {
        ...status,
        status: "ready"
      }
    } catch (restartError) {
      console.error(`❌ Failed to restart sandbox ${sandboxId}:`, restartError)
      
      // Track failure type
      if (String(restartError).includes("timeout")) {
        restartMetrics.timeouts++
        throw new Error(`Sandbox restart timed out: ${sandboxId}`)
      } else {
        restartMetrics.failures++
        throw new Error(`Sandbox restart failed: ${restartError}`)
      }
    } finally {
      restartingSandboxes.delete(sandboxId)
      
      // Log metrics periodically
      if (restartMetrics.attempts % 10 === 0 && restartMetrics.attempts > 0) {
        console.log(`📊 Restart metrics: ${restartMetrics.successes}/${restartMetrics.attempts} successful, ${restartMetrics.failures} failures, ${restartMetrics.timeouts} timeouts`)
      }
    }
  }
  
  return status
}

// Clean command execution following VibeKit pattern exactly  
export async function executeCommand(
  sandboxId: string, 
  command: string
): Promise<CommandResult> {
  if (!isConfigured()) {
    throw new Error("Daytona not configured")
  }
  
  const daytona = createClient()
  const workspace = await daytona.get(sandboxId)
  
  try {
    // Follow VibeKit pattern exactly: use workspace.id as sessionId
    const response = await workspace.process.executeSessionCommand(
      workspace.id, // sessionId - VibeKit uses workspace.id directly
      {
        command: command,
        runAsync: false
      },
      undefined
    )
    
    return {
      exitCode: response.exitCode || 0,
      stdout: response.output || "",
      stderr: "" // Daytona doesn't separate stderr in response
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      exitCode: 1,
      stdout: "",
      stderr: errorMessage
    }
  }
}

// Simple async command execution for long-running tasks
export async function executeCommandAsync(
  sandboxId: string,
  command: string
): Promise<string> {
  if (!isConfigured()) {
    throw new Error("Daytona not configured")
  }
  
  const daytona = createClient()
  const workspace = await daytona.get(sandboxId)
  
  const response = await workspace.process.executeSessionCommand(
    workspace.id,
    {
      command: command,
      runAsync: true
    },
    undefined
  )
  
  if (!response.cmdId) {
    throw new Error("Failed to start async command")
  }
  
  return response.cmdId
}

// Poll async command status
export async function getCommandStatus(
  sandboxId: string, 
  cmdId: string
): Promise<{ exitCode: number | null }> {
  if (!isConfigured()) {
    throw new Error("Daytona not configured")
  }
  
  const daytona = createClient()
  const workspace = await daytona.get(sandboxId)
  
  const info = await workspace.process.getSessionCommand(workspace.id, cmdId)
  return {
    exitCode: info.exitCode != null ? info.exitCode : null
  }
}

// Clean up sandbox
export async function deleteSandbox(sandboxId: string): Promise<void> {
  if (!isConfigured()) {
    throw new Error("Daytona not configured")
  }
  
  const daytona = createClient()
  const workspace = await daytona.get(sandboxId)
  await daytona.delete(workspace)
}

// Read file from sandbox (simplified)
export async function readArtifactFromSandboxRemote(params: { id: string; artifactPath: string }): Promise<string> {
  const result = await executeCommand(params.id, `cat ${JSON.stringify(params.artifactPath)} 2>/dev/null || echo ""`)
  return result.stdout || ""
}

// Invalidate snapshot cache (placeholder)
export function invalidateSnapshotCache(): void {
  console.log("invalidateSnapshotCache called - not implemented in clean version yet")
}