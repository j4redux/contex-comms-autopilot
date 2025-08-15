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
- Current snapshot: `omni-snapshot-2025-08-14T09-03-23-851Z` with Claude Code 1.0.80 pre-installed.

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

Execute a processing command inside a running sandbox. Intended to stream logs/results over WebSocket. If WS is not connected, server should buffer minimal recent lines and return them once streaming is wired; however, production must use WS.

Request
```json
{
  "input": "string",
  "sandboxId": "string",
  "userId": "string",
  "model": "sonnet" | "haiku"  // optional, Claude model to use (default: sonnet)
  "env": { "KEY": "VALUE" }   // optional, additional env vars for the process
}
```

Response 202
```json
{ "jobId": "string", "accepted": true }
```

Server behavior
- Uses VibeKit pattern: `echo "input" | claude -p --output-format json --model <model>` inside sandbox
- Environment variables passed via sandbox creation (USER_ID, ANTHROPIC_API_KEY)
- Streams execution logs to WS channel `userId` with message schema below.
- Parses JSON response and emits result, then terminal done message.

Errors
- 400: validation failed
- 404: sandbox not found
- 409: sandbox not ready
- 500: execution error inside sandbox or Daytona API error

---

## POST /api/snapshot/invalidate

Invalidate snapshot cache to force next build.

Request: none

Response 200
```json
{ "ok": true }
```

---

## GET /ws?userId=...

WebSocket endpoint for streaming logs and results to the client.

Messages from server to client (newline-delimited JSON):
```json
{ "type": "log", "sandboxId": "string", "jobId": "string", "level": "info"|"error", "ts": number, "data": "string" }
{ "type": "result", "sandboxId": "string", "jobId": "string", "ts": number, "data": any }
{ "type": "error", "sandboxId": "string", "jobId": "string", "ts": number, "code": "string", "message": "string" }
{ "type": "done", "sandboxId": "string", "jobId": "string", "ts": number, "exitCode": number }
{ "type": "heartbeat", "ts": number }
```

Client to server (optional control):
```json
{ "type": "subscribe", "userId": "string" }
{ "type": "ping" }
```

Notes
- One WS connection per signed-in user recommended. Server routes messages by `userId`. In prod, require JWT.
