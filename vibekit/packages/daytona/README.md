# @vibe-kit/daytona

Daytona sandbox provider for VibeKit.

## Installation

```bash
npm install @vibe-kit/daytona
```

## Usage

```typescript
import { VibeKit } from "@vibe-kit/sdk";
import { createDaytonaProvider } from "@vibe-kit/daytona";

// Create the Daytona provider with configuration
const daytonaProvider = createDaytonaProvider({
  apiKey: process.env.DAYTONA_API_KEY!,
  serverUrl: "https://app.daytona.io/api", // optional
  image: "superagentai/vibekit-claude:1.0", // optional, will be auto-selected based on agent
});

// Create the VibeKit instance with the provider
const vibeKit = new VibeKit()
  .withAgent({
    type: "claude",
    provider: "anthropic",
    apiKey: process.env.CLAUDE_API_KEY!,
    model: "claude-3-5-sonnet-20241022",
  })
  .withSandbox(daytonaProvider) // Pass the provider instance
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

The Daytona provider accepts the following configuration:

- `apiKey` (required): Your Daytona API key
- `serverUrl` (optional): Daytona server URL (defaults to "https://app.daytona.io")
- `image` (optional): Docker image to use. If not provided, it will be auto-selected based on the agent type:
  - `claude` → `superagentai/vibekit-claude:1.0`
  - `opencode` → `superagentai/vibekit-opencode:1.0`
  - `gemini` → `superagentai/vibekit-gemini:1.0`
  - `codex` → `superagentai/vibekit-codex:1.0`

## Migration from v0.0.x

Previous versions used a factory pattern with configuration objects. The new version uses provider instances:

### Before (v0.0.x)
```typescript
const vibeKit = new VibeKit()
  .withSandbox({
    type: "daytona",
    apiKey: process.env.DAYTONA_API_KEY!,
    serverUrl: "https://app.daytona.io/api",
    image: "superagentai/vibekit-claude:1.0",
  });
```

### After (v0.1.x)
```typescript
import { createDaytonaProvider } from "@vibe-kit/daytona";

const daytonaProvider = createDaytonaProvider({
  apiKey: process.env.DAYTONA_API_KEY!,
  serverUrl: "https://app.daytona.io/api",
  image: "superagentai/vibekit-claude:1.0",
});

const vibeKit = new VibeKit()
  .withSandbox(daytonaProvider);
```

## Features

- Automatic Docker image selection based on agent type
- Support for background command execution
- Workspace management (create, resume, delete)
- Port forwarding support
- Environment variable injection
- Custom working directory support (automatically created)

## Requirements

- Node.js 18+
- Daytona API key
- Access to Daytona workspace

## License

MIT