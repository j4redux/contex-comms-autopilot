# Contex Backend (Bun + TS)

API and WebSocket server.

## Run

```bash
# from server/
bun install  # no external deps required for Bun runtime, but we install TS + Effect
bun run dev  # hot reload
# or
bun run start
```

Server listens on http://localhost:8787 by default.

## Endpoints

- POST `/api/sandbox/create` — stub, returns sandboxId
- GET `/api/sandbox/status` — stub status
- POST `/api/knowledge/process` — stub 202 accepted
- GET `/api/knowledge/query` — stub empty result
- WS `/ws` — placeholder echo

## Next

- Add Effect Layers for:
  - Daytona SandboxManager (create/status)
  - ClaudeRunner (spawn, stream tokens)
  - KnowledgeIndex (read/write JSON indices)
  - Auth (JWT), RateLimiter, Logger
- Validate payloads with `@effect/schema`
- Map typed errors to HTTP responses consistently
