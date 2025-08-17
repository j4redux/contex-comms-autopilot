# Deployment Strategy — Project Omni

Guidance to deploy the backend and integrate with Daytona across environments.

---

## Containerization
- Build a minimal image with Bun runtime
- Copy `server/` sources and install deps
- Set `PORT` and expose; run `bun run start`

## Networking
- Place behind reverse proxy (NGINX/Caddy) with TLS
- Configure timeouts for API requests (Inngest functions handle long-running operations)
- Restrict egress to Daytona API, Inngest cloud (if using hosted), and required endpoints only

## Configuration
- Inject env vars from secret manager
- Separate configs for dev/staging/prod (ports, log levels)
- Daytona credentials per environment
- Inngest signing keys per environment (separate dev/staging/prod keys)
- Inngest event keys for secure function triggering

## Scaling
- Start with 1–2 replicas; scale horizontally as stateless API
- No sticky sessions required (Inngest functions provide durable execution)
- Inngest handles function scaling automatically based on event volume

## Health & Readiness
- Health endpoint `/` → 200
- Readiness: optional lightweight Daytona ping or internal dependency check

## CI/CD
- Build, scan, push image
- Apply infra manifests
- Migrations: none currently; add step if persistence added

## Observability
- Ship logs to centralized sink
- Basic metrics: request rate, error rate, latency, sandbox lifecycle timings
- Inngest provides built-in function monitoring, retry metrics, and execution dashboards
- Configure Inngest alerts for function failures and high retry rates

## Rollbacks
- Keep last 2 images; support quick rollback

## Inngest Integration
- Production deployment requires hosted Inngest (or self-hosted Inngest instance)
- Verify network ACLs allow server→Inngest cloud endpoints
- Configure webhook endpoint `/api/inngest` for function registration
- Set up production signing keys and event authentication

## Daytona Integration
- Verify network ACLs allow server→Daytona
- Ensure project-level policies (CPU/mem) meet needs
- Document how to rotate Daytona API keys with zero downtime
