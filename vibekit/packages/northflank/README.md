# @vibe-kit/northflank

Northflank sandbox provider for VibeKit.

## Installation

```bash
npm install @vibe-kit/northflank
```

## Usage

```typescript
import { VibeKit } from "@vibe-kit/sdk";
import { createNorthflankProvider } from "@vibe-kit/northflank";

// Create the Northflank provider with configuration
const northflankProvider = createNorthflankProvider({
  apiKey: process.env.NORTHFLANK_API_KEY!,
  projectId: process.env.NORTHFLANK_PROJECT_ID!,
  image: "superagentai/vibekit-claude:1.0", // optional, will be auto-selected based on agent
  billingPlan: "nf-compute-200", // optional
  persistentVolumeStorage: 10240, // optional, 10GiB
  workingDirectory: "/var/vibe0", // optional
});

// Create the VibeKit instance with the provider
const vibeKit = new VibeKit()
  .withAgent({
    type: "claude",
    provider: "anthropic",
    apiKey: process.env.CLAUDE_API_KEY!,
    model: "claude-3-5-sonnet-20241022",
  })
  .withSandbox(northflankProvider) // Pass the provider instance
  .withWorkingDirectory("/var/custom-workdir") // Optional: specify working directory
  .withSecrets({
    // Any environment variables for the sandbox
    NODE_ENV: "development",
  });

// Use the configured instance
const response = await vibeKit.generateCode("Create a simple React component");
console.log(response);
```

## Configuration

The Northflank provider accepts the following configuration:

- `apiKey` (required): Your Northflank API key
- `projectId` (required): Your Northflank project ID
- `image` (optional): Docker image to use. If not provided, it will be auto-selected based on the agent type:
  - `claude` → `superagentai/vibekit-claude:1.0`
  - `opencode` → `superagentai/vibekit-opencode:1.0`
  - `gemini` → `superagentai/vibekit-gemini:1.0`
  - `codex` → `superagentai/vibekit-codex:1.0`
- `billingPlan` (optional): Northflank billing plan (defaults to "nf-compute-200")
- `persistentVolumeStorage` (optional): Storage size in MB (defaults to 10240 MB / 10GB)
- `workingDirectory` (optional): Working directory inside the container (defaults to "/var/vibe0")

## Migration from v0.0.x

Previous versions used a factory pattern with configuration objects. The new version uses provider instances:

### Before (v0.0.x)
```typescript
const vibeKit = new VibeKit()
  .withSandbox({
    type: "northflank",
    apiKey: process.env.NORTHFLANK_API_KEY!,
    projectId: process.env.NORTHFLANK_PROJECT_ID!,
    image: "superagentai/vibekit-claude:1.0",
    billingPlan: "nf-compute-200",
    persistentVolumeStorage: 10240,
    workingDirectory: "/var/vibe0",
  });
```

### After (v0.1.x)
```typescript
import { createNorthflankProvider } from "@vibe-kit/northflank";

const northflankProvider = createNorthflankProvider({
  apiKey: process.env.NORTHFLANK_API_KEY!,
  projectId: process.env.NORTHFLANK_PROJECT_ID!,
  image: "superagentai/vibekit-claude:1.0",
  billingPlan: "nf-compute-200",
  persistentVolumeStorage: 10240,
  workingDirectory: "/var/vibe0",
});

const vibeKit = new VibeKit()
  .withSandbox(northflankProvider);
```

## Features

- Automatic Docker image selection based on agent type
- Support for background command execution
- Service management (create, resume, delete, pause)
- Port forwarding support with automatic DNS configuration
- Environment variable injection
- Persistent volume storage
- Custom working directory support (automatically mounted)
- Configurable billing plans and storage sizes

## Requirements

- Node.js 18+
- Northflank API key
- Northflank project ID

## License

MIT