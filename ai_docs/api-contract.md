# API Contract — Project Omni Backend

This is the authoritative API contract. It is designed for real environments (no mocks). Any stub paths in code must be removed before production.

---

## Conventions

- Base URL: `http://<host>:<PORT>` (default `127.0.0.1:8787` in dev)
- Content-Type: `application/json` for request/response bodies
- Authentication: JWT planned; until implemented, endpoints are open in dev only
- Error model (uniform):
  ```json
  { "error": { "code": "string", "message": "string", "details": any } }
  ```
- Standard status codes: 200/201 success; 400 validation; 401 auth; 404 not found; 409 conflict; 422 semantic; 429 rate limit; 5xx server/Daytona errors

---

## POST /api/sandbox/create

Create a Daytona sandbox from the deterministic snapshot built from the local Dockerfile.

Request
```json
{ "userId": "string" }
```

Response 200
```json
{ "sandboxId": "string", "status": "creating" | "ready" | "error" }
```

Errors
- 400: missing/invalid `userId`
- 500: snapshot build failure, Daytona API failure

Notes
- Uses pre-built snapshot created from current Dockerfile with timestamp-based naming.
- Current snapshot: `omni-snapshot-2025-08-18T18-16-29-074Z` with Claude Code 1.0.80 pre-installed.

---

## GET /api/sandbox/status?id=...

Get current status of a sandbox.

Response 200
```json
{ "sandboxId": "string", "status": "creating" | "ready" | "stopped" | "error", "createdAt": number }
```

Errors
- 400: missing `id`
- 404: unknown sandbox

---

## POST /api/knowledge/process

Execute a processing command inside a running sandbox via Inngest function. Streams logs/results over Inngest real-time channels for job durability and retry capabilities.

Request
```json
{
  "input": "string",
  "sandboxId": "string", 
  "userId": "string",
  "taskId": "string",     // required, UUID for frontend task correlation
  "model": "sonnet" | "haiku"  // optional, Claude model to use (default: sonnet)
  "env": { "KEY": "VALUE" }   // optional, additional env vars for the process
}
```

Response 202
```json
{ "jobId": "string", "accepted": true }
```

Server behavior
- Triggers Inngest function `omni/process.knowledge` with request data
- Uses Claude Code pattern: `echo "input" | claude -p --output-format json --model <model>` inside sandbox
- Environment variables: USER_ID, ANTHROPIC_API_KEY available in sandbox
- Streams execution logs via Inngest real-time channels to frontend
- Includes comprehensive pre-flight checks (Claude CLI, API key, network connectivity)
- Parses JSON response and emits result, then completion status

Errors
- 400: validation failed (missing taskId, input, sandboxId, userId)
- 404: sandbox not found
- 409: sandbox not ready
- 500: Inngest trigger failure or Daytona API error

---

## POST /api/snapshot/invalidate

Invalidate snapshot cache to force next build.

Request: none

Response 200
```json
{ "ok": true }
```

---

## GET /api/inngest

Inngest function registration endpoint for development and production deployment.

Response 200
```json
{
  "authentication_succeeded": null,
  "extra": { "is_mode_explicit": false },
  "has_event_key": true,
  "has_signing_key": true, 
  "function_count": 1,
  "mode": "dev",
  "schema_version": "2024-05-24"
}
```

Functions registered:
- `process-knowledge`: Handles `omni/process.knowledge` events for Claude Code execution

---

## Inngest Real-time Streaming

Real-time streaming is handled via Inngest channels instead of WebSocket. Frontend subscribes to `taskChannel` with topics `update` and `status`.

### Channel: `tasks`

#### Topic: `update` 
Messages from Inngest functions to frontend:
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

#### Topic: `status`
Task lifecycle updates:
```json
{
  "taskId": "string",
  "status": "IN_PROGRESS" | "DONE" | "MERGED",
  "sessionId": "string"
}
```

### Frontend Integration
- Frontend uses `@inngest/realtime` to subscribe to channels
- Real-time updates flow directly from Inngest functions to UI
- Built-in retry logic and job durability
- Better error handling and monitoring via Inngest dashboard
