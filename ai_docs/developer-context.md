# Project Omni Developer Context

## Executive Summary

**Project Omni** is an AI-powered tool that transforms founder "brain dumps" into professional investor-ready materials (updates, memos, fundraising documents) in minutes. The system uses Claude Code running in isolated Daytona sandboxes to process unstructured founder thoughts into structured business intelligence and polished deliverables.

**Current Status**: MVP Day 2+ Major Progress - Core integration working, end-to-end Claude processing verified  
**Timeline**: 3-day MVP sprint for design partner testing  
**Last Updated**: August 15, 2025

---

## Business Context & Value Proposition

### Problem
Founders spend precious hours writing investor updates and memos that determine their company's future. They need to convert scattered thoughts about metrics, challenges, wins, and strategic plans into investor-grade documents that actually close deals.

### Solution
**"From founder brain dump to investor-ready materials that close deals"**
- Input: Unstructured founder thoughts via web interface
- Processing: Claude Code + structured "knowledge as code" filesystem  
- Output: Professional investor materials (updates, memos, pitch narratives)

### Success Metrics
- Time from brain dump to investor-ready material: <2 minutes
- Fundraising success rate improvement vs. manual approach
- Material usage rate (founders actually send the output)
- Deal velocity improvement for fundraising users

---

## Technical Architecture

### Three-Tier System

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Frontend      │    │     Backend      │    │    Processing       │
│   (Next.js)     │◄──►│  (Bun + Effect)  │◄──►│  (Claude + Daytona) │
│                 │    │                  │    │                     │
│ • React UI      │    │ • REST API       │    │ • Claude Code 1.0.80│
│ • Inngest Jobs  │    │ • Inngest Funcs  │    │ • Isolated Sandboxes│
│ • Real-time UI  │    │ • Sandbox Mgmt   │    │ • Knowledge Files   │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
       ▲                                                     
       │                                                     
       └─────────── Inngest Real-time Channels ─────────────┘
```

### Core Components

1. **Frontend** (`/frontend/`)
   - **Technology**: Next.js 15.3.3 + React 19 + TypeScript
   - **State**: Zustand with persistence
   - **Jobs**: Inngest for durability and real-time streaming
   - **Styling**: TailwindCSS + Radix UI components
   - **Adapted from**: VibeKit codex-clone template

2. **Backend** (`/server/`)
   - **Runtime**: Bun with TypeScript + Effect for async composition
   - **APIs**: REST endpoints + Inngest function orchestration
   - **Sandboxes**: Daytona SDK integration for container orchestration
   - **Processing**: Claude Code execution via Inngest functions in isolated environments

3. **Processing Layer**
   - **Environment**: Daytona sandboxes with pre-installed Claude Code 1.0.80
   - **Safety**: VibeKit wrapper for secure AI execution with data redaction
   - **Knowledge**: Structured filesystem acting as "working memory"
   - **Output**: Investor-grade documents and structured intelligence

---

## Current Implementation Status

### ✅ Completed (Day 1 - Foundation)

**Frontend Foundation**:
- ✅ Copied and adapted VibeKit codex-clone template
- ✅ Removed all VibeKit SDK dependencies (`@vibe-kit/sdk`)
- ✅ Created comprehensive Omni API client (`lib/omni-api.ts`)
- ✅ Updated environment configuration for Project Omni
- ✅ Fixed all TypeScript compilation errors
- ✅ Development server running successfully

**Backend Ready**:
- ✅ Bun server with REST API (`/api/sandbox/*`, `/api/knowledge/*`)
- ✅ Inngest function orchestration for Claude processing
- ✅ Real-time streaming via Inngest channels
- ✅ Daytona sandbox orchestration working
- ✅ Claude Code integration tested and verified
- ✅ Docker container with structured knowledge filesystem

**Documentation**:
- ✅ Complete MVP implementation plan
- ✅ Progress tracking system
- ✅ API contracts and specifications

### ✅ Completed (Day 2 - Core Integration)

**MVP Core Integration Achieved**:
- ✅ Connect frontend to backend APIs via Inngest (replaced stub client)
- ✅ Implement real-time streaming via Inngest channels (replaced WebSocket)
- ✅ End-to-end testing with real Claude processing (verified with math operations)
- ✅ Full Inngest function architecture for job durability and retry logic
- ✅ Comprehensive error handling and logging for debugging

**Still In Progress**:
- [ ] Modify task form for founder-specific input patterns
- [ ] Update UI for investor materials display

### 📋 Planned (Day 3 - Polish & Testing)

**Design Partner Ready**:
- [ ] Error handling and edge cases
- [ ] UI messaging for founder context
- [ ] Real founder scenario testing
- [ ] Deploy to staging environment

---

## Repository Structure

```
project-omni/
├── frontend/                    # Next.js web application
│   ├── app/                     # Next.js App Router
│   │   ├── _components/         # Shared UI components
│   │   │   ├── task-form.tsx    # Main input form (needs founder customization)
│   │   │   └── task-list.tsx    # Task management UI
│   │   ├── actions/             # Server actions
│   │   │   └── inngest.ts       # Inngest job orchestration
│   │   ├── api/                 # API routes
│   │   │   └── inngest/         # Inngest webhook endpoint
│   │   └── task/[id]/           # Task detail pages
│   │       └── _components/     # Task-specific UI
│   ├── components/              # Reusable UI components
│   │   ├── ui/                  # Shadcn/UI components
│   │   └── *.tsx               # Custom components
│   ├── lib/                     # Core utilities and clients
│   │   ├── omni-api.ts         # 🔑 PROJECT OMNI API CLIENT
│   │   ├── inngest.ts          # Inngest configuration and functions
│   │   └── utils.ts            # Utility functions
│   ├── stores/                  # Zustand state management
│   │   ├── tasks.ts            # Task state (main entity)
│   │   └── environments.ts     # Legacy (not needed for Omni)
│   ├── .env.local              # Environment variables (git ignored)
│   ├── .env.example            # Environment template
│   └── package.json            # Dependencies and scripts
│
├── server/                     # Bun backend server
│   ├── src/
│   │   ├── index.ts           # 🔑 MAIN SERVER FILE
│   │   └── services/
│   │       ├── config.ts      # Environment configuration
│   │       ├── daytona.ts     # Daytona SDK integration
│   │       ├── sandbox.ts     # Sandbox management logic
│   │       └── ws.ts          # WebSocket streaming
│   ├── tests/                 # Integration tests
│   ├── package.json           # Server dependencies
│   └── bun.lock              # Lock file
│
├── vibekit/                   # Safety layer for AI execution
│   ├── templates/codex-clone/ # Original template (reference)
│   ├── docs/                  # VibeKit documentation
│   └── packages/              # VibeKit SDK packages
│
├── ai_docs/                   # Project documentation
│   ├── spec.md               # 🔑 PRODUCT SPECIFICATION
│   ├── mvp-implementation-plan.md  # 🔑 TECHNICAL PLAN
│   ├── mvp-progress-tracker.md     # 🔑 CURRENT STATUS
│   ├── developer-context.md        # 🔑 THIS DOCUMENT
│   └── *.md                   # Additional specs and guides
│
├── Dockerfile                 # Claude Code sandbox container
└── README.md                 # Project overview
```

### 🔑 Key Files for New Developers

**Critical Files to Understand**:
1. `/ai_docs/spec.md` - Product specification and business requirements
2. `/frontend/lib/omni-api.ts` - API client (replaces VibeKit SDK)
3. `/server/src/index.ts` - Main server with API endpoints
4. `/frontend/app/_components/task-form.tsx` - Main UI entry point
5. `/ai_docs/mvp-implementation-plan.md` - Complete technical plan

**Configuration Files**:
- `/frontend/.env.local` - Frontend environment variables
- `/server/.env` - Backend environment variables (if exists)
- `/Dockerfile` - Claude Code sandbox configuration

---

## Development Environment Setup

### Prerequisites
- **Node.js**: 18+ (for frontend)
- **Bun**: Latest version (for backend)
- **Docker**: For Daytona sandbox containers
- **Git**: Version control
- **Claude API Key**: For AI processing

### Quick Start

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd project-omni
   ```

2. **Backend Setup**
   ```bash
   cd server
   bun install
   # Configure environment variables (see Configuration section)
   bun run dev  # Runs on http://localhost:8787
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   # Copy and configure .env.local (see Configuration section)
   npm run dev  # Runs on http://localhost:3001
   ```

4. **Verify Build**
   ```bash
   # Frontend type checking
   cd frontend && npx tsc --noEmit
   
   # Backend tests (optional)
   cd server && bun run test:all
   ```

### Configuration

**Frontend Environment** (`.env.local`):
```bash
# Project Omni Backend URLs
NEXT_PUBLIC_OMNI_API_URL=http://localhost:8787
NEXT_PUBLIC_OMNI_WS_URL=ws://localhost:8787/ws

# Inngest Configuration
INNGEST_EVENT_KEY=your-inngest-event-key-here
INNGEST_SIGNING_KEY=your-inngest-signing-key-here

# Development user ID (for testing without auth)
NEXT_PUBLIC_DEV_USER_ID=dev-user-001
```

**Backend Environment** (server needs):
```bash
# Daytona Configuration (if using real Daytona)
DAYTONA_API_URL=your-daytona-url
DAYTONA_API_KEY=your-daytona-key

# Claude API Key
ANTHROPIC_API_KEY=your-claude-api-key

# Server Configuration
PORT=8787
JWT_SECRET=your-jwt-secret  # For production
```

---

## API Contracts & Data Flow

### REST API Endpoints

**Backend Server** (`http://localhost:8787`):

```typescript
// Sandbox Management
POST /api/sandbox/create
Body: { userId: string }
Response: { sandboxId: string, status: string }

GET /api/sandbox/status?id={sandboxId}
Response: { sandboxId: string, status: string, createdAt: number }

// Knowledge Processing
POST /api/knowledge/process  
Body: { 
  input: string,           // Founder brain dump
  sandboxId: string, 
  userId: string,
  model?: string           // Claude model (default: "sonnet")
}
Response: { jobId: string, accepted: boolean }

// Knowledge Query (future)
GET /api/knowledge/query?userId={userId}&query={query}
Response: { entities: [], tasks: [], patterns: [] }
```

**WebSocket Streaming** (`ws://localhost:8787/ws`):

```typescript
// Connection
ws://localhost:8787/ws?userId={userId}  // Development
// Production: Authorization: Bearer {jwt-token}

// Message Types
{
  type: "log",
  userId: string,
  sandboxId: string, 
  jobId: string,
  data: string              // Real-time processing logs
}

{
  type: "result", 
  userId: string,
  sandboxId: string,
  jobId: string,
  format: "text" | "json",
  data: string              // Final output/deliverables
}

{
  type: "error",
  userId: string, 
  sandboxId: string,
  jobId: string,
  code: string,
  message: string
}

{
  type: "done",
  userId: string,
  sandboxId: string, 
  jobId: string,
  exitCode: number
}
```

### Data Models

**Task (Frontend)**:
```typescript
interface Task {
  id: string
  title: string                    // User input summary
  mode: "code" | "ask"            // "code" = process, "ask" = query
  status: "IN_PROGRESS" | "DONE" | "MERGED"
  messages: Message[]             // Chat-like interface
  sessionId: string               // Maps to sandboxId
  createdAt: string
  updatedAt: string
  isArchived: boolean
}
```

**Sandbox (Backend)**:
```typescript
interface Sandbox {
  id: string
  userId: string  
  status: "creating" | "ready" | "stopped" | "error"
  createdAt: number
}
```

### Data Flow

```
1. User Input (Founder brain dump)
   ↓
2. Frontend → createTask() → Inngest Job
   ↓  
3. Inngest → ensureSandbox() → Omni API
   ↓
4. Backend → createSandbox() or reuseSandbox()
   ↓
5. Backend → processKnowledge() → Claude Code in Sandbox
   ↓
6. WebSocket → Real-time streaming to Frontend
   ↓ 
7. Results → Structured knowledge + investor deliverables
```

---

## Key Technologies & Dependencies

### Frontend Stack
- **Framework**: Next.js 15.3.3 with App Router
- **React**: 19.0.0 with TypeScript
- **State**: Zustand 5.0.5 with persistence middleware
- **Jobs**: Inngest 3.39.1 + @inngest/realtime 0.3.1
- **UI**: TailwindCSS 4 + Radix UI components
- **Forms**: Custom form handling (no external form library)
- **HTTP**: Fetch API (native)

**Key Dependencies**:
```json
{
  "@inngest/realtime": "^0.3.1",
  "inngest": "^3.39.1", 
  "zustand": "^5.0.5",
  "next": "15.3.3",
  "react": "^19.0.0"
}
```

### Backend Stack  
- **Runtime**: Bun (JavaScript runtime + package manager)
- **Framework**: Custom server with Effect 3.5.4 for async composition
- **Sandboxes**: @daytonaio/sdk 0.25.5
- **Schema**: @effect/schema 0.68.2
- **Environment**: dotenv 16.4.5

**Key Dependencies**:
```json
{
  "@daytonaio/sdk": "0.25.5",
  "@effect/schema": "^0.68.2", 
  "effect": "^3.5.4",
  "dotenv": "^16.4.5"
}
```

### Processing Stack
- **AI**: Claude Code CLI 1.0.80 (pre-installed in sandbox)
- **Safety**: VibeKit wrapper for secure execution
- **Containers**: Docker + Daytona for isolation
- **Knowledge**: Structured filesystem as working memory

---

## Development Workflow

### Feature Development Process

1. **Planning**: Update `/ai_docs/mvp-progress-tracker.md`
2. **Implementation**: Follow TDD where possible
3. **Testing**: Manual testing + automated tests
4. **Documentation**: Update relevant docs
5. **Commit**: Descriptive commit messages with Claude Code attribution

### Code Organization Principles

**Frontend**:
- **Components**: Reusable UI in `/components/ui/`
- **Business Logic**: Custom components in `/app/_components/`
- **API Calls**: Centralized in `/lib/omni-api.ts`
- **State**: Domain-specific stores in `/stores/`
- **Types**: Co-located with implementation files

**Backend**:
- **Services**: Modular services in `/src/services/`
- **Routes**: RESTful API routes in main server file  
- **Config**: Environment configuration centralized
- **Tests**: Integration tests in `/tests/`

### Key Conventions

**File Naming**:
- React components: `PascalCase.tsx`
- Utilities: `kebab-case.ts`
- API routes: `route.ts` (Next.js App Router)

**Git Workflow**:
- **Main branch**: Production-ready code
- **Feature branches**: Not implemented yet (single developer)
- **Commit format**: Descriptive with Claude Code attribution

**Environment Management**:
- **Development**: `.env.local` (git ignored)
- **Production**: Environment variables via deployment platform
- **Staging**: Separate environment configuration

---

## Testing Strategy

### Current Testing Status
- **Backend**: Integration tests available (`/server/tests/`)
- **Frontend**: No tests implemented yet (manual testing only)
- **E2E**: Manual testing workflow established

### Testing Commands

**Backend Tests**:
```bash
cd server
bun run test:snapshot    # Snapshot creation test
bun run test:claude     # Claude execution test  
bun run test:session    # Session management test
bun run test:api        # API endpoint test
bun run test:all        # Run all tests
```

**Frontend Tests** (planned):
```bash
cd frontend
npm run test            # Jest + React Testing Library (not implemented)
npm run test:e2e        # Playwright E2E tests (not implemented)
```

### Manual Testing Workflow

**Full Stack Testing**:
1. Start backend: `cd server && bun run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Test task creation flow
4. Verify WebSocket streaming
5. Check Claude Code execution in sandbox

**Test Scenarios**:
- Founder brain dump input → investor update generation
- Ask mode queries → knowledge base responses
- Error handling → graceful degradation
- Real-time streaming → UI updates

---

## Deployment & Operations

### Current Deployment Status
- **Development**: Local development servers
- **Staging**: Not implemented yet  
- **Production**: Not implemented yet

### Deployment Architecture (Planned)

**Frontend**:
- **Platform**: Vercel or Netlify (static deployment)
- **Build**: Next.js static export or server-side rendering
- **Environment**: Production environment variables
- **Domain**: Custom domain for design partner testing

**Backend**: 
- **Platform**: Railway, Fly.io, or cloud VPS
- **Container**: Docker deployment
- **Database**: File-based (sandboxes) or lightweight DB
- **Monitoring**: Basic logging and health checks

**Sandboxes**:
- **Daytona Cloud**: Production Daytona instance
- **Docker**: Pre-built images with Claude Code
- **Scaling**: On-demand sandbox creation

### Environment Configuration

**Production Environment Variables**:
```bash
# Frontend
NEXT_PUBLIC_OMNI_API_URL=https://api.projectomni.com
NEXT_PUBLIC_OMNI_WS_URL=wss://api.projectomni.com/ws
INNGEST_EVENT_KEY=prod-event-key
INNGEST_SIGNING_KEY=prod-signing-key

# Backend  
DAYTONA_API_URL=https://daytona.projectomni.com
DAYTONA_API_KEY=prod-daytona-key
ANTHROPIC_API_KEY=prod-claude-key
JWT_SECRET=prod-jwt-secret
NODE_ENV=production
PORT=8787
```

---

## Known Issues & Gotchas

### Current Known Issues

1. **No Authentication System**
   - **Issue**: Using development user ID for testing
   - **Impact**: Not suitable for multi-user production
   - **Workaround**: Single user testing, JWT implementation planned

2. **No Error Boundaries**
   - **Issue**: Frontend lacks comprehensive error handling
   - **Impact**: Poor user experience on errors
   - **Planning**: Error boundaries and toast notifications needed

3. **UI Not Customized for Founders**
   - **Issue**: Still uses VibeKit codex-clone UI patterns
   - **Impact**: Generic developer interface instead of founder-specific experience
   - **Next**: Customize task forms and messaging for founder brain dumps

### Important Gotchas

**Environment Variables**:
- Frontend: Use `NEXT_PUBLIC_` prefix for client-side variables
- Backend: Bun automatically loads `.env` files
- Docker: Environment variables must be passed to containers

**Claude Code Execution**:
- **Tool Restrictions**: Sandbox has restricted tool permissions (see Dockerfile)
- **Working Directory**: `/home/daytona/workspace` or `/workspace` (fallback logic)
- **API Key**: Must be available as `ANTHROPIC_API_KEY` in sandbox environment

**Inngest Integration**:
- **Event Names**: Must match between frontend and backend
- **Payload Types**: TypeScript interfaces must be consistent
- **Development**: Requires Inngest dev server for local testing

**Daytona Sandboxes**:
- **Single User Model**: One sandbox per user with automatic reuse
- **Lifecycle**: Sandboxes may be paused/resumed automatically
- **Status Polling**: Frontend should poll sandbox status before processing

---

## Next Steps & Roadmap

### Immediate Next Steps (Day 2)

**Priority 1: Core Integration**
1. **Replace API Stubs**: Implement real API calls in `omni-api.ts`
2. **WebSocket Client**: Create real-time streaming connection
3. **Task Form Updates**: Customize for founder brain dumps vs code tasks
4. **Message Protocol**: Map backend WebSocket messages to frontend UI
5. **End-to-End Testing**: Verify full processing pipeline

**Priority 2: UI Customization**
1. **Founder-Specific Language**: Update placeholders and messaging
2. **Investor Materials Display**: Show generated updates/memos
3. **Processing States**: Better visual feedback during Claude processing
4. **Error Handling**: Graceful error states and recovery

### Short-term Roadmap (Week 2-3)

**User Experience**:
- Authentication system (JWT-based)
- Mobile-responsive design improvements  
- Onboarding flow for new founders
- Export functionality for generated materials

**Technical Improvements**:
- Comprehensive error boundaries and logging
- Performance optimization for large documents
- Background job monitoring and retry logic
- Basic analytics and usage tracking

### Medium-term Roadmap (Month 2)

**Product Features**:
- Multi-document upload and context building
- Integration with founder tools (email, calendar, CRM)
- Team collaboration (multiple users per company)
- Investor portal for sharing materials

**Technical Platform**:
- Production deployment pipeline
- Monitoring and observability stack
- Backup and disaster recovery
- Security audit and hardening

---

## Development Best Practices

### Code Quality Standards

**TypeScript**:
- Strict mode enabled
- Explicit return types for functions
- Interface definitions for all API contracts
- No `any` types without justification

**React/Next.js**:
- Functional components with hooks
- Custom hooks for reusable logic
- Proper dependency arrays in useEffect
- Server components where appropriate

**Backend**:
- Effect-style async composition
- Proper error handling with Result types
- Input validation with schema libraries
- Structured logging

### Security Considerations

**Data Handling**:
- No sensitive data in client-side code
- API keys stored securely in environment variables
- User input sanitization and validation
- Secure WebSocket connections (WSS in production)

**AI Safety**:
- VibeKit wrapper for secure Claude execution
- Restricted tool permissions in sandboxes
- Data redaction for sensitive information
- Isolated execution environments per user

---

## Troubleshooting Guide

### Common Issues

**Build Errors**:
```bash
# Frontend TypeScript errors
cd frontend && npx tsc --noEmit

# Backend compilation errors  
cd server && bun run typecheck
```

**Environment Issues**:
```bash
# Check environment variables are loaded
cd frontend && npm run dev  # Should show env vars in console
cd server && bun run dev    # Should show config loading
```

**Dependency Issues**:
```bash
# Clean install frontend
cd frontend && rm -rf node_modules package-lock.json && npm install

# Clean install backend
cd server && rm -rf node_modules bun.lock && bun install
```

**Development Server Issues**:
```bash
# Kill processes on ports
lsof -ti:3001 | xargs kill  # Frontend
lsof -ti:8787 | xargs kill  # Backend
```

### Debug Mode

**Frontend Debug**:
- Open browser dev tools
- Check Network tab for API calls
- Monitor WebSocket connections
- Review React dev tools

**Backend Debug**:
- Enable verbose logging in config
- Use Bun's built-in debugger
- Monitor WebSocket connections
- Check sandbox logs via Daytona

---

## Reference Links & Resources

### Project Documentation
- **Product Spec**: `/ai_docs/spec.md`
- **Implementation Plan**: `/ai_docs/mvp-implementation-plan.md`
- **Progress Tracking**: `/ai_docs/mvp-progress-tracker.md`
- **API Contracts**: `/ai_docs/api-contract.md`

### External Documentation
- **Claude Code**: [Official Documentation](https://docs.anthropic.com/en/docs/claude-code)
- **Daytona SDK**: [GitHub Repository](https://github.com/daytonaio/sdk)
- **VibeKit**: Local documentation in `/vibekit/docs/`
- **Inngest**: [Official Documentation](https://www.inngest.com/docs)
- **Next.js**: [Official Documentation](https://nextjs.org/docs)
- **Bun**: [Official Documentation](https://bun.sh/docs)

### Development Resources
- **Git Repository**: Current working directory
- **Issue Tracking**: GitHub Issues (when repository is pushed)
- **Design Resources**: TBD (design partner feedback)
- **Testing Data**: Sample founder inputs in `/ai_docs/`

---

## Contact & Support

**Project Lead**: Available for questions and clarifications
**Documentation**: This file and `/ai_docs/` directory  
**Code Review**: Follow established Git workflow
**Bug Reports**: Document in progress tracker or create GitHub issues

---

*Last Updated: August 15, 2025 - Day 2 Core Integration Complete*  
*Next Update: After Day 3 UI Polish & Testing*