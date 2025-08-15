# Production Readiness — Project Omni

Checklist and guardrails to ensure a complete, non-mocked solution ships to staging/prod.

---

## Required Code Guards
- [ ] Disallow stub fallback in non-dev
  - Implement check in `server/src/services/sandbox.ts`: if Daytona not configured and `NODE_ENV !== 'development'`, reject requests with `503 Service Unavailable` and clear message.
- [ ] WS authentication
  - Require JWT for `/ws`; bind connection to `userId` in token.
- [ ] Strict validation
  - Use `@effect/schema` (or equivalent) on every endpoint. Reject unknown fields.
- [ ] Structured logging
  - Use JSON logs with `requestId`, `userId`, `sandboxId`, `jobId` fields.
- [ ] Error mapping
  - Map internal errors to API error model and correct status codes.

## Configuration & Secrets
- [ ] Use secret manager in staging/prod for `DAYTONA_API_KEY`, JWT secret, and others.
- [ ] Separate configs for dev/staging/prod. Never commit secrets.
- [ ] Document rotation playbook for Daytona API keys.

## Security & Limits
- [ ] JWT middleware for REST endpoints; 401/403 responses as appropriate.
- [ ] Rate limiting (per-IP and per-user) for create/process endpoints and WS connections.
- [ ] CORS allowlist and secure headers.

## Observability
- [ ] Metrics: request rate, error rate, latency, sandbox lifecycle timings, WS connections.
- [ ] Error tracking (Sentry/Equiv) with PII redaction.
- [ ] Dashboards/alerts for create failures, snapshot build failures, elevated 5xx, WS disconnect spikes.

## Daytona & Sandbox
- [ ] Verify project policies: CPU/mem limits, egress restrictions.
- [ ] Confirm `Dockerfile` includes Claude tooling and non-interactive runtime.
- [ ] Define sandbox idle timeout and cleanup strategy.
- [ ] Snapshot retention policy documented.

## E2E & Release Tests (No Mocks)
- [ ] Release pipeline includes e2e hitting real Daytona with env-scoped project.
- [ ] Tests: snapshot reuse, sandbox lifecycle, exec success/failure, WS streaming.

## Deployment
- [ ] Containerized server; reverse proxy with TLS; timeouts configured for WS.
- [ ] Health/readiness probes; rollback strategy.

## Sign-off
- [ ] Security review completed.
- [ ] Performance sanity checks under expected load.
- [ ] On-call/ownership documented.
