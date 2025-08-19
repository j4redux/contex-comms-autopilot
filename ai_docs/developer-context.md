# Project Omni Developer Context

## Executive Summary

**Project Omni** is an AI-powered tool that transforms founder "brain dumps" into professional investor-ready materials (updates, memos, fundraising documents) in minutes. The system uses Claude Code running in isolated Daytona sandboxes to process unstructured founder thoughts into structured business intelligence and polished deliverables.

**Current Status**: MVP Day 2+ COMPLETE - Pure Inngest event-driven architecture implemented and verified  
**Timeline**: 3-day MVP sprint for design partner testing  
**Last Updated**: August 19, 2025 - Scrolling bug fixed in task detail page

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

### Pure Event-Driven Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Frontend      │    │     Backend      │    │    Processing       │
│   (Next.js)     │◄──►│  (Bun + Effect)  │◄──►│  (Claude + Daytona) │
│                 │    │                  │    │                     │
│ • React UI      │    │ • Inngest Funcs  │    │ • Claude Code 1.0.80│
│ • Inngest Events│    │ • createTask     │    │ • Isolated Sandboxes│
│ • Real-time UI  │    │ • processKnowledge│    │ • Knowledge Files   │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
       ▲                                                     
       │                                                     
       └─────────── Inngest Real-time Channels ─────────────┘

Event Flow: Frontend → "omni/create.task" → createTask → "omni/process.knowledge" → processKnowledge
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
   - **Architecture**: Pure Inngest event-driven functions (no REST APIs for processing)
   - **Functions**: `createTask` + `processKnowledge` with real-time streaming
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

### ✅ Completed (Day 2+ - Architecture Fixed)

**CRITICAL ARCHITECTURE CORRECTION**:
- ✅ **Fixed event-driven flow**: Frontend sends `"omni/create.task"` events
- ✅ **Added missing createTask function**: Handles frontend task creation events
- ✅ **Proper function chaining**: createTask → `"omni/process.knowledge"` → processKnowledge
- ✅ **Verified 2-function registration**: Both functions registered and operational
- ✅ **End-to-end event flow working**: Task creation through Claude processing

**MVP Core Integration Achieved**:
- ✅ Pure Inngest event-driven architecture (no REST API calls for processing)
- ✅ Real-time streaming via Inngest channels with `taskChannel().update()`
- ✅ Task correlation via `taskId` across the entire pipeline
- ✅ End-to-end testing with real Claude processing (verified with math operations)
- ✅ Full Inngest function architecture for job durability and retry logic
- ✅ Comprehensive error handling and logging for debugging

**Real-Time File Detection System (✅ FULLY COMPLETE - August 19, 2025)**:
- ✅ **File Creation**: Claude Code Write tool creating files successfully in sandbox
- ✅ **Real-time Detection**: Shell-based detection using find/stat/head commands
- ✅ **Message Publishing**: `file_created` and `file_content` messages sent to frontend
- ✅ **Path Resolution**: Direct access to Claude's /home/omni working directory
- ✅ **Permissions**: Fixed Claude Code permissions structure for non-interactive operation
- ✅ **Frontend Display**: Tabbed file view in right panel fully implemented
- ✅ **Message Handling**: Global InngestRealtimeProvider handling all file messages
- ✅ **End-to-End Verification**: Complete system tested and working in production

**Critical Architecture Note**: All Inngest messages MUST be handled in the global `InngestRealtimeProvider`. Never create additional `useInngestSubscription` hooks - they will not receive messages due to subscription conflicts.

**Still In Progress**:
- [ ] Modify task form for founder-specific input patterns
- [ ] Update UI messaging for investor materials context

### 📋 Planned (Day 3 - Polish & Testing)

**Design Partner Ready**:
- [x] File detection and display system
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
│   │   │   ├── task-form.tsx    # Main input form (sends Inngest events)
│   │   │   └── task-list.tsx    # Task management UI
│   │   ├── actions/             # Server actions
│   │   │   └── inngest.ts       # 🔑 INNGEST EVENT SENDER (createTaskAction)
│   │   ├── api/                 # API routes
│   │   │   └── inngest/         # Inngest webhook endpoint
│   │   └── task/[id]/           # Task detail pages
│   │       └── _components/     # Task-specific UI
│   ├── components/              # Reusable UI components
│   │   ├── ui/                  # Shadcn/UI components
│   │   └── *.tsx               # Custom components
│   ├── lib/                     # Core utilities and clients
│   │   ├── inngest.ts          # 🔑 INNGEST CLIENT (sends events)
│   │   └── utils.ts            # Utility functions
│   ├── stores/                  # Zustand state management
│   │   ├── tasks.ts            # Task state (main entity)
│   │   └── [REMOVED]           # environments.ts deleted (not needed)
│   ├── .env.local              # Environment variables (git ignored)
│   ├── .env.example            # Environment template
│   └── package.json            # Dependencies and scripts
│
├── server/                     # Bun backend server
│   ├── src/
│   │   ├── index.ts           # 🔑 MAIN SERVER FILE
│   │   ├── api/
│   │   │   └── inngest.ts     # 🔑 INNGEST FUNCTION REGISTRATION
│   │   └── services/
│   │       ├── config.ts      # Environment configuration
│   │       ├── daytona.ts     # Daytona SDK integration
│   │       ├── sandbox.ts     # Sandbox management logic
│   │       └── inngest.ts     # 🔑 INNGEST FUNCTIONS (createTask + processKnowledge)
│   ├── scripts/               # Testing scripts
│   │   └── e2e-inngest-process.ts  # E2E test for Inngest architecture
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
2. `/server/src/services/inngest.ts` - **Core backend logic** (createTask + processKnowledge functions)
3. `/frontend/app/actions/inngest.ts` - **Frontend event sender** (createTaskAction)
4. `/server/src/api/inngest.ts` - **Function registration** (serves Inngest functions)
5. `/frontend/app/_components/task-form.tsx` - Main UI entry point
6. `/ai_docs/mvp-implementation-plan.md` - Complete technical plan

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
# Inngest Configuration (core event system)
INNGEST_EVENT_KEY=your-inngest-event-key-here
INNGEST_SIGNING_KEY=your-inngest-signing-key-here

# Development user ID (for testing without auth)
NEXT_PUBLIC_DEV_USER_ID=dev-user-001

# NOTE: No WebSocket URLs - pure Inngest architecture
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

### Inngest Event API

**Event-Driven Architecture** (Pure Inngest):

```typescript
// Task Creation Event (Frontend → Backend)
Event: "omni/create.task"
Data: {
  task: Task,              // Complete task object with ID
  userId: string,          // User identifier
  prompt: string           // Founder brain dump input
}
Triggers: createTask function

// Knowledge Processing Event (Internal)
Event: "omni/process.knowledge"
Data: {
  taskId: string,          // Task correlation ID
  sandboxId: string,       // Daytona sandbox identifier
  userId: string,          // User identifier
  input: string,           // Processing input
  model: string,           // Claude model ("sonnet")
  jobId: string            // Job correlation ID
}
Triggers: processKnowledge function

// Real-time Updates (Backend → Frontend)
Channel: taskChannel()
Topics: 
  - update(taskId, message)  // Processing logs and results
  - status(taskId, status)   // Task status changes
```

**Inngest Real-time Channels** (No WebSocket):

```typescript
// Channel Definition
const taskChannel = channel("tasks")
  .addTopic(topic("status").type<{
    taskId: string;
    status: "IN_PROGRESS" | "DONE" | "MERGED";
    sessionId: string;
  }>())
  .addTopic(topic("update").type<{
    taskId: string;
    message: Record<string, unknown>;
  }>())

// Message Types (via publish to channels)
{
  type: "log",
  data: string,             // Real-time processing logs
  jobId: string,
  ts: number
}

{
  type: "result", 
  format: "text",
  data: string,             // Final output/deliverables
  jobId: string,
  ts: number
}

{
  type: "error",
  code: string,
  message: string,
  jobId: string,
  ts: number
}

{
  type: "done",
  exitCode: number,
  jobId: string,
  ts: number
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
2. Frontend → inngest.send("omni/create.task")
   ↓  
3. Backend → createTask function receives event
   ↓
4. createTask → createSandbox() (ensure sandbox ready)
   ↓
5. createTask → inngest.send("omni/process.knowledge")
   ↓
6. Backend → processKnowledge function receives event
   ↓
7. processKnowledge → Claude Code execution in sandbox
   ↓
8. processKnowledge → publish to taskChannel().update()
   ↓
9. Frontend → Real-time updates via Inngest channels
   ↓ 
10. Results → Structured knowledge + investor deliverables
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

### Resolved Issues (Important Learnings)

#### Task Detail Page Scrolling Bug (Fixed: August 19, 2025)

**Problem**: Right panel file content area was not scrollable when content exceeded viewport height. Users could not scroll to see content below the "Modified:" divider line.

**Root Cause**: Height constraints were not properly propagating through the nested component hierarchy. The combination of flex layouts, Tabs components, and nested containers broke the scrolling context.

**Solution**: Used CSS Grid with explicit height constraints instead of relying on flex chain:
- Changed Tabs component from `flex flex-col` to `grid grid-rows-[auto_1fr]`
- Updated TabsContent wrapper to use `overflow-hidden` with `h-full`
- Modified FileContentRenderer to use `grid grid-rows-[auto_1fr]` layout
- Ensured scrollable content area has explicit overflow-y-auto

**Key Files Modified**:
- `frontend/app/task/[id]/client-page.tsx:288-310` - Main layout structure
- `frontend/app/task/[id]/_components/file-content-renderer.tsx:76-94` - Content renderer

**Lessons Learned**:
1. **CSS Grid is more reliable for explicit height constraints** than flex when dealing with scrollable areas
2. **The `h-0` trick** (`flex-1 h-0 overflow-y-auto`) can fix some flex scrolling issues but not all
3. **Every container in the chain** must properly constrain height - one broken link breaks scrolling
4. **Avoid `overflow-hidden` on parent containers** of scrollable areas - it breaks the scroll context
5. **Tabs components can interfere** with height propagation - may need special handling

### Important Gotchas

**Layout & Scrolling**:
- When creating scrollable areas in nested layouts, prefer CSS Grid over Flexbox for explicit height control
- Use `grid-template-rows: auto 1fr` pattern for header + scrollable content layouts
- Always test scrolling with content that exceeds viewport height
- Check that height constraints propagate through entire component hierarchy
- Be careful with third-party components (like Radix UI Tabs) that may not preserve height constraints

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

**UI Layout & Scrolling**:
- Use CSS Grid (`grid grid-rows-[auto_1fr]`) for layouts with fixed header + scrollable content
- Avoid deeply nested flex containers when implementing scrollable areas
- Test all scrollable areas with content that exceeds viewport height
- Document component hierarchy when implementing complex nested layouts
- Use browser DevTools to inspect computed heights and overflow properties
- When using third-party UI components (Tabs, Accordions, etc.), verify they preserve height constraints
- Common pattern for scrollable content:
  ```jsx
  <div className="h-full grid grid-rows-[auto_1fr]">
    <div className="header-content">Fixed Header</div>
    <div className="overflow-y-auto">Scrollable Content</div>
  </div>
  ```

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
- Check Network tab for Inngest webhook calls
- Monitor Inngest dashboard at http://localhost:8288
- Review React dev tools and state management

**Backend Debug**:
- Enable verbose logging in config
- Use Bun's built-in debugger
- Monitor Inngest function execution
- Check server logs for function registration (should show 2 functions)
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

*Last Updated: August 19, 2025 - File Detection System Complete & Scrolling Bug Fixed*  
*Next Update: After founder-specific UI customization*