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
    snapshot: "omni-snapshot-2025-08-14T09-03-23-851Z",
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
  
  const daytona = createClient()
  try {
    const workspace = await daytona.get(id)
    return {
      id: workspace.id,
      userId: "unknown", // We don't track userId in status lookup
      status: "ready",
      createdAt: Date.now()
    }
  } catch (error) {
    if (String(error).includes("404")) {
      return undefined
    }
    throw error
  }
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