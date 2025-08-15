# Deployment Strategy — Project Omni

Guidance to deploy the backend and integrate with Daytona across environments.

---

## Containerization
- Build a minimal image with Bun runtime
- Copy `server/` sources and install deps
- Set `PORT` and expose; run `bun run start`

## Networking
- Place behind reverse proxy (NGINX/Caddy) with TLS
- Configure timeouts to support long-lived WS connections
- Restrict egress to Daytona API and required endpoints only

## Configuration
- Inject env vars from secret manager
- Separate configs for dev/staging/prod (ports, log levels)
- Daytona credentials per environment

## Scaling
- Start with 1–2 replicas; scale horizontally as stateless API
- Sticky sessions not required with per-user WS mapping if using external pub/sub (future); for now, single instance recommended for WS simplicity

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

## Rollbacks
- Keep last 2 images; support quick rollback

## Daytona Integration
- Verify network ACLs allow server→Daytona
- Ensure project-level policies (CPU/mem) meet needs
- Document how to rotate Daytona API keys with zero downtime
