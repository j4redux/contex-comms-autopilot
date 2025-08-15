# ai_docs — Project Omni

Authoritative documentation for handoff and ongoing development.

## Table of Contents

**Core Implementation:**
- [spec.md](./spec.md) ← **PRODUCT SPECIFICATION** - what we're building and why
- [claude-code-daytona-integration.md](./claude-code-daytona-integration.md) ← **TECHNICAL MASTER** - proven implementation patterns
- [onboarding-quickstart.md](./onboarding-quickstart.md) ← start here for quick setup
- [api-contract.md](./api-contract.md) - REST API endpoints
- [ws-streaming-design.md](./ws-streaming-design.md) - WebSocket streaming protocol  
- [testing-plan.md](./testing-plan.md) - test strategy and structure

**Reference Documentation:**
- [claude code/](./claude%20code/) - Claude Code CLI reference
- [daytona/](./daytona/) - Daytona SDK reference

**Future Planning:**
- [frontend-expo-plan.md](./frontend-expo-plan.md) - mobile app development plan
- [ops-runbook.md](./ops-runbook.md) - operational procedures
- [security-checklist.md](./security-checklist.md) - security requirements
- [deployment-strategy.md](./deployment-strategy.md) - deployment approach
- [production-readiness.md](./production-readiness.md) - production checklist

## Quick Start

For complete implementation details, see `claude-code-daytona-integration.md`.

Run tasks one-at-a-time to avoid port conflicts:
- Terminal A: `cd server && bun run start`
- Terminal B: `cd server && bun run scripts/e2e-process.ts`
