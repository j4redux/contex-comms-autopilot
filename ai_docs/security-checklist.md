# Security Checklist — Project Omni

Use this as a PR checklist and pre-release gate.

---

## Authentication & Authorization
- [ ] JWT access + refresh tokens implemented
- [ ] WS authenticates via token; per-user channel isolation
- [ ] Least privilege for server and CI credentials

## Input Validation & Output Encoding
- [ ] All endpoints validated with `@effect/schema` (or equivalent)
- [ ] Reject unknown fields; strict types
- [ ] Sanitize `INPUT` before passing to shell/CLI inside sandbox

## Rate Limiting & Abuse Prevention
- [ ] Per-IP and per-user limits for create/process
- [ ] WS connection limits and message rate limits
- [ ] Backoff on repeated failures

## Secrets Management
- [ ] No secrets committed; dev-only `.env`
- [ ] Staging/prod secrets injected via manager (AWS SM, 1Password, Doppler, Vault)
- [ ] Rotation plan documented

## Sandbox Isolation
- [ ] Per-user sandbox isolation policy documented
- [ ] Resource limits set (CPU/mem)
- [ ] Network egress restricted

## Logging & Observability
- [ ] PII policy defined; avoid logging sensitive content
- [ ] Structured logs with IDs; redact sensitive fields
- [ ] Error tracking with sampling

## Supply Chain
- [ ] Dockerfile pinned base image with digest or minimum version policy
- [ ] Dependencies scanned (SCA) in CI

## Data Handling
- [ ] If persisting results, encryption at rest + in transit
- [ ] Retention policies documented and implemented

## Reviews & Tests
- [ ] Security review of CL changes affecting Dockerfile, Daytona usage, WS auth
- [ ] E2E tests hit real Daytona; no mocks in release tests
