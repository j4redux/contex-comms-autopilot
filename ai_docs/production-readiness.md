# Production Readiness — Project Omni

Checklist and guardrails to ensure a complete, non-mocked solution ships to staging/prod.

---

## Required Code Guards
- [ ] Disallow stub fallback in non-dev
  - Implement check in `server/src/services/sandbox.ts`: if Daytona not configured and `NODE_ENV !== 'development'`, reject requests with `503 Service Unavailable` and clear message.
- [ ] Inngest channel authentication
  - Require JWT for channel subscriptions; bind to `userId` in token.
- [ ] Strict validation
  - Use `@effect/schema` (or equivalent) on every endpoint. Reject unknown fields.
- [ ] Structured logging
  - Use JSON logs with `requestId`, `userId`, `sandboxId`, `jobId` fields.
- [ ] Error mapping
  - Map internal errors to API error model and correct status codes.

## Configuration & Secrets
- [ ] Use secret manager in staging/prod for `DAYTONA_API_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`, JWT secret, and others.
- [ ] Separate configs for dev/staging/prod. Never commit secrets.
- [ ] Document rotation playbook for Daytona API keys and Inngest keys.

## Security & Limits
- [ ] JWT middleware for REST endpoints; 401/403 responses as appropriate.
- [ ] Rate limiting (per-IP and per-user) for create/process endpoints and Inngest function triggers.
- [ ] CORS allowlist and secure headers.
- [ ] Inngest function payload validation and sanitization.

## Observability
- [ ] Metrics: request rate, error rate, latency, sandbox lifecycle timings, Inngest function executions.
- [ ] Error tracking (Sentry/Equiv) with PII redaction.
- [ ] Dashboards/alerts for create failures, snapshot build failures, elevated 5xx, Inngest function failures.
- [ ] Inngest built-in monitoring for function retries, step failures, and execution times.

## Daytona & Sandbox
- [ ] Verify project policies: CPU/mem limits, egress restrictions.
- [ ] Confirm `Dockerfile` includes Claude tooling and non-interactive runtime.
- [ ] Define sandbox idle timeout and cleanup strategy.
- [ ] Snapshot retention policy documented.

## E2E & Release Tests (No Mocks)
- [ ] Release pipeline includes e2e hitting real Daytona and Inngest with env-scoped project.
- [ ] Tests: snapshot reuse, sandbox lifecycle, exec success/failure, Inngest function execution, channel streaming.

## Deployment
- [ ] Containerized server; reverse proxy with TLS; timeouts configured for API requests.
- [ ] Health/readiness probes; rollback strategy.
- [ ] Inngest function registration endpoint (`/api/inngest`) properly configured.

## Sign-off
- [ ] Security review completed.
- [ ] Performance sanity checks under expected load.
- [ ] On-call/ownership documented.
