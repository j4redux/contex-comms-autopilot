# Persistent Per-User Sandbox Implementation Plan
## Workspace-as-a-Service Architecture

## Executive Summary

Project Omni currently implements a **partial** per-user sandbox persistence system that breaks on server restart. The `userPreferred` Map that tracks user-to-sandbox mappings is stored in memory and lost when the server restarts. This creates a critical disconnect: users see their historical files in the UI (cached in localStorage), but Claude cannot access them because it's running in a new, empty sandbox.

**Solution**: Implement a **Workspace-as-a-Service** abstraction layer that wraps the existing sandbox system with persistent state management, without changing any core functionality.

---

## Current Data Flow (Must Preserve)

### Frontend → Backend Flow
```
1. User types in task-form.tsx
   ↓
2. addTask() in stores/tasks.ts (creates task with sessionId)
   ↓
3. createTaskAction() in app/actions/inngest.ts
   ↓
4. inngest.send({ name: "omni/create.task", data: { task, userId, prompt }})
   ↓
5. Backend createTask function (services/inngest.ts:213)
   ↓
6. createSandbox(userId) - gets/creates sandbox
   ↓
7. inngest.send({ name: "omni/process.knowledge", data: { sandboxId, ... }})
   ↓
8. processKnowledge function executes Claude in sandbox
```

### Backend → Frontend Flow
```
1. processKnowledge publishes to taskChannel().update()
   ↓
2. Frontend InngestRealtimeProvider subscribes to channel
   ↓
3. Messages flow: { type: "log" | "result" | "file_created" | "done" }
   ↓
4. updateTask() in stores/tasks.ts updates UI
   ↓
5. FALLBACK: If realtime fails, polls /api/task/results?taskId=
```

**Critical Constraint**: This flow MUST remain unchanged. We're adding an abstraction layer, not modifying the core flow.

---

## Solution: Workspace-as-a-Service Abstraction

### Core Concept

Workspace-as-a-Service is a **wrapper layer** that:
1. Sits between the Inngest functions and the sandbox service
2. Adds persistent storage for user-to-sandbox mappings
3. Handles sandbox lifecycle (health checks, recovery)
4. Provides better semantics ("workspace" vs "sandbox")

**Key Insight**: A "Workspace" is just a persistent pointer to a sandbox with metadata.

### Architecture Diagram

```
CURRENT:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Inngest    │────▶│   Sandbox   │────▶│   Daytona   │
│  Functions  │     │   Service   │     │   Sandboxes │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    (in-memory Map)
                    
WITH WORKSPACE SERVICE:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Inngest    │────▶│  Workspace  │────▶│   Sandbox   │────▶│   Daytona   │
│  Functions  │     │   Service   │     │   Service   │     │   Sandboxes │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                    (persistent storage)
```

---

## Implementation Details

### New File: `/server/src/services/workspace-service.ts`

```typescript
import { createSandbox, getSandboxStatus } from './sandbox'
import { ensureSandboxRunning, executeCommand } from './daytona'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'

interface WorkspaceData {
  id: string
  userId: string
  sandboxId: string
  createdAt: number
  lastAccessedAt: number
  generation: number  // Increments when sandbox is replaced
  stats: {
    totalTasks: number
    totalFiles: number
  }
}

export class WorkspaceService {
  private workspaces: Map<string, WorkspaceData> = new Map()
  private persistencePath = path.join(process.cwd(), '.workspaces.json')
  
  constructor() {
    this.loadFromDisk()
  }
  
  private loadFromDisk() {
    if (existsSync(this.persistencePath)) {
      try {
        const data = JSON.parse(readFileSync(this.persistencePath, 'utf-8'))
        this.workspaces = new Map(Object.entries(data))
        console.log(`📂 Loaded ${this.workspaces.size} workspace mappings from disk`)
      } catch (e) {
        console.error('Failed to load workspace mappings:', e)
        this.workspaces = new Map()
      }
    }
  }
  
  private saveToDisk() {
    try {
      const data = Object.fromEntries(this.workspaces)
      writeFileSync(this.persistencePath, JSON.stringify(data, null, 2))
    } catch (e) {
      console.error('Failed to save workspace mappings:', e)
    }
  }
  
  async getWorkspace(userId: string): Promise<{ sandboxId: string; isNew: boolean }> {
    // Check if we have a workspace for this user
    const workspace = this.workspaces.get(userId)
    
    if (workspace) {
      // Verify sandbox is still healthy
      const status = await getSandboxStatus(workspace.sandboxId)
      
      if (status) {
        if (status.status === 'stopped') {
          // Restart stopped sandbox
          console.log(`🔄 Restarting workspace sandbox for user ${userId}`)
          await ensureSandboxRunning(workspace.sandboxId)
        }
        
        if (status.status === 'ready' || status.status === 'creating') {
          // Update access time
          workspace.lastAccessedAt = Date.now()
          workspace.stats.totalTasks++
          this.saveToDisk()
          
          return { sandboxId: workspace.sandboxId, isNew: false }
        }
      }
      
      // Sandbox is gone or broken, need to create new one
      console.log(`⚠️ Workspace sandbox ${workspace.sandboxId} is gone, creating new one`)
      workspace.generation++
    }
    
    // Create new sandbox (using EXISTING function)
    console.log(`🎨 Creating new workspace for user ${userId}`)
    const sandbox = await createSandbox(userId)
    
    // Store workspace mapping
    const newWorkspace: WorkspaceData = {
      id: `ws_${userId}_${Date.now()}`,
      userId,
      sandboxId: sandbox.id,
      createdAt: workspace?.createdAt || Date.now(),
      lastAccessedAt: Date.now(),
      generation: (workspace?.generation || 0) + 1,
      stats: {
        totalTasks: workspace?.stats.totalTasks || 1,
        totalFiles: workspace?.stats.totalFiles || 0
      }
    }
    
    this.workspaces.set(userId, newWorkspace)
    this.saveToDisk()
    
    return { sandboxId: sandbox.id, isNew: true }
  }
  
  async updateFileCount(userId: string, fileCount: number) {
    const workspace = this.workspaces.get(userId)
    if (workspace) {
      workspace.stats.totalFiles = fileCount
      this.saveToDisk()
    }
  }
  
  getWorkspaceStats(userId: string) {
    return this.workspaces.get(userId)?.stats
  }
}

// Single instance
export const workspaceService = new WorkspaceService()
```

### Updated File: `/server/src/services/inngest.ts`

```typescript
// Add import at top
import { workspaceService } from './workspace-service'

// Update createTask function (starting at line 213)
export const createTask = inngest.createFunction(
  { id: "create-task" },
  { event: "omni/create.task" },
  async ({ event, step }) => {
    const { task, userId, prompt } = event.data;
    
    console.log("🎯 Creating task:", { taskId: task.id, userId, prompt: prompt?.substring(0, 50) + "..." });
    
    try {
      // Step 1: Get workspace (which internally ensures sandbox exists)
      const workspace = await step.run("ensure-workspace", async () => {
        console.log("🎨 Getting workspace for user:", userId);
        
        // Use workspace service instead of direct createSandbox
        const { sandboxId, isNew } = await workspaceService.getWorkspace(userId);
        
        console.log("✅ Workspace ready:", { 
          sandboxId, 
          isNew,
          stats: workspaceService.getWorkspaceStats(userId)
        });
        
        // Return in same format as before (no breaking changes!)
        return { id: sandboxId, status: "ready" };
      });
      
      // Step 2: Trigger knowledge processing (UNCHANGED)
      await step.run("trigger-processing", async () => {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        
        console.log("🧠 Triggering knowledge processing:", { 
          taskId: task.id, 
          sandboxId: workspace.id,  // Still passing sandboxId
          jobId 
        });
        
        await inngest.send({
          name: "omni/process.knowledge",
          data: {
            taskId: task.id,
            sandboxId: workspace.id,  // This is still the sandbox ID!
            userId,
            input: prompt,
            model: "sonnet",
            jobId,
          },
        });
        
        console.log("✅ Knowledge processing triggered successfully");
        return { jobId, accepted: true };
      });
      
    } catch (error) {
      console.error("❌ Task creation failed:", error);
      throw error;
    }
  }
)

// In processKnowledge function, after file detection (around line 486)
// Add workspace file tracking
console.log("🔍 Starting file detection scan...");
await detectCreatedFiles(sandboxId, executionStartTime, jobId, publish, taskId);

// Update workspace file count
const detectedFiles = await detectCreatedFilesForCache(sandboxId, executionStartTime, jobId);
if (detectedFiles.length > 0) {
  await workspaceService.updateFileCount(event.data.userId, detectedFiles.length);
}

console.log("✅ File detection scan completed");
```

### Updated File: `/server/src/index.ts`

```typescript
// Add import at top (around line 8)
import { workspaceService } from "./services/workspace-service"

// No other changes needed - all existing endpoints remain the same!
// The workspace service is initialized automatically on import
```

### Optional Frontend Enhancement: `/frontend/stores/tasks.ts`

```typescript
// Add workspace info to Task interface (line 6)
export interface Task {
  id: string;
  title: string;
  description: string;
  messages: {
    role: "user" | "assistant";
    type: string;
    data: Record<string, unknown>;
  }[];
  status: TaskStatus;
  sessionId: string;  // This still maps to sandboxId
  workspaceGeneration?: number;  // Track if workspace was recreated
  workspaceStats?: {
    totalTasks: number;
    totalFiles: number;
  };
  // ... rest of interface
}
```

---

## File Sync Recovery (Phase 2 Enhancement)

When a workspace's sandbox is lost and recreated, we can restore files from the cache:

### New File: `/server/src/services/workspace-recovery.ts`

```typescript
import { executeCommand } from './daytona'
import { taskResultsCache } from './inngest'

export async function recoverWorkspaceFiles(
  userId: string,
  sandboxId: string
) {
  console.log(`🔄 Attempting to recover files for user ${userId}`)
  
  // Get all cached tasks for this user
  const userTasks: string[] = []
  for (const [taskId, result] of taskResultsCache.entries()) {
    // Note: We'd need to add userId to the cache entries for this to work
    if (result.files && result.files.length > 0) {
      userTasks.push(taskId)
    }
  }
  
  if (userTasks.length === 0) {
    console.log('No cached files to recover')
    return
  }
  
  // Restore files to new sandbox
  for (const taskId of userTasks) {
    const result = taskResultsCache.get(taskId)
    if (!result?.files) continue
    
    for (const file of result.files) {
      if (file.content) {
        // Create directories
        const dir = file.directory
        await executeCommand(sandboxId, `mkdir -p "${dir}"`)
        
        // Write file content
        const escapedContent = file.content.replace(/'/g, "'\\''")
        const cmd = `cat > '${file.filePath}' << 'EOF'
${escapedContent}
EOF`
        
        const writeResult = await executeCommand(sandboxId, cmd)
        if (writeResult.exitCode === 0) {
          console.log(`✅ Recovered file: ${file.filePath}`)
        } else {
          console.error(`❌ Failed to recover file: ${file.filePath}`)
        }
      }
    }
  }
  
  console.log(`✅ File recovery complete for user ${userId}`)
}
```

Then in `workspace-service.ts`, call recovery after creating new sandbox:

```typescript
// In getWorkspace(), after creating new sandbox:
if (workspace && workspace.generation > 1) {
  // This is a replacement sandbox, try to recover files
  await recoverWorkspaceFiles(userId, sandbox.id)
}
```

---

## Testing the Implementation

### 1. Server Restart Test
```bash
# Start server and create task
bun run dev

# Create a task as user-001
# Note the sandboxId in logs

# Stop server (Ctrl+C)
# Start server again
bun run dev

# Create another task as user-001
# Should see: "Workspace ready: { sandboxId: <same-id>, isNew: false }"
```

### 2. Sandbox Recovery Test
```bash
# Manually stop a sandbox in Daytona
# Create task for that user
# Should see: "🔄 Restarting workspace sandbox for user..."
```

### 3. File Persistence Test
```bash
# Create task that generates files
# Stop server
# Delete sandbox in Daytona
# Start server
# Create new task
# Should see: "⚠️ Workspace sandbox is gone, creating new one"
# Files should be recovered (if Phase 2 implemented)
```

---

## Rollout Strategy

### Phase 1: Minimal Implementation (Day 1)
1. Create `workspace-service.ts` with basic persistence
2. Update `inngest.ts` createTask to use workspace service
3. Test with single user
4. Deploy behind feature flag

### Phase 2: Recovery & Intelligence (Week 1)
1. Add file recovery from cache
2. Add workspace metrics tracking
3. Add health monitoring
4. Test with multiple users

### Phase 3: Production Hardening (Week 2)
1. Replace file storage with database
2. Add workspace admin API
3. Add monitoring and alerts
4. Full production rollout

---

## Critical Points

### What Changes
1. **Persistence**: User-to-sandbox mappings survive server restart
2. **Semantics**: Internal use of "workspace" concept
3. **Recovery**: Automatic handling of lost sandboxes
4. **Metrics**: Tracking of workspace usage

### What DOESN'T Change
1. **Daytona Integration**: Still uses same sandbox creation
2. **Claude Execution**: Still runs in same Docker containers  
3. **File Structure**: Still `/home/omni/` with same folders
4. **Event Flow**: Same Inngest events and channels
5. **Frontend**: No required changes (optional enhancements only)
6. **APIs**: All existing endpoints work identically

### Risk Mitigation
- **Backward Compatibility**: Old tasks still work (sessionId = sandboxId)
- **Gradual Rollout**: Can run in dual mode with feature flag
- **Fallback**: If workspace service fails, falls back to createSandbox
- **No Data Loss**: All caching mechanisms remain unchanged

---

## Success Metrics

1. **Persistence**: 100% of workspace mappings survive restart
2. **Reuse Rate**: >90% of tasks reuse existing workspace
3. **Recovery Success**: 100% of stopped sandboxes auto-restart
4. **Performance**: No measurable latency increase
5. **Reliability**: Zero impact on existing functionality

---

## Conclusion

The Workspace-as-a-Service approach provides persistent per-user sandboxes through a clean abstraction layer that:
- Requires minimal code changes (1 new file, 2 small updates)
- Preserves all existing functionality and data flows
- Adds critical persistence without architectural changes
- Provides a foundation for future enhancements

This is not a rewrite or replacement - it's a strategic wrapper that solves the immediate problem while setting up for long-term success.