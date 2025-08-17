# Omni Onboarding — Quickstart

A minimal, high-signal checklist to get productive fast. Prefer this over long docs when you just need to run and validate.

## 1) Principles
- **No mocks or stubs**: Real Daytona + real Claude CLI + real Inngest functions in all envs.
- **Job Durability**: Inngest functions provide automatic retries and job persistence.
- **Real-time Streaming**: `log`, `error`, `result`, `done` messages via Inngest channels with `taskId` correlation.
- **Run dependencies**: Start server, Inngest Dev Server, then E2E in separate terminals.

## 2) Prereqs
- Bun installed
- Node.js (for Inngest CLI: `npx inngest-cli`)
- Daytona credentials (`DAYTONA_API_URL`, `DAYTONA_API_KEY`)
- Inngest keys (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`)
- Claude CLI available inside sandbox image (see `Dockerfile`)

## 3) Install & Typecheck
```bash
cd server
bun install
bun run typecheck
```

TypeScript config notes:
- `@types/bun` installed
- `tsconfig.json`: `moduleResolution: bundler`, `module: Preserve`, `target: ESNext`, `lib: [ESNext, DOM]`, `types: ["bun"]`, `include: ["src", "scripts"]`

## 4) Run
- Terminal A (server):
```bash
cd server
bun run start   # PORT=8787 by default
```
- Terminal B (Inngest Dev Server):
```bash
npx inngest-cli dev   # Starts on http://localhost:8288
```
- Terminal C (E2E):
```bash
cd server
bun run scripts/e2e-inngest-process.ts
```
Optional overrides:
```bash
BASE_URL=http://localhost:8787 \
USER_ID=u1 \
TASK_ID=test-task-$(date +%s) \
INPUT="Create a brief deployment checklist for Omni backend." \
MODEL=sonnet \
TIMEOUT_MS=180000 \
bun run scripts/e2e-inngest-process.ts
```

## 5) Key Endpoints
- `POST /api/sandbox/create` → returns `{ sandboxId, status }`
- `GET /api/sandbox/status?id=...`
- `POST /api/knowledge/process` → triggers Inngest function; streams via channels; emits `result` + `done`
- `POST /api/snapshot/invalidate` → forces snapshot rebuild next time

## 6) Daytona Integration
- Snapshot from repo-root `Dockerfile`; timestamp-based naming; cached in `server/.snapshot-cache.json`
- Session-based exec with log streaming using VibeKit patterns (pipe-based input)
- Current snapshot: `omni-snapshot-2025-08-14T09-03-23-851Z` with Claude Code 1.0.80

## 7) Troubleshooting
- **EADDRINUSE**: stop prior runs; free port 8787
- **TS can’t find Bun**: `@types/bun`, tsconfig includes `types: ["bun"]` and `include: ["src","scripts"]`; restart TS server
- **No artifact produced**: server falls back to buffered stdout -> writes artifact and emits `result`

## 8) Where to go next
- **Master Guide**: `claude-code-daytona-integration.md` - complete implementation patterns
- **API Reference**: `api-contract.md` - REST endpoints and schemas
- **Streaming Protocol**: `inngest-streaming-design.md` - Inngest real-time message types
- **Frontend Planning**: `frontend-expo-plan.md` - mobile app development
