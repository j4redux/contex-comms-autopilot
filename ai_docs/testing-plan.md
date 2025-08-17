# Testing Plan — Project Omni

Covers unit, integration, and end-to-end tests for pure Inngest architecture. Release tests MUST hit real Daytona and Inngest (no mocks).

---

## Principles
- Do not mask incomplete features with mocks. Unit tests may mock small internals; integration/e2e must use real Daytona, Inngest functions, and the actual Dockerfile.
- Tests are reproducible and idempotent.
- All tests must verify Inngest function execution and real-time channel messaging.

## Test Matrix

1. Snapshot Build & Reuse
   - Change nothing → second create reuses snapshot (no rebuild)
   - Change `Dockerfile` → new snapshot name, build occurs once
   - Invalidate → build occurs on next create

2. Sandbox Lifecycle
   - Create returns `creating` then transitions to `ready`
   - Status for unknown ID → 404

3. Inngest Function Execution (Process)
   - When `ready`, `POST /api/knowledge/process` with `taskId` accepts and returns `jobId`
   - Inngest function `omni/process.knowledge` executes with comprehensive pre-flight checks
   - Real-time streaming via Inngest channels (`taskChannel().update()`)
   - Function publishes `log`, `result`, and `done` messages to correct `taskId`
   - Failing command emits `error` then `done` with non-zero exit

4. Inngest Real-time Behavior
   - Frontend subscribes to `taskChannel` with topics `update` and `status`
   - Messages contain proper `taskId` correlation for frontend routing
   - Built-in retry logic and job durability verification
   - Inngest Dev Server integration for local testing

5. Security & Limits
   - Rate limits enforced; appropriate 429s
   - Auth (once implemented) blocks unauthenticated calls and Inngest events
   - Inngest signing key validation for production deployments

## Current Test Suite Structure

**Individual Tests:**
- `bun run test:snapshot` (`01-snapshot-test.ts`) - Snapshot creation and basic functionality
- `bun run test:claude` (`02-claude-execution-test.ts`) - Claude execution patterns with different models  
- `bun run test:session` (`03-session-management-test.ts`) - Session management approaches
- `bun run test:api` (`05-api-endpoint-test.ts`) - API endpoints with Inngest function triggering
- `bun run test:inngest` (`06-inngest-integration-test.ts`) - Inngest function execution and real-time channels

**Complete Test Suite:**
- `bun run test:all` - Runs all individual tests sequentially

**End-to-End Validation:**
- `bun run scripts/e2e-inngest-process.ts` - Full pipeline validation with Inngest function execution
- Manual verification via Inngest Dev Server dashboard for function monitoring

**New Inngest-Specific Tests:**
- Inngest function registration and health check (`GET /api/inngest`)
- Event triggering with `taskId` parameter validation
- Real-time channel subscription and message correlation
- Function retry logic and error handling scenarios
- Step orchestration within Inngest functions (`step.run()` behavior)

## Test Results Validation

Every test should show:
- ✅ Sandbox creation from current snapshot
- ✅ Claude Code version 1.0.80 available  
- ✅ ANTHROPIC_API_KEY present (108 chars)
- ✅ Inngest function registration (`function_count: 1`)
- ✅ Inngest event triggering with valid event IDs
- ✅ Successful Claude execution with correct responses (verified: 3+7=10)
- ✅ Real-time message publishing via `taskChannel().update()`
- ✅ Proper `taskId` correlation in all messages
- ✅ Function completion with `status: "DONE"`
- ✅ Proper cleanup

**Inngest-Specific Validation:**
- ✅ `has_event_key: true` and `has_signing_key: true` in function health check
- ✅ Function execution visible in Inngest Dev Server dashboard
- ✅ Pre-flight checks: workspace detection, Claude CLI validation, API key verification
- ✅ Error handling: function failures trigger proper error messages
- ✅ Step orchestration: `step.run()` provides proper isolation and retry capabilities

## Tooling & Data
- Test runner: Bun native test runner
- No mocked Daytona or Inngest - all tests use real Daytona API, Inngest functions, and actual snapshot
- Requires Inngest Dev Server running (`npx inngest-cli dev`) for local testing
- Uses dedicated test `userId` and `taskId` namespaces for isolation
- Environment: `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` must be configured

## Manual Testing Workflow

**Prerequisites:**
1. Start backend server: `cd server && bun run dev`
2. Start Inngest Dev Server: `npx inngest-cli dev` 
3. Start frontend (optional): `cd frontend && npm run dev`

**Manual Test Cases:**
1. **Basic Math Operation:**
   ```bash
   curl -X POST http://localhost:8787/api/knowledge/process \
     -H "Content-Type: application/json" \
     -d '{"input": "What is 3 + 7?", "sandboxId": "valid-id", "userId": "test-user", "taskId": "test-task-id"}'
   ```
   Expected: `jobId` returned, Inngest dashboard shows execution, result = 10

2. **Error Handling:**
   ```bash
   curl -X POST http://localhost:8787/api/knowledge/process \
     -H "Content-Type: application/json" \
     -d '{"input": "test", "sandboxId": "invalid-id", "userId": "test-user", "taskId": "test-task-id"}'
   ```
   Expected: 404 error for sandbox not found

3. **Function Health Check:**
   ```bash
   curl http://localhost:8787/api/inngest
   ```
   Expected: `function_count: 1`, `has_event_key: true`, `has_signing_key: true`
