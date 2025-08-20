# Inngest Publish Issue Analysis & Solutions

## Discovery Date: August 20, 2025
## Updated: August 20, 2025 - Revised after discovering intermittent behavior

## Executive Summary

The Project Omni real-time streaming feature is **intermittently failing**. Messages and files sometimes appear on the frontend for complex tasks, but often don't. The Inngest `publish()` function behavior is inconsistent - sometimes working, sometimes returning `null`. This document details the discovery, analysis, and potential solutions.

---

## Problem Statement

### Symptoms
1. Simple tasks like "What's 2+2?" consistently work and display results
2. **Some** complex tasks work correctly - showing messages and files
3. **Most** complex tasks complete successfully but show no messages or files on frontend
4. Inngest dashboard shows `publish:tasks` steps with `null` output for failing cases
5. Intermittent real-time streaming - works sometimes, fails often
6. Files created by Claude Code appear in right panel **only sometimes**

### Initial Hypothesis
The publish syntax was incorrect (`taskChannel().update()` vs `"tasks/update"`).

### Revised Understanding
**The `publish` parameter exists but behaves inconsistently.** The streaming architecture works intermittently, suggesting:
- Timing/race condition issues
- Possible Inngest realtime middleware configuration problems  
- Channel initialization or connection issues

### Failed Fix Attempt
Changed `publish(taskChannel().update({...}))` to `publish("tasks/update", {...})` which completely broke all functionality, including simple tasks. This was reverted.

---

## Technical Discovery

### 1. Current Function Implementation

```typescript
// processKnowledge function with current syntax
export const processKnowledge = inngest.createFunction(
  { id: "process-knowledge" },
  { event: "omni/process.knowledge" },
  async ({ event, step, publish }) => {  // ← publish parameter is included
    // Current syntax being used:
    await publish(
      taskChannel().update({
        taskId,
        message: { ... }
      })
    )
  }
)
```

### 2. Inngest Dashboard Evidence
- Shows `publish:tasks` steps (not `publish:undefined`)
- **All publish steps return `null` consistently**
- Function completes successfully despite all publish calls failing
- No evidence of successful publishing in dashboard

### 3. Current Implementation Details

**What the code uses:**
```typescript
// Current implementation in inngest.ts
await publish(
  taskChannel().update({
    taskId,
    message: {
      type: "log",
      data: "job started",
      jobId,
      ts: Date.now(),
    }
  })
)
```

**Channel definition:**
```typescript
export const taskChannel = channel("tasks")
  .addTopic(topic("status").type<{...}>())
  .addTopic(topic("update").type<{...}>())
```

### 4. Behavior Pattern Correction
- **Simple tasks**: Work because they return a final result via function completion
- **Complex tasks**: **Sometimes work** showing messages and files (mystery data source)
- **Complex tasks**: **Usually fail** showing no frontend updates
- **Key Mystery**: If ALL publish calls return `null`, how do ANY complex tasks show files?

### 5. Critical Questions Remaining
1. **What data source** makes some complex tasks work with files visible?
2. **Is there another publish mechanism** we haven't found?
3. **Are cached files** from previous executions being shown?
4. **Is there a timing issue** where publish works before returning `null`?

### 6. Impact on File Detection

File detection runs but publishing consistently fails:
```typescript
// Backend detects files and attempts to publish
await publish(taskChannel().update({ 
  type: "file_created", ... 
}))  // Always returns null

// Frontend never receives these messages through publish
// Yet files somehow appear sometimes - indicating another data path
```

---

## Architecture That Was Built (Works Intermittently)

### Intended Flow:
```
1. User Input → Inngest Event
2. Function Executes → Publishes Updates Real-time
3. Frontend Receives Stream → Updates UI Progressively
4. Files Appear as Created → Tabbed Display
```

### Actual Flow (When Working):
```
1. User Input → Inngest Event
2. Function Executes → Publish Calls Succeed
3. Frontend Receives Stream → Updates UI Progressively
4. Files Appear → Tabbed Display Works
```

### Actual Flow (When Failing - Most Common):
```
1. User Input → Inngest Event
2. Function Executes → Publish Calls Return Null
3. Frontend Receives Nothing → UI Shows Loading
4. Function Completes → No Updates Visible
```

### Affected Components:

1. **Backend (`server/src/services/inngest.ts`)**
   - 20 publish calls with intermittent failures
   - File detection runs but publishing unreliable
   - Logs generated but streaming inconsistent

2. **Frontend (`frontend/providers/inngest-realtime-provider.tsx`)**
   - Message handlers exist and work when messages arrive
   - File display logic implemented and functional when data received
   - Real-time subscription working but messages arrive intermittently

---

## Possible Root Causes for Intermittent Behavior

### 1. Race Condition in Channel Initialization
- The `taskChannel()` might not be fully initialized when publish is called
- Early publish calls might fail while later ones succeed

### 2. Inngest Realtime Middleware Issues
- The `realtimeMiddleware()` might have timing dependencies
- Connection to realtime infrastructure might be unstable

### 3. Async Context Loss
- The `publish` function might lose context when called inside `step.run()`
- Deep nesting of async calls might break the publish mechanism

### 4. Token/Authentication Timing
- Subscription tokens might expire or not be ready
- Frontend might subscribe before backend is ready to publish

### 5. Channel Reference Issues
- The `taskChannel().update()` syntax might create new instances
- Reference equality issues between publish and subscribe

---

## New Solution Options for Intermittent Issues

### Option 0A: Fix the Intermittent Publishing

#### Potential Fixes to Try:

1. **Store channel reference once:**
```typescript
const channel = taskChannel();
// Use same reference throughout
await publish(channel.update({ ... }))
```

2. **Move publish outside step.run:**
```typescript
// Instead of publishing inside step.run
const message = { type: "log", data: "..." };
await step.run("log", () => message);
await publish(taskChannel().update({ taskId, message }));
```

3. **Add retry logic:**
```typescript
const publishWithRetry = async (data) => {
  for (let i = 0; i < 3; i++) {
    const result = await publish(taskChannel().update(data));
    if (result !== null) return result;
    await new Promise(r => setTimeout(r, 100));
  }
  console.error("Publish failed after retries");
};
```

4. **Initialize publish earlier:**
```typescript
// Try to establish publish connection early
await publish(taskChannel().update({ taskId, message: { type: "init" } }));
```

### Option 0B: Debug the Root Cause

1. Add extensive logging around publish calls
2. Check Inngest realtime service status
3. Monitor WebSocket connections
4. Test with different Inngest/realtime package versions
5. Verify environment variables and keys

---

## Solution Option 1: Remove Streaming, Return Everything at Completion (Workaround)

### Overview
Collect all data during function execution and return it in the final result. No real-time updates, but all data arrives at once when the function completes.

### Implementation Steps

#### 1. Backend Changes (`server/src/services/inngest.ts`)

```typescript
export const processKnowledge = inngest.createFunction(
  { id: "process-knowledge" },
  { event: "omni/process.knowledge" },
  async ({ event, step }) => {  // Remove 'publish' parameter
    const { taskId, sandboxId, userId, input, model, jobId } = event.data;
    
    // Collect all messages instead of publishing
    const messages: any[] = [];
    const files: any[] = [];
    
    // Instead of: await publish("tasks/update", {...})
    // Do: messages.push({...})
    
    messages.push({
      type: "log",
      data: "job started",
      jobId,
      ts: Date.now()
    });
    
    const result = await step.run("claude-processing", async () => {
      // Execute Claude...
      messages.push({
        type: "log",
        data: "claude --version OK",
        jobId,
        ts: Date.now()
      });
      
      // After Claude execution, detect files
      const detectedFiles = await detectCreatedFiles(sandboxId, executionStartTime);
      files.push(...detectedFiles);
      
      return { success: true, result: claudeResponse.result };
    });
    
    // Return everything at once
    return {
      success: true,
      result: result.result,
      messages,  // All collected messages
      files,     // All detected files with content
      taskId,
      jobId
    };
  }
);

// Update detectCreatedFiles to return data instead of publishing
async function detectCreatedFiles(sandboxId: string, startTimestamp: number) {
  const files = [];
  // ... existing detection logic ...
  
  // Instead of: await publish(...)
  // Do: files.push({ metadata, content })
  
  return files;
}
```

#### 2. Frontend Changes

**Update InngestRealtimeProvider (`frontend/providers/inngest-realtime-provider.tsx`):**

```typescript
// Listen for function completion instead of individual messages
useEffect(() => {
  if (latestData?.channel === "function" && latestData.topic === "completed") {
    const { taskId, result, messages, files } = latestData.data;
    
    // Process all messages at once
    messages?.forEach(message => {
      if (message.type === "result") {
        updateTask(taskId, {
          messages: [...currentTask.messages, {
            role: "assistant",
            type: "message",
            data: { text: message.data }
          }]
        });
      }
    });
    
    // Process all files at once
    if (files?.length > 0) {
      const fileMap = {};
      files.forEach(file => {
        fileMap[file.filePath] = {
          metadata: file.metadata,
          content: file.content,
          status: 'new',
          updatedAt: Date.now()
        };
      });
      
      updateTask(taskId, { files: fileMap });
    }
    
    // Mark task as complete
    updateTask(taskId, { status: "DONE" });
  }
}, [latestData]);
```

### Pros
- ✅ Minimal code changes required
- ✅ All existing UI components work unchanged
- ✅ Files and messages guaranteed to arrive
- ✅ Simple to implement and test
- ✅ No new dependencies or infrastructure

### Cons
- ❌ No real-time feedback during execution
- ❌ User sees nothing until task completes
- ❌ Long tasks feel unresponsive
- ❌ Can't show progress for multi-step operations
- ❌ Loss of streaming experience

---

## Solution Option 2: Use Step Events for Pseudo-Streaming

### Overview
Replace `publish()` calls with `step.sendEvent()` to send events that the frontend can listen for. Creates an event-driven update flow without true streaming.

### Implementation Steps

#### 1. Create New Event Schemas

```typescript
// Add to event schemas
export const events = {
  "app/task.log": {
    taskId: string,
    message: string,
    jobId: string,
    ts: number
  },
  "app/task.file.created": {
    taskId: string,
    file: FileMetadata,
    jobId: string
  },
  "app/task.file.content": {
    taskId: string,
    filePath: string,
    content: string,
    jobId: string
  },
  "app/task.result": {
    taskId: string,
    result: string,
    jobId: string
  },
  "app/task.completed": {
    taskId: string,
    status: "success" | "error",
    jobId: string
  }
};
```

#### 2. Backend Changes

```typescript
export const processKnowledge = inngest.createFunction(
  { id: "process-knowledge" },
  { event: "omni/process.knowledge" },
  async ({ event, step }) => {
    const { taskId, sandboxId, userId, input, model, jobId } = event.data;
    
    // Send log event instead of publishing
    await step.sendEvent("send-log-started", {
      name: "app/task.log",
      data: {
        taskId,
        message: "job started",
        jobId,
        ts: Date.now()
      }
    });
    
    const result = await step.run("claude-processing", async () => {
      // Execute Claude...
      await step.sendEvent("send-log-claude-ok", {
        name: "app/task.log",
        data: {
          taskId,
          message: "claude --version OK",
          jobId,
          ts: Date.now()
        }
      });
      
      // ... Claude execution ...
      
      return { success: true, result: claudeResponse.result };
    });
    
    // Send result event
    await step.sendEvent("send-result", {
      name: "app/task.result",
      data: {
        taskId,
        result: result.result,
        jobId,
        ts: Date.now()
      }
    });
    
    // Detect and send file events
    await step.run("detect-files", async () => {
      const files = await detectCreatedFiles(sandboxId, executionStartTime);
      
      for (const file of files) {
        await step.sendEvent(`send-file-${file.fileName}`, {
          name: "app/task.file.created",
          data: {
            taskId,
            file: file.metadata,
            jobId
          }
        });
        
        await step.sendEvent(`send-file-content-${file.fileName}`, {
          name: "app/task.file.content",
          data: {
            taskId,
            filePath: file.filePath,
            content: file.content,
            jobId
          }
        });
      }
    });
    
    // Send completion event
    await step.sendEvent("send-completed", {
      name: "app/task.completed",
      data: {
        taskId,
        status: "success",
        jobId
      }
    });
    
    return { success: true };
  }
);
```

#### 3. Create Event Handler Functions

```typescript
// New functions to handle task events
export const handleTaskLog = inngest.createFunction(
  { id: "handle-task-log" },
  { event: "app/task.log" },
  async ({ event }) => {
    // This function would need to communicate with frontend
    // Could store in database or use a different mechanism
    console.log("Task log:", event.data);
  }
);

export const handleTaskFile = inngest.createFunction(
  { id: "handle-task-file" },
  { event: "app/task.file.created" },
  async ({ event }) => {
    // Handle file creation event
    console.log("File created:", event.data);
  }
);

// Register all new functions
export const functions = [
  createTask,
  processKnowledge,
  handleTaskLog,
  handleTaskFile,
  // ... other handlers
];
```

#### 4. Frontend Changes

```typescript
// Frontend would need to listen for these events
// This could be done via:
// 1. Polling an API endpoint that returns recent events
// 2. Using a different real-time service
// 3. Storing events in a database and fetching them

// Example with polling approach:
useEffect(() => {
  const interval = setInterval(async () => {
    const events = await fetch(`/api/task/${taskId}/events`);
    const newEvents = await events.json();
    
    newEvents.forEach(event => {
      if (event.name === "app/task.log") {
        // Add log message
      } else if (event.name === "app/task.file.created") {
        // Add file to UI
      }
      // ... handle other event types
    });
  }, 1000); // Poll every second
  
  return () => clearInterval(interval);
}, [taskId]);
```

### Pros
- ✅ Events are durable and retryable
- ✅ Can add event handlers for different purposes
- ✅ Events can trigger other workflows
- ✅ More scalable architecture
- ✅ Events can be stored for audit trail

### Cons
- ❌ Not true real-time (events process asynchronously)
- ❌ More complex implementation
- ❌ Requires additional infrastructure for event delivery to frontend
- ❌ May have delays between event and UI update
- ❌ Need to handle event ordering and deduplication

---

## Recommendation

### Immediate Priority (Today)
**Investigate the mystery data path** - Since some complex tasks show files despite ALL publish calls returning `null`, there must be another mechanism we haven't discovered:

1. Check if files are being stored/retrieved from another source
2. Look for alternative frontend data fetching
3. Investigate if task completion events carry file data
4. Search for any other publish/streaming mechanisms

### Fallback Fix (If Investigation Fails)
**Implement Option 1** - Return everything at completion
- Only if we can't find the working data path
- Quick to implement (2-3 hours)
- Gets the system working consistently

---

## Investigation Plan

### Phase 1: Find the Mystery Data Path (Immediate)
1. **Check function completion events** - See if files are passed in completion payload
2. **Search for alternative publish mechanisms** - Look for other ways data reaches frontend
3. **Analyze working vs failing patterns** - Find what makes some complex tasks work
4. **Test with debugging** - Add console logs to trace data flow for working cases

### Phase 2: Fix Publishing (If Found)
1. Implement identified solution for consistent publishing
2. Test with complex tasks
3. Verify real-time streaming works reliably

### Phase 3: Fallback Implementation (If Not Found)
1. Implement Option 1 (return everything at completion)
2. Remove unreliable publish calls
3. Update frontend to handle batch data
4. Deploy working solution

---

## Files to Modify

### Option 1 Implementation:
1. `/server/src/services/inngest.ts` - Remove publish, collect data
2. `/frontend/providers/inngest-realtime-provider.tsx` - Handle batch updates
3. `/frontend/stores/tasks.ts` - May need minor updates for batch processing

### Option 2 Implementation:
1. `/server/src/services/inngest.ts` - Replace publish with sendEvent
2. `/server/src/api/inngest.ts` - Register new event handlers
3. `/frontend/lib/api.ts` - Add event polling or alternative delivery
4. `/frontend/providers/inngest-realtime-provider.tsx` - Handle events
5. Schema definitions for new events

---

## Testing Plan

### After Implementation:
1. Test simple task: "What's 2+2?"
2. Test complex task with file generation
3. Verify messages appear in left panel
4. Verify files appear in right panel tabs
5. Test error scenarios
6. Monitor Inngest dashboard for proper execution
7. Check browser console for errors

---

## Lessons Learned

1. **Always verify external API capabilities** - Don't assume features exist
2. **Test streaming early** - Would have caught this during initial implementation
3. **Document actual vs intended** - The design doc described a wish, not reality
4. **Silent failures are dangerous** - `undefined()` didn't throw errors
5. **Integration tests matter** - Unit tests passed but integration was broken

---

## Next Steps

1. **Decision Required**: Choose Option 1 or Option 2
2. **Implementation**: 2-3 hours for Option 1, 6-8 hours for Option 2
3. **Testing**: 1-2 hours
4. **Deployment**: After verification
5. **Documentation Update**: Update inngest-streaming-design.md with actual implementation

---

---

## Current Status

**Publish calls consistently return `null`** but some complex tasks still show files in the frontend, indicating:

1. **There's another data path** we need to find
2. **The file display is working** through an unknown mechanism
3. **Investigation needed** to understand how working cases succeed

**Next step**: Investigate the mystery data path that allows some complex tasks to display files despite failed publish calls.

---

*Document created: August 20, 2025*
*Updated: August 20, 2025 - Post-revert analysis*
*Status: Investigating mystery data path*