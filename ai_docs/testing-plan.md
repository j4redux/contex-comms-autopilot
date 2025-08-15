# Testing Plan — Project Omni

Covers unit, integration, and end-to-end tests. Release tests MUST hit real Daytona (no mocks).

---

## Principles
- Do not mask incomplete features with mocks. Unit tests may mock small internals; integration/e2e must use real Daytona and the actual Dockerfile.
- Tests are reproducible and idempotent.

## Test Matrix

1. Snapshot Build & Reuse
   - Change nothing → second create reuses snapshot (no rebuild)
   - Change `Dockerfile` → new snapshot name, build occurs once
   - Invalidate → build occurs on next create

2. Sandbox Lifecycle
   - Create returns `creating` then transitions to `ready`
   - Status for unknown ID → 404

3. Exec Path (Process)
   - When `ready`, `POST /api/knowledge/process` accepts and returns `jobId`
   - WS streams logs and ends with `done` message with exitCode=0
   - Failing command emits `error` then `done` with non-zero exit

4. WS Behavior
   - Reconnect with backoff; heartbeats; server drops idle connections
   - Multiple tabs for same `userId` receive same stream

5. Security & Limits
   - Rate limits enforced; appropriate 429s
   - Auth (once implemented) blocks unauthenticated calls/WS

## Current Test Suite Structure

**Individual Tests:**
- `bun run test:snapshot` (`01-snapshot-test.ts`) - Snapshot creation and basic functionality
- `bun run test:claude` (`02-claude-execution-test.ts`) - Claude execution patterns with different models  
- `bun run test:session` (`03-session-management-test.ts`) - Session management approaches
- `bun run test:api` (`05-api-endpoint-test.ts`) - API endpoints with WebSocket streaming

**Complete Test Suite:**
- `bun run test:all` - Runs all individual tests sequentially

**End-to-End Validation:**
- `bun run scripts/e2e-process.ts` - Full pipeline validation with WebSocket streaming

## Test Results Validation

Every test should show:
- ✅ Sandbox creation from current snapshot
- ✅ Claude Code version 1.0.80 available  
- ✅ ANTHROPIC_API_KEY present (108 chars)
- ✅ Successful Claude execution with correct responses
- ✅ Proper cleanup

## Tooling & Data
- Test runner: Bun native test runner
- No mocked Daytona - all tests use real Daytona API and actual snapshot
- Uses dedicated test `userId` namespaces for isolation
