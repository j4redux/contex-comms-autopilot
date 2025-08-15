# @vibe-kit/e2b

E2B sandbox provider for VibeKit.

## Installation

```bash
npm install @vibe-kit/e2b
```

## Usage

```typescript
import { VibeKit } from "@vibe-kit/sdk";
import { createE2BProvider } from "@vibe-kit/e2b";

// Create the E2B provider with configuration
const e2bProvider = createE2BProvider({
  apiKey: process.env.E2B_API_KEY!,
  templateId: "vibekit-claude", // optional, will be auto-selected based on agent
});

// Create the VibeKit instance with the provider
const vibeKit = new VibeKit()
  .withAgent({
    type: "claude",
    provider: "anthropic",
    apiKey: process.env.CLAUDE_API_KEY!,
    model: "claude-3-5-sonnet-20241022",
  })
  .withSandbox(e2bProvider) // Pass the provider instance
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

The E2B provider accepts the following configuration:

- `apiKey` (required): Your E2B API key
- `templateId` (optional): E2B template ID. If not provided, it will be auto-selected based on the agent type:
  - `claude` → `vibekit-claude`
  - `opencode` → `vibekit-opencode`
  - `gemini` → `vibekit-gemini`
  - `codex` → `vibekit-codex`

## Migration from v0.0.x

Previous versions used a factory pattern with configuration objects. The new version uses provider instances:

### Before (v0.0.x)
```typescript
const vibeKit = new VibeKit()
  .withSandbox({
    type: "e2b",
    apiKey: process.env.E2B_API_KEY!,
    templateId: "vibekit-claude",
  });
```

### After (v0.1.x)
```typescript
import { createE2BProvider } from "@vibe-kit/e2b";

const e2bProvider = createE2BProvider({
  apiKey: process.env.E2B_API_KEY!,
  templateId: "vibekit-claude",
});

const vibeKit = new VibeKit()
  .withSandbox(e2bProvider);
```

## Features

- Automatic template selection based on agent type
- Support for background command execution
- 1-hour timeout for long-running operations
- Sandbox pause/resume functionality
- Port forwarding support
- Custom working directory support (automatically created with proper permissions)

## Requirements

- Node.js 18+
- E2B API key

## License

MIT