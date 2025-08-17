# Ops Runbook — Project Omni

Operational procedures for local dev, deployments, secrets, monitoring, and incident response.

---

## Local Development

- Install deps: `cd server && bun install`
- Typecheck: `bun run typecheck`
- Run: `bun run start` (defaults to port 8787)
- Free port: `lsof -iTCP:8787 -sTCP:LISTEN -n -P && kill -9 <PID>`
- Daytona creds: set `DAYTONA_API_URL`, `DAYTONA_API_KEY` in `server/.env`
- Inngest keys: set `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` in `server/.env`
- Inngest Dev Server: `npx inngest-cli dev` (runs on http://localhost:8288)
- Snapshot cache: `server/.snapshot-cache.json` — delete via `POST /api/snapshot/invalidate`

## Environments

- Dev: local Bun server + Daytona project
- Staging/Prod: containerized server behind reverse proxy (TLS)

## Deployment

- Containerize server
- Inject envs from secret manager (no committed secrets)
- Set healthchecks: `/` (200) and lightweight status endpoint
- Network: allow egress to Daytona API; lock everything else down

## Monitoring & Logs

- Structured logs (JSON) with requestId, userId, sandboxId, jobId
- Metrics (minimal): request count, error count, sandbox create/time-to-ready, exec duration, Inngest function executions
- Inngest monitoring: Built-in dashboard at http://localhost:8288 (dev) shows function executions, retries, errors
- Error tracking: Sentry/Equiv with sampling
- Function observability: Inngest provides automatic step-level monitoring and retry metrics

## Incident Response

1. Identify scope: endpoints affected, users impacted
2. Check server logs and metrics dashboard
3. Verify Daytona API health
4. Check Inngest function status via dashboard (dev: http://localhost:8288)
5. Reproduce with a known-good create/status flow
6. If snapshot build failures: inspect `Dockerfile`, retry after `/api/snapshot/invalidate`
7. If Inngest function failures: check event payload, function logs, and retry configuration
8. If real-time streaming issues: verify channel subscriptions and `taskId` correlation
9. Roll back to previous server image if needed

## Change Management

- All API changes must update `ai_docs/api-contract.md`
- Dockerfile modifications trigger new snapshot name; coordinate across environments

## Backups & Retention

- If persisting artifacts externally (future), back them up and document restore procedures

## Access & Secrets

- Use a secret manager in staging/prod
- Rotate Daytona API keys regularly
- Rotate Inngest signing keys per security policy
- Audit access to deployment and CI
- Inngest production keys should be environment-specific
