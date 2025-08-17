# Inngest Streaming Design — Project Omni

Design for reliable, durable, real-time streaming from Inngest functions to client via channels.

---

## Architecture Overview

- **Job Triggering**: `POST /api/knowledge/process` triggers Inngest function `omni/process.knowledge`
- **Function Execution**: Inngest functions handle Claude Code processing with built-in durability and retries
- **Real-time Streaming**: `@inngest/realtime` channels provide live updates to frontend
- **Message Correlation**: `taskId` parameter ensures proper message routing to frontend tasks

## Inngest Function Registration

- **Endpoint**: `GET /api/inngest` - Function health check and registration
- **Functions**: `process-knowledge` handles `omni/process.knowledge` events
- **Authentication**: `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` for secure communication

## Message Schema (Inngest function → client)

### Channel: `tasks` 

#### Topic: `update` (Real-time processing messages)
```json
{
  "taskId": "string",
  "message": {
    "type": "log",
    "data": "string", 
    "jobId": "string",
    "ts": number
  }
}
```

```json
{
  "taskId": "string", 
  "message": {
    "type": "result",
    "format": "text",
    "data": "string",
    "jobId": "string", 
    "ts": number
  }
}
```

```json
{
  "taskId": "string",
  "message": {
    "type": "error",
    "code": "string",
    "message": "string",
    "jobId": "string",
    "ts": number
  }
}
```

```json
{
  "taskId": "string",
  "message": {
    "type": "done", 
    "exitCode": number,
    "jobId": "string",
    "ts": number
  }
}
```

#### Topic: `status` (Task lifecycle updates)
```json
{
  "taskId": "string",
  "status": "IN_PROGRESS" | "DONE" | "MERGED",
  "sessionId": "string"
}
```

## Job Durability & Reliability

- **Automatic Retries**: Inngest provides built-in retry logic for failed functions
- **Step Orchestration**: `step.run()` provides isolation and granular retry capabilities
- **Function Monitoring**: Inngest Dev Server dashboard shows execution details and errors
- **Event Correlation**: Each event gets unique ID for tracking and debugging

## Step-by-Step Processing Flow

1. **Pre-flight Checks**: 
   - Workspace directory detection (`/workspace` vs `/home/daytona`)
   - Claude CLI availability verification (`claude --version`)
   - API key presence validation (`ANTHROPIC_API_KEY`)
   - Network connectivity tests (DNS, HTTPS to api.anthropic.com)

2. **Claude Execution**:
   - Command: `echo "input" | claude -p --output-format json --model <model>`
   - Real-time log streaming via `publish(taskChannel().update())`
   - JSON response parsing with fallback to raw output

3. **Result Publishing**:
   - Success: `type: "result"` with Claude's response
   - Completion: `type: "done"` with exit code
   - Errors: `type: "error"` with error details

## Frontend Integration

- **Subscription**: Frontend uses `@inngest/realtime` to subscribe to `taskChannel`
- **Token Management**: `getSubscriptionToken()` for authenticated channel access
- **Message Routing**: `taskId` correlates messages to correct frontend tasks
- **Real-time Updates**: Live streaming during Claude processing

```typescript
// Frontend subscription example
const token = await getSubscriptionToken(inngest, {
  channel: taskChannel(),
  topics: ["status", "update"],
});

// Message handling
if (latestData.data.message.type === "result") {
  // Update UI with Claude's response
  updateTask(latestData.data.taskId, {
    result: latestData.data.message.data
  });
}
```

## Development Setup

- **Backend**: Requires `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in environment
- **Dev Server**: `npx inngest-cli dev` for local Inngest function execution
- **Monitoring**: Inngest dashboard at `http://localhost:8288` for function monitoring
- **Testing**: Manual testing via curl with valid `taskId` parameter

## Error Handling

- **Function Failures**: Automatic retries with exponential backoff
- **Claude Errors**: Proper error message publishing with error codes
- **Network Issues**: Step-level retries for individual operations
- **Validation**: Request validation ensures all required parameters present

## Production Considerations

- **Signing Keys**: Use production Inngest keys for secure function execution
- **Monitoring**: Inngest provides built-in observability and alerting
- **Scaling**: Functions scale automatically based on event volume
- **Reliability**: Built-in durability ensures no lost jobs or messages