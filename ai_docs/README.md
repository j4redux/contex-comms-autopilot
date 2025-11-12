# ai_docs — Project Contex

**Your Corporate Comms Autopilot that never forgets.**

Contex turns founder thoughts into investor-ready materials in minutes—memos, updates, and fundraising documents that close deals and sound like you at your sharpest. Contex remembers everything, so founders never explain the same context twice.

## Key Innovation: Persistent Memory

**The Problem**: Every AI tool makes founders explain the same context repeatedly.

**Our Solution**: Workspace-as-a-Service architecture ensures Claude remembers everything:
- Each founder gets a persistent workspace that survives server restarts
- Every interaction builds on all previous knowledge
- Context accumulates over time, creating compound value
- High switching costs create a natural moat (once you have months of context, why start over?)

See [persistent-sandbox-implementation.md](./persistent-sandbox-implementation.md) for technical details.

## Documentation Overview

### 🎯 Start Here
- [spec.md](./spec.md) ← **PRODUCT SPECIFICATION** - vision, market validation, business model
- [developer-context.md](./developer-context.md) ← **DEVELOPER GUIDE** - current implementation status and architecture
- [persistent-sandbox-implementation.md](./persistent-sandbox-implementation.md) ← **WORKSPACE PERSISTENCE** - how we achieve "never forget"

### 🏗️ Core Implementation
- [claude-code-daytona-integration.md](./claude-code-daytona-integration.md) - proven Claude + Daytona patterns
- [api-contract.md](./api-contract.md) - REST endpoints and data models
- [inngest-streaming-design.md](./inngest-streaming-design.md) - event-driven real-time architecture
- [file-detection-implementation-status.md](./file-detection-implementation-status.md) - file detection system
- [deliverable-files-implementation.md](./deliverable-files-implementation.md) - deliverable generation

### 🚀 Getting Started
- [onboarding-quickstart.md](./onboarding-quickstart.md) - quick setup guide
- [testing-plan.md](./testing-plan.md) - test strategy and examples

### 📚 Reference Documentation
- [claude code/](./claude%20code/) - Claude Code CLI reference
- [daytona/](./daytona/) - Daytona SDK documentation

### 🔮 Future Development
- [deployment-strategy.md](./deployment-strategy.md) - production deployment approach
- [production-readiness.md](./production-readiness.md) - production checklist
- [security-checklist.md](./security-checklist.md) - security requirements
- [ops-runbook.md](./ops-runbook.md) - operational procedures

## Current Status

### ✅ Production-Ready MVP
- Web-based interface for founder input (Next.js 15)
- Inngest event-driven processing pipeline
- Claude Code 1.0.80 integration in Daytona sandboxes
- Real-time file detection and display
- Three-layer caching (backend, frontend, sandbox filesystem)

### 🚧 In Progress
- **Workspace-as-a-Service**: Persistent per-user sandboxes that survive server restarts
- **File Synchronization**: Recovery of workspace files after sandbox replacement
- **UI Polish**: Founder-specific messaging and workflows

### 📊 Traction
- **20+ founder interviews** completed
- **2 design partners** confirmed
- **1 potential customer** at $2,000/month
- **$10M ARR target** from investor communications alone

## Quick Start

### Prerequisites
- Node.js 18+ and Bun installed
- Docker running (for Daytona sandboxes)
- Anthropic API key

### Development Setup

```bash
# Backend (Terminal 1)
cd server
bun install
bun run dev  # Runs on http://localhost:8787

# Inngest Dev Server (Terminal 2)
npx inngest-cli dev  # Runs on http://localhost:8288

# Frontend (Terminal 3)
cd frontend
npm install
npm run dev  # Runs on http://localhost:3001
```

### Environment Variables

Create `/frontend/.env.local`:
```
INNGEST_EVENT_KEY=your-key-here
INNGEST_SIGNING_KEY=your-key-here
NEXT_PUBLIC_DEV_USER_ID=dev-user-001
```

Backend needs `ANTHROPIC_API_KEY` in environment.

For complete setup, see [onboarding-quickstart.md](./onboarding-quickstart.md).

## Repository Structure

```
project-contex/
├── frontend/                # Next.js web app
│   ├── app/                # App Router pages
│   ├── stores/             # Zustand state (tasks.ts)
│   └── providers/          # Inngest real-time provider
├── server/                  # Bun backend
│   └── src/
│       ├── services/
│       │   ├── inngest.ts  # Core processing functions
│       │   ├── sandbox.ts  # Sandbox management
│       │   └── daytona.ts  # Daytona integration
│       └── index.ts        # Main server
├── ai_docs/                # This documentation
└── Dockerfile              # Claude Code sandbox image
```

## Key Files for New Developers

1. **Business Logic**: `/server/src/services/inngest.ts` - createTask and processKnowledge functions
2. **Sandbox Management**: `/server/src/services/sandbox.ts` - per-user sandbox orchestration
3. **Frontend Entry**: `/frontend/app/_components/task-form.tsx` - where founders input
4. **State Management**: `/frontend/stores/tasks.ts` - task and file storage
5. **Real-time Updates**: `/frontend/providers/inngest-realtime-provider.tsx` - live streaming

## Architecture Highlights

- **Event-Driven**: Inngest events drive all processing (no REST APIs for tasks)
- **Three-Layer Cache**: Backend (in-memory), Frontend (localStorage), Sandbox (filesystem)
- **Workspace Persistence**: User sandboxes survive restarts (implementing now)
- **Real-time Streaming**: Inngest channels for live updates
- **Secure Isolation**: Per-user Docker containers with restricted permissions
