# WebSocket Streaming Design — Project Omni

Design for reliable, authenticated log/result streaming from server to client.

---

## Endpoint
- `GET /ws?userId=<id>` initially; migrate to token-authenticated WS
- Upgrade handled by server; store connection in `channels[userId]`

## Message Schema (server → client)
```json
{ "type": "log", "sandboxId": "string", "jobId": "string", "level": "info"|"error", "ts": number, "data": "string" }
{ "type": "result", "sandboxId": "string", "jobId": "string", "ts": number, "data": any }
{ "type": "error", "sandboxId": "string", "jobId": "string", "ts": number, "code": "string", "message": "string" }
{ "type": "done", "sandboxId": "string", "jobId": "string", "ts": number, "exitCode": number }
{ "type": "heartbeat", "ts": number }
```

## Backpressure & Buffering
- Server writes line-buffered; if client is slow, drop oldest logs but always deliver terminal `done`/`error`
- Keep small in-memory ring buffer per `jobId` (e.g., 200 lines)

## Reliability
- Heartbeats every 20–30s; drop idle after 60–90s without pong
- Client reconnect with exponential backoff and resume subscription by `userId`
- Idempotent messages: include `jobId` and monotonic sequence

## Auth
- Phase 1: query param with `userId` (dev)
- Phase 2: JWT in `Sec-WebSocket-Protocol` or URL; validate and bind to `userId`

## Server Integration
- Daytona exec streams forwarded line-by-line to WS channel
- Also emit summary `result` if the process writes a JSON file to `/workspace/.system/results/<jobId>.json`
- On exit, emit `done` with exit code

## Client Integration
- Singleton WS per user
- Dispatch messages to Zustand store; components subscribe by `jobId`
- Show reconnect UI state; replay recent buffered lines on resume
