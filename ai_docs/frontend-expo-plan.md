# Frontend (Expo) Plan — Project Omni

Plan to scaffold and connect the mobile client.

---

## Stack
- Expo Router
- Zustand (state)
- TanStack Query (network/cache)
- NativeWind (styling)

## Directory Structure (proposed)
```
app/
  _layout.tsx
  (tabs)/
    index.tsx            # Dashboard
    sandbox.tsx          # Create/status controls, live logs
    process.tsx          # Input → process, stream display
    query.tsx            # Results (future)
lib/
  api.ts                 # REST client
  inngest-client.ts      # Inngest real-time client
  store.ts               # Zustand stores
  types.ts               # Shared types matching API contract
  theme.ts               # Design tokens
```

## Data Flow
- Mutations: TanStack Query → REST endpoints
- Streaming: Inngest real-time client → dispatch to store by `taskId`
- Query keys: `['sandbox', id]`, `['task', taskId]`, `['results', userId]`

## Screens (MVP)
- Dashboard: recent jobs; button to create sandbox
- Sandbox: create/status + live log pane (subscribe by sandboxId/userId)
- Process: textarea input; submit to `/api/knowledge/process`; stream live output
- Query: read from backend once `/api/knowledge/query` is implemented

## Error Handling
- Global error boundary; toast notifications
- Inngest channel reconnect/backoff with visual state

## Theming & UX
- NativeWind with a simple token set (colors/spacing/typography)
- Accessible touch targets and focus styles

## Security
- Once JWT exists: attach token to REST and Inngest channel subscriptions

## Testing
- Unit: component tests with React Testing Library
- E2E: app-level flows in dev against real backend
