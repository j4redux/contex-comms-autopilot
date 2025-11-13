# Contex Frontend

**Next.js 15 web application for the Contex communications platform**

This is the frontend interface for Contex, providing a real-time, interactive user experience for creating and managing AI-powered business communications.

## Tech Stack

- **Framework:** Next.js 15.3.3 with App Router
- **React:** v19.0.0 with React 19 features
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand with localStorage persistence
- **Real-time Updates:** Inngest Realtime (WebSocket-based)
- **AI Integration:** Vercel AI SDK
- **UI Components:** Radix UI primitives
- **Markdown Rendering:** react-markdown with syntax highlighting
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Type Safety:** TypeScript 5 with strict mode

## Prerequisites

- **Node.js 18+**
- **npm** or **bun** package manager
- Running backend server (see `/server` directory)
- Running Inngest dev server

## Installation

```bash
# From the frontend directory
npm install

# Or using bun
bun install
```

## Environment Setup

Create a `.env.local` file in the frontend directory:

```bash
# Inngest Configuration (Required for real-time updates)
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

# Development User (for testing without authentication)
NEXT_PUBLIC_DEV_USER_ID=dev-user-001

# Backend API URL (default: http://localhost:8787)
NEXT_PUBLIC_API_URL=http://localhost:8787

# Optional: Debug mode
NEXT_PUBLIC_DEBUG=false
```

**Note:** See `.env.example` for a template.

## Development

### Start Development Server

```bash
# Using npm
npm run dev

# Or using bun
bun run dev
```

The application will be available at **http://localhost:3001**

The dev server uses Turbopack for faster hot-reloading.

### Build for Production

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

## Project Structure

```
frontend/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Main page (task interface)
│   ├── globals.css                   # Global styles
│   └── _components/                  # Page-specific components
│       ├── task-form.tsx             # Task input form
│       └── task-list.tsx             # Task history display
│
├── components/                       # Reusable UI components
│   └── ui/                           # Radix UI component wrappers
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── scroll-area.tsx
│       ├── separator.tsx
│       └── ...
│
├── stores/                           # Zustand state management
│   └── tasks.ts                      # Task store with localStorage
│
├── providers/                        # React context providers
│   └── inngest-realtime-provider.tsx # WebSocket connection wrapper
│
├── lib/                              # Utility functions
│   └── utils.ts                      # Helper functions (cn, etc.)
│
├── public/                           # Static assets
│   ├── file.svg
│   ├── globe.svg
│   └── ...
│
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
├── postcss.config.mjs                # PostCSS configuration
├── eslint.config.mjs                 # ESLint configuration
└── components.json                   # Shadcn/ui configuration
```

## Key Features

### 1. **Real-time Task Updates**

The frontend uses **Inngest Realtime** to receive WebSocket-based updates from the backend:

```typescript
// providers/inngest-realtime-provider.tsx
const realtimeClient = new RealtimeClient({
  eventKey: process.env.INNGEST_EVENT_KEY!,
  signingKey: process.env.INNGEST_SIGNING_KEY!,
});

// Subscribe to task updates
realtimeClient.subscribe(`task:${taskId}:status`, (data) => {
  // Handle status updates
});
```

### 2. **Persistent State with Zustand**

Tasks are stored in Zustand with automatic localStorage persistence:

```typescript
// stores/tasks.ts
interface TaskStore {
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
}

// Automatically syncs to localStorage
const useTaskStore = create(
  persist(
    (set) => ({
      tasks: [],
      addTask: (task) => set((state) => ({ 
        tasks: [...state.tasks, task] 
      })),
      // ...
    }),
    {
      name: 'contex-tasks',
    }
  )
);
```

### 3. **Markdown Rendering with Syntax Highlighting**

Generated content is rendered with full markdown support:

```typescript
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeRaw]}
  components={{
    code: ({ node, inline, className, children, ...props }) => (
      <SyntaxHighlighter language={language} {...props}>
        {children}
      </SyntaxHighlighter>
    ),
  }}
>
  {content}
</ReactMarkdown>
```

### 4. **Radix UI Components**

All UI components are built on Radix UI primitives for accessibility:

- **Dialog** - Modal windows for task details
- **Tabs** - Switch between output and files
- **Scroll Area** - Smooth scrolling for long content
- **Tooltip** - Helpful hints and information
- **Select** - Dropdown menus (future use)

### 5. **Responsive Design**

Mobile-first design with Tailwind CSS breakpoints:

```typescript
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  {/* Stacks on mobile, side-by-side on desktop */}
</div>
```

## Component Guide

### TaskForm Component

Located at `app/_components/task-form.tsx`

Handles user input and task submission:

```typescript
interface TaskFormProps {
  onSubmit: (prompt: string, mode: "process" | "ask") => void;
  isProcessing: boolean;
}
```

**Features:**
- Textarea for prompt input
- Mode selector (Process vs Ask)
- Loading state handling
- Enter to submit (Shift+Enter for new line)

### TaskList Component

Located at `app/_components/task-list.tsx`

Displays task history with real-time updates:

```typescript
interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
}
```

**Features:**
- Task status indicators
- Expandable task details
- File preview and download
- Markdown rendering
- Auto-scroll to latest task

## State Management

### Task Store (stores/tasks.ts)

```typescript
interface Task {
  id: string;
  userId: string;
  prompt: string;
  mode: "process" | "ask";
  status: "pending" | "processing" | "completed" | "error";
  output?: string;
  files?: Array<{
    name: string;
    path: string;
    content: string;
    size: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Store actions
const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  
  addTask: (task) => 
    set((state) => ({ tasks: [...state.tasks, task] })),
  
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
  
  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),
  
  clearTasks: () => set({ tasks: [] }),
}));
```

## API Integration

### Backend Communication

The frontend communicates with the backend via REST API:

```typescript
// Submit a task
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/knowledge/process`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: process.env.NEXT_PUBLIC_DEV_USER_ID,
      prompt: userPrompt,
      mode: "process",
    }),
  }
);

const { taskId } = await response.json();
```

### Real-time Updates

WebSocket events are handled through Inngest Realtime:

```typescript
// Subscribe to task updates
const unsubscribe = realtimeClient.subscribe(
  `task:${taskId}:status`,
  (data) => {
    useTaskStore.getState().updateTask(taskId, {
      status: data.status,
      output: data.output,
      files: data.files,
    });
  }
);
```

## Styling

### Tailwind CSS v4

The application uses Tailwind CSS v4 with custom configuration:

```typescript
// tailwind.config.ts
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette
      },
    },
  },
  plugins: [
    require("tw-animate-css"),
  ],
};
```

### Global Styles

Located at `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* ... more CSS variables */
  }
}
```

## TypeScript Configuration

Strict TypeScript configuration for type safety:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Testing

### Manual Testing Checklist

- [ ] Create a new task with the form
- [ ] Verify real-time status updates appear
- [ ] Check task history persists after page reload
- [ ] Expand task details and view files
- [ ] Test markdown rendering with code blocks
- [ ] Verify file download functionality
- [ ] Test responsive design on mobile

### Testing Real-time Updates

1. Open browser DevTools → Network tab
2. Filter by "WS" to see WebSocket connections
3. Submit a task and observe WebSocket messages
4. Verify task status updates in real-time

## Troubleshooting

### Common Issues

#### 1. **Real-time updates not working**

**Symptoms:** Tasks remain in "processing" state indefinitely

**Solutions:**
- Check Inngest dev server is running (`http://localhost:8288`)
- Verify `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in `.env.local`
- Check browser console for WebSocket connection errors
- Inspect Network tab for failed WebSocket connections

#### 2. **Backend API connection fails**

**Symptoms:** "Failed to fetch" errors in console

**Solutions:**
- Verify backend is running on `http://localhost:8787`
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure CORS is properly configured in backend
- Try `curl http://localhost:8787/api/sandbox/status` to verify backend

#### 3. **Tasks don't persist after reload**

**Symptoms:** Task history is empty after refreshing

**Solutions:**
- Check browser localStorage in DevTools → Application → Local Storage
- Look for `contex-tasks` key
- Verify Zustand persist middleware is configured
- Clear localStorage if corrupted: `localStorage.clear()`

#### 4. **Tailwind styles not applying**

**Symptoms:** Components appear unstyled

**Solutions:**
- Run `npm run build` to regenerate CSS
- Check `tailwind.config.ts` content paths
- Verify `@tailwindcss/postcss` is installed
- Restart dev server

#### 5. **TypeScript errors**

**Symptoms:** Build fails with type errors

**Solutions:**
- Run `npm install` to update dependencies
- Check `tsconfig.json` for correct paths
- Verify `@types/*` packages are installed
- Run `npm run lint` to identify issues

## Performance Optimization

### 1. **Code Splitting**

Next.js automatically code-splits by route:

```typescript
// Dynamic imports for heavy components
const MarkdownRenderer = dynamic(() => import('./markdown-renderer'), {
  loading: () => <Skeleton />,
});
```

### 2. **Image Optimization**

Use Next.js Image component for automatic optimization:

```typescript
import Image from 'next/image';

<Image
  src="/logo.svg"
  alt="Contex"
  width={200}
  height={50}
  priority
/>
```

### 3. **Caching Strategy**

- **localStorage** - Persistent task history
- **React Query** (future) - API response caching
- **Service Workers** (future) - Offline support

## Deployment

### Production Build

```bash
npm run build
```

This creates an optimized production build in `.next/` directory.

### Environment Variables

**Production `.env.production` file:**

```bash
# Backend API URL (production)
NEXT_PUBLIC_API_URL=https://api.contex.example.com

# Inngest production keys
INNGEST_EVENT_KEY=prod_inngest_event_key
INNGEST_SIGNING_KEY=prod_inngest_signing_key

# Production user authentication
# NEXT_PUBLIC_DEV_USER_ID should NOT be set in production
```

### Deployment Platforms

Recommended platforms for Next.js 15:

- **Vercel** (recommended, zero-config)
- **Netlify**
- **AWS Amplify**
- **Docker** (see Dockerfile in root)

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

## Future Enhancements

- [ ] User authentication (OAuth2/JWT)
- [ ] Real-time collaboration (multiple users)
- [ ] Task templates and presets
- [ ] File upload support
- [ ] Advanced markdown editor with preview
- [ ] Dark mode toggle
- [ ] Keyboard shortcuts
- [ ] Export task results (PDF, Markdown)
- [ ] Task search and filtering
- [ ] Analytics dashboard

## Related Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Zustand Documentation](https://zustand.docs.pmnd.rs/)
- [Inngest Realtime](https://www.inngest.com/docs/realtime)
- [Radix UI](https://www.radix-ui.com/primitives)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

## License

This project is licensed under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License (CC BY-NC-ND 4.0).

See [LICENSE.md](../LICENSE.md) for full details.

---

**Built with Next.js 15, React 19, and Tailwind CSS v4**
