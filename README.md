# Contex

**Corporate Comms Autopilot with Persistent Memory**

Contex is an AI-powered communications platform that leverages Claude Code execution within Daytona sandboxes to transform founder thoughts into structured business deliverables. The system features a unique **workspace-as-a-service** architecture where each user gets a persistent, isolated environment that accumulates knowledge over time.

[![Architecture Status](https://img.shields.io/badge/Architecture-Production%20Ready-green)]()
[![Tech Stack](https://img.shields.io/badge/Stack-Bun%20%2B%20Next.js%20%2B%20Effect-blue)]()

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** (for frontend)
- **Bun** (for backend) - [Install Bun](https://bun.sh)
- **Docker** (for Daytona sandboxes)
- **pnpm** (package manager) - `npm install -g pnpm`
- **Anthropic API Key** - [Get API Key](https://console.anthropic.com/)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd project-contex

# Install root dependencies
pnpm install

# Install backend dependencies
cd server
bun install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Setup

#### Backend Environment (`server/.env`)

```bash
# Required
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional - Daytona Configuration
DAYTONA_API_URL=http://localhost:3986
DAYTONA_API_KEY=your_daytona_api_key

# Optional - Development
DEV_MODE=true  # Uses in-memory stub if Daytona unavailable
```

#### Frontend Environment (`frontend/.env.local`)

```bash
# Inngest Configuration
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

# Development User
NEXT_PUBLIC_DEV_USER_ID=dev-user-001

# Backend API URL (default: http://localhost:8787)
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### Running the Application

You'll need **three terminal windows** to run the full stack:

#### Terminal 1: Backend Server

```bash
cd server
bun run dev
```

**Server runs on:** `http://localhost:8787`

The backend provides:
- RESTful API endpoints
- Sandbox orchestration
- Claude Code execution pipeline
- Inngest webhook handler

#### Terminal 2: Inngest Dev Server

```bash
# From project root or any directory
npx inngest-cli@latest dev
```

**Inngest runs on:** `http://localhost:8288`

The Inngest dev server provides:
- Event processing visualization
- Real-time function execution logs
- Debugging interface
- Event replay capabilities

**Access the Inngest UI:** Open `http://localhost:8288` in your browser to monitor events and function executions in real-time.

#### Terminal 3: Frontend

```bash
cd frontend
bun run dev
```

**Frontend runs on:** `http://localhost:3001`

The frontend provides:
- User interface for task creation
- Real-time updates via WebSocket
- Task history and file management
- Persistent state via localStorage

### Testing the Application

1. **Verify all services are running:**
   - Backend: http://localhost:8787
   - Inngest UI: http://localhost:8288
   - Frontend: http://localhost:3001

2. **Create your first task:**
   - Open http://localhost:3001
   - Enter a prompt like: "Create a brief investor update about our Q4 progress"
   - Click "Process"
   - Watch real-time updates in both the UI and Inngest dashboard

3. **Monitor execution:**
   - Check the Inngest UI at http://localhost:8288 to see:
     - `contex/process.knowledge` function execution
     - Real-time logs and events
     - Execution timeline and status

---

## 🏗️ Architecture Overview

### Tech Stack

#### Backend (`/server`)
- **Runtime:** Bun (high-performance JavaScript runtime)
- **Framework:** Effect (functional programming for TypeScript)
- **Event Processing:** Inngest (durable workflows and real-time events)
- **Sandbox Management:** Daytona SDK
- **AI Integration:** Claude Code CLI v1.0.80

#### Frontend (`/frontend`)
- **Framework:** Next.js 15.3.3 with React 19
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand with localStorage persistence
- **Real-time Communication:** Inngest Realtime
- **UI Components:** Radix UI primitives
- **AI SDK:** Vercel AI SDK

#### Infrastructure
- **Container Orchestration:** Docker (Daytona sandboxes)
- **Package Management:** pnpm (monorepo), bun (backend), npm (frontend)
- **Testing:** Bun test runner

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Task Form   │  │  Task List   │  │ File Display │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                   │             │
│         └──────────────────┼───────────────────┘             │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │ Zustand Store   │                        │
│                   │ (localStorage)  │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Inngest        │
                    │  Realtime       │
                    │  WebSocket      │
                    └────────┬────────┘
                             │
┌────────────────────────────┼──────────────────────────────────┐
│                   Backend (Bun + Effect)                       │
│                            │                                   │
│  ┌────────────────────────▼───────────────────────┐          │
│  │            REST API Server                      │          │
│  │  /api/sandbox/create  /api/sandbox/status      │          │
│  │  /api/knowledge/process  /api/task/results     │          │
│  └────────────────────────┬───────────────────────┘          │
│                            │                                   │
│  ┌────────────────────────▼───────────────────────┐          │
│  │         Inngest Event Functions                 │          │
│  │  • contex/process.knowledge                     │          │
│  │  • Real-time streaming                          │          │
│  └────────────────────────┬───────────────────────┘          │
│                            │                                   │
│  ┌────────────────────────▼───────────────────────┐          │
│  │         Sandbox Manager (Effect Layer)          │          │
│  │  • Per-user sandbox creation                    │          │
│  │  • Auto-restart on failure                      │          │
│  │  • Status caching (30s TTL)                     │          │
│  └────────────────────────┬───────────────────────┘          │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    Daytona Sandboxes (Docker)                    │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  User Sandbox (isolated container)                    │      │
│  │  • Claude Code CLI pre-installed                      │      │
│  │  • Persistent workspace at /home/contex               │      │
│  │  • Environment variables injected                     │      │
│  │  • File system for knowledge persistence              │      │
│  └──────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

### Key Features

#### 1. **Persistent Sandbox Architecture**
- Each user gets a dedicated Daytona sandbox (Docker container)
- Sandboxes persist across server restarts
- Automatic recovery: stopped sandboxes are detected and restarted
- Pre-configured snapshot with Claude Code v1.0.80 pre-installed
- Environment variables securely injected (API keys, user IDs)

#### 2. **Claude Code Execution Pipeline**
- **Pre-flight checks:** DNS resolution, HTTPS connectivity, API key validation
- **Working directory setup:** Defaults to `/home/contex` with fallback
- **Command execution:** JSON output format with custom system prompts
- **File detection:** Automatic discovery of generated artifacts
- **Result caching:** In-memory cache with LRU eviction (last 100 tasks)

#### 3. **Real-time Event Processing**
- **Event-driven architecture:** All operations flow through Inngest
- **Durable workflows:** Automatic retry and error handling
- **Real-time updates:** WebSocket-based streaming to frontend
- **Progress tracking:** Multi-stage status updates (creating, processing, completed)

#### 4. **Three-Layer Caching**
- **Backend:** In-memory task result cache
- **Frontend:** Zustand with localStorage persistence
- **Sandbox:** File system within Daytona containers

---

## 📁 Repository Structure

```
project-contex/
├── README.md                        # This file
├── ARCHITECTURAL_REVIEW.md          # Comprehensive architecture analysis
├── TESTING-GUIDE.md                # Testing procedures and strategies
├── package.json                    # Root package.json (workspace)
├── Dockerfile                      # Claude Code sandbox image
│
├── frontend/                       # Next.js 15 web application
│   ├── app/                        # App Router pages and components
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Main page (task interface)
│   │   └── _components/            # Page-specific components
│   │       ├── task-form.tsx       # Input form for tasks
│   │       └── task-list.tsx       # Task history display
│   ├── stores/                     # Zustand state management
│   │   └── tasks.ts                # Task store with persistence
│   ├── providers/                  # React context providers
│   │   └── inngest-realtime-provider.tsx
│   ├── package.json
│   └── .env.local                  # Environment variables
│
├── server/                         # Bun backend server
│   ├── src/
│   │   ├── index.ts                # Main server entry point
│   │   ├── services/
│   │   │   ├── inngest.ts          # Inngest event functions
│   │   │   ├── sandbox.ts          # Sandbox orchestration
│   │   │   └── daytona.ts          # Daytona SDK integration
│   │   └── utils/
│   ├── tests/                      # Test suite
│   │   ├── 01-snapshot-test.ts
│   │   ├── 02-claude-execution-test.ts
│   │   ├── 03-session-management-test.ts
│   │   ├── 05-api-endpoint-test.ts
│   │   └── 06-file-detection-test.ts
│   ├── package.json
│   └── .env                        # Environment variables
│
├── ai_docs/                        # Product and technical documentation
│   ├── README.md                   # Documentation index
│   ├── spec.md                     # Product specification
│   ├── developer-context.md        # Developer guide
│   ├── persistent-sandbox-implementation.md
│   ├── api-contract.md
│   └── ...                         # Additional documentation
│
├── infra/                          # Infrastructure configuration
└── node_modules/                   # Shared dependencies
```

---

## 🧪 Testing

### Running Backend Tests

The backend includes a comprehensive test suite covering:
- Snapshot creation
- Claude Code execution
- Session management
- API endpoints
- File detection

```bash
cd server

# Run individual test suites
bun run test:snapshot        # Test sandbox snapshots
bun run test:claude          # Test Claude Code execution
bun run test:session         # Test session management
bun run test:api             # Test API endpoints
bun run test:files           # Test file detection

# Run all tests
bun run test:all
```

### Manual Testing

1. **Backend Health Check:**
   ```bash
   curl http://localhost:8787/api/sandbox/status
   ```

2. **Create Task via API:**
   ```bash
   curl -X POST http://localhost:8787/api/knowledge/process \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "dev-user-001",
       "prompt": "Create a Q4 investor update",
       "mode": "process"
     }'
   ```

3. **Monitor Inngest:**
   - Open http://localhost:8288
   - Check function execution logs
   - Verify event delivery

### Integration Testing

See [TESTING-GUIDE.md](./TESTING-GUIDE.md) for comprehensive testing procedures.

---

## 🔌 API Reference

### REST Endpoints

#### `POST /api/sandbox/create`
Create or retrieve a sandbox for a user.

**Request:**
```json
{
  "userId": "user-123"
}
```

**Response:**
```json
{
  "sandboxId": "ws-abc123",
  "status": "ready"
}
```

#### `GET /api/sandbox/status?userId=user-123`
Check sandbox status for a user.

**Response:**
```json
{
  "sandboxId": "ws-abc123",
  "status": "ready",
  "lastUpdate": "2025-11-11T10:30:00Z"
}
```

#### `POST /api/knowledge/process`
Process a user prompt through Claude Code.

**Request:**
```json
{
  "userId": "user-123",
  "prompt": "Create an investor update",
  "mode": "process"
}
```

**Response:**
```json
{
  "taskId": "task-xyz789",
  "status": "processing"
}
```

#### `GET /api/task/results?taskId=task-xyz789`
Retrieve cached task results.

**Response:**
```json
{
  "taskId": "task-xyz789",
  "status": "completed",
  "output": "...",
  "files": [...]
}
```

### Inngest Events

#### `contex/process.knowledge`
Main event for processing user prompts.

**Event Data:**
```typescript
{
  taskId: string;
  userId: string;
  prompt: string;
  mode: "process" | "ask";
}
```

**Real-time Channels:**
- `task:${taskId}:status` - Status updates
- `task:${taskId}:update` - Progress messages

---

## 🔧 Development

### Code Organization

#### Backend (Effect-Based)

The backend uses Effect for functional programming patterns:

```typescript
// Example: Sandbox creation with Effect
const createSandbox = (userId: string) =>
  Effect.gen(function* () {
    const daytona = yield* DaytonaService;
    const sandbox = yield* daytona.createWorkspace(userId);
    return sandbox;
  });
```

**Key Services:**
- `SandboxManager` - Sandbox lifecycle management
- `ClaudeRunner` - Claude Code execution
- `InngestService` - Event handling

#### Frontend (React + Zustand)

State management with Zustand:

```typescript
// stores/tasks.ts
interface TaskStore {
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  // ...
}
```

**Key Components:**
- `TaskForm` - User input
- `TaskList` - Task history
- `InngestRealtimeProvider` - WebSocket provider

### Development Scripts

#### Backend
```bash
cd server
bun run dev          # Hot reload development
bun run start        # Production mode
bun run typecheck    # Type checking
bun run kill:8787    # Kill process on port 8787
```

#### Frontend
```bash
cd frontend
bun run dev          # Development with Turbopack
bun run build        # Production build
bun run start        # Serve production build
bun run lint         # ESLint
```

---

## 🚀 Deployment

### Production Considerations

1. **Authentication:** Currently uses development user ID. Implement proper auth (OAuth2, JWT) before production.

2. **Database:** System uses in-memory caching. For production, implement:
   - PostgreSQL or MongoDB for persistent task storage
   - Redis for session management and caching

3. **Sandbox Management:**
   - Configure proper Daytona cluster
   - Implement sandbox cleanup policies
   - Add monitoring and alerting

4. **Environment Variables:**
   - Use secrets management (AWS Secrets Manager, Vault)
   - Externalize all configuration
   - Implement proper key rotation

5. **Monitoring:**
   - Add application metrics (Prometheus)
   - Implement logging (CloudWatch, DataDog)
   - Set up error tracking (Sentry)

See [ai_docs/deployment-strategy.md](./ai_docs/deployment-strategy.md) for detailed deployment procedures.

---

## 📚 Documentation

### Core Documentation

- **[ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md)** - Comprehensive architectural analysis and technical debt assessment
- **[TESTING-GUIDE.md](./TESTING-GUIDE.md)** - Testing strategies and procedures
- **[ai_docs/](./ai_docs/)** - Complete product and technical documentation
  - `spec.md` - Product specification and vision
  - `developer-context.md` - Implementation status and patterns
  - `persistent-sandbox-implementation.md` - Workspace persistence details
  - `api-contract.md` - API specifications
  - `inngest-streaming-design.md` - Event architecture

### Quick Links

- [Product Specification](./ai_docs/spec.md)
- [Developer Context](./ai_docs/developer-context.md)
- [API Contract](./ai_docs/api-contract.md)
- [Persistent Sandbox Design](./ai_docs/persistent-sandbox-implementation.md)

---

## 🐛 Troubleshooting

### Common Issues

#### 1. **Backend won't start - Port 8787 already in use**

```bash
cd server
bun run kill:8787
bun run dev
```

#### 2. **Inngest functions not appearing**

- Ensure Inngest dev server is running: `npx inngest-cli@latest dev`
- Check backend is running and connected to Inngest
- Verify `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in frontend `.env.local`

#### 3. **Sandbox creation fails**

- Check Docker is running: `docker ps`
- Verify Daytona is accessible: `curl http://localhost:3986/health`
- Enable dev mode in backend `.env`: `DEV_MODE=true` (uses in-memory stub)

#### 4. **Frontend can't connect to backend**

- Verify backend is running on http://localhost:8787
- Check CORS settings in `server/src/index.ts`
- Ensure `NEXT_PUBLIC_API_URL` is set correctly in frontend

#### 5. **Real-time updates not working**

- Check Inngest dev server is running
- Verify WebSocket connection in browser DevTools
- Check Inngest Realtime provider in frontend

### Debug Mode

Enable verbose logging:

```bash
# Backend
DEBUG=* bun run dev

# Frontend
NEXT_PUBLIC_DEBUG=true bun run dev
```

---

## 🤝 Contributing

### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test thoroughly
3. Run type checking: `cd server && bun run typecheck`
4. Run tests: `cd server && bun run test:all`
5. Commit with descriptive messages
6. Open a pull request

### Code Style

- **TypeScript:** Strict mode enabled
- **Effect:** Use Effect for error handling and side effects
- **Formatting:** Handled by Prettier (TODO: add config)
- **Linting:** ESLint with Next.js recommended rules

---

## 📄 License

See [LICENSE.md](./LICENSE.md) for details.

---

## 🔗 Related Resources

- [Bun Documentation](https://bun.sh/docs)
- [Effect Documentation](https://effect.website)
- [Inngest Documentation](https://www.inngest.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Daytona SDK](https://github.com/daytonaio/sdk)
- [Claude Code CLI](https://docs.anthropic.com/claude/docs)

---

## 📧 Support

For questions or issues:
1. Check the [troubleshooting section](#-troubleshooting)
2. Review documentation in [ai_docs/](./ai_docs/)
3. Open an issue in the repository

---

**Built with 💙 using Bun, Effect, Next.js, and Claude Code**
