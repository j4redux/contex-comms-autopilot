# Claude Code + Daytona Integration Guide

## Overview

This guide documents the complete implementation of Claude Code CLI execution within Daytona sandboxes. After extensive testing and iteration, we've established a working pattern that provides reliable Claude Code execution in isolated sandbox environments.

## Architecture

### Core Components

1. **Snapshot-Based Sandboxes**: Pre-built Daytona snapshots with Claude Code CLI pre-installed
2. **VibeKit Pattern**: Proven command execution pattern using pipe-based input
3. **Session Management**: Proper Daytona session handling for command execution
4. **API Layer**: RESTful endpoints with WebSocket streaming for real-time feedback
5. **Environment Propagation**: Secure API key and configuration passing

### Key Architectural Decisions

**✅ Use Snapshots, Not Runtime Installation**
- **Wrong**: Installing Claude Code CLI during sandbox creation
- **Right**: Pre-built snapshots with Claude Code already installed
- **Why**: Faster creation, consistent environment, avoids installation failures

**✅ Use VibeKit Pattern, Not Complex Shell Commands**
- **Wrong**: Complex shell escaping with `su` commands or direct argument passing
- **Right**: Simple pipe pattern: `echo "prompt" | claude -p --output-format json`
- **Why**: Avoids shell escaping issues, reliable execution, proven in production

**✅ Use Direct Session Management**
- **Working**: Both `workspace.id` directly and `getSession()` pattern work
- **Why**: Daytona SDK provides multiple working approaches

## Snapshot Management

### Creating Snapshots

Use the current snapshot: `omni-snapshot-2025-08-18T21-57-49-580Z`

This snapshot includes:
- Ubuntu 22.04 base
- Claude Code CLI 1.0.83 (via curl install script)
- Proper user setup (`omni` user)
- Complete knowledge workspace structure
- Pre-configured Claude settings

### Snapshot Configuration

```dockerfile
FROM ubuntu:22.04

# Install Claude Code CLI
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl ripgrep ca-certificates jq \
    && curl -fsSL https://claude.ai/install.sh -o /tmp/install.sh && \
    bash /tmp/install.sh && \
    cp /root/.local/bin/claude /usr/local/bin/claude && \
    chmod 0755 /usr/local/bin/claude && \
    claude --version

# Create daytona user
RUN groupadd -r daytona && useradd -r -g daytona -m daytona

# Configure Claude settings for both users
RUN mkdir -p /root/.claude /home/daytona/.claude && \
    cat > /root/.claude/settings.json << 'EOF'
{
  "allowedTools": ["*"],
  "outputFormat": "text"
}
EOF

# Create knowledge workspace structure
RUN mkdir -p /home/daytona/workspace/.system/{index,prompts,logs} \
    /home/daytona/workspace/{context,decisions,documents,analysis,deliverables} \
    && chown -R daytona:daytona /home/daytona/workspace

USER daytona
WORKDIR /home/daytona/workspace
```

## Claude Code Execution Patterns

### ✅ Working Pattern: VibeKit Approach

```typescript
// The ONLY pattern that works reliably
const command = `echo "${escapedInput}" | claude -p --output-format json --model ${model}`
const result = await executeCommand(sandboxId, command)
```

**Why this works:**
- Pipe avoids shell escaping complexity
- JSON output provides structured responses
- Model specification ensures consistency
- Proven in VibeKit production usage

### ❌ Patterns That Don't Work

**Nightona Pattern (hangs):**
```bash
# DON'T USE - causes hangs
su daytona -c "cd /home/daytona/workspace && claude --dangerously-skip-permissions -p \"$(echo 'base64' | base64 -d)\" --output-format json"
```

**Direct Argument Pattern (escaping issues):**
```bash
# DON'T USE - shell escaping problems
claude -p "prompt with quotes" --output-format json
```

**Complex Shell Commands:**
```bash
# DON'T USE - unpredictable behavior
any command involving multiple levels of quote escaping
```

### Response Handling

Claude Code returns structured JSON:
```json
{
  "type": "result",
  "subtype": "success", 
  "is_error": false,
  "duration_ms": 2850,
  "duration_api_ms": 2738,
  "num_turns": 1,
  "result": "4",
  "session_id": "uuid",
  "total_cost_usd": 0.054309
}
```

Always parse the `result` field:
```typescript
try {
  const claudeResponse = JSON.parse(result.stdout)
  const answer = claudeResponse.result || result.stdout
} catch {
  const answer = result.stdout // fallback to raw output
}
```

## Session Management

### Daytona Session Creation

Both patterns work reliably:

**Pattern 1: Direct workspace.id usage**
```typescript
await workspace.process.createSession(workspace.id)
const result = await workspace.process.executeSessionCommand(
  workspace.id,
  { command: "your_command", runAsync: false },
  undefined
)
```

**Pattern 2: VibeKit getSession() pattern**
```typescript
await workspace.process.createSession(workspace.id)
const session = await workspace.process.getSession(workspace.id)
const result = await workspace.process.executeSessionCommand(
  session.sessionId,
  { command: "your_command", runAsync: false },
  undefined
)
```

### Session Best Practices

1. **Always create session first**: `await workspace.process.createSession(workspace.id)`
2. **Use consistent sessionId**: Either `workspace.id` or `session.sessionId`
3. **Handle session errors**: Catch and recreate if session becomes invalid

## Environment Configuration

### Required Environment Variables

```typescript
const envVars: Record<string, string> = { 
  USER_ID: userId,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || ""
}
```

### Sandbox Creation

```typescript
export async function createSandbox(userId: string): Promise<DaytonaSandbox> {
  const daytona = createClient()
  
  const workspace = await daytona.create({
    snapshot: "omni-snapshot-2025-08-18T21-57-49-580Z", // Use current snapshot
    envVars: {
      USER_ID: userId,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || ""
    }
  })
  
  await workspace.process.createSession(workspace.id)
  
  // Verify Claude is accessible (should be pre-installed)
  const verify = await executeCommand(workspace.id, "claude --version")
  if (verify.exitCode !== 0) {
    console.warn(`Claude Code not accessible: ${verify.stderr}`)
  }
  
  return {
    id: workspace.id,
    userId,
    status: "ready",
    createdAt: Date.now()
  }
}
```

## API Implementation

### Knowledge Processing Endpoint

```typescript
// /api/knowledge/process
if (url.pathname === "/api/knowledge/process") {
  const body = validateProcessBody(raw)
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  
  void (async () => {
    try {
      // Pre-flight checks
      broadcastLog({ userId, sandboxId, jobId, data: "job started" })
      
      const claudeCheck = await executeCommand(sandboxId, "claude --version")
      if (claudeCheck.exitCode !== 0) {
        broadcastError({ userId, sandboxId, jobId, code: "CLAUDE_NOT_AVAILABLE", 
          message: "Claude Code CLI not available" })
        return
      }
      broadcastLog({ userId, sandboxId, jobId, data: "claude --version OK" })
      
      // Environment verification
      const apiKeyCheck = await executeCommand(sandboxId, 
        "test -n \"$ANTHROPIC_API_KEY\" && echo present || echo missing")
      broadcastLog({ userId, sandboxId, jobId, 
        data: `ANTHROPIC_API_KEY: ${apiKeyCheck.stdout.trim()}` })
      
      // Network checks
      broadcastLog({ userId, sandboxId, jobId, data: "dns preflight: api.anthropic.com" })
      await executeCommand(sandboxId, "nslookup api.anthropic.com > /dev/null 2>&1")
      
      broadcastLog({ userId, sandboxId, jobId, data: "https preflight: api.anthropic.com" })
      await executeCommand(sandboxId, "curl -s --head https://api.anthropic.com > /dev/null 2>&1")
      
      // Execute Claude using VibeKit pattern
      const model = body.model || "sonnet"
      const escapedInput = body.input.replace(/"/g, '\\"')
      const command = `echo "${escapedInput}" | claude -p --output-format json --model ${model}`
      
      broadcastLog({ userId, sandboxId, jobId, data: "executing claude command" })
      const result = await executeCommand(sandboxId, command)
      
      if (result.exitCode === 0) {
        try {
          const claudeResponse = JSON.parse(result.stdout)
          broadcastLog({ userId, sandboxId, jobId, 
            data: `claude response: ${claudeResponse.result?.substring(0, 100)}...` })
          
          broadcastResult({ userId, sandboxId, jobId, format: "text", 
            data: claudeResponse.result || result.stdout })
          broadcastDone({ userId, sandboxId, jobId, exitCode: 0 })
        } catch (parseError) {
          broadcastResult({ userId, sandboxId, jobId, format: "text", 
            data: result.stdout })
          broadcastDone({ userId, sandboxId, jobId, exitCode: 0 })
        }
      } else {
        broadcastError({ userId, sandboxId, jobId, code: "CLAUDE_COMMAND_FAILED", 
          message: `Claude command failed: ${result.stderr}` })
        broadcastDone({ userId, sandboxId, jobId, exitCode: result.exitCode })
      }
    } catch (error) {
      broadcastError({ userId, sandboxId, jobId, code: "EXECUTION_ERROR", 
        message: String(error) })
      broadcastDone({ userId, sandboxId, jobId, exitCode: 1 })
    }
  })()
  
  return json({ jobId, accepted: true })
}
```

## WebSocket Streaming

### Message Types

```typescript
interface LogMessage {
  type: "log"
  sandboxId: string
  jobId: string
  level: "info"
  ts: number
  data: string
}

interface ResultMessage {
  type: "result"
  sandboxId: string
  jobId: string
  ts: number
  format: "text" | "json"
  data: string
}

interface ErrorMessage {
  type: "error"
  sandboxId: string
  jobId: string
  ts: number
  code: string
  message: string
}

interface DoneMessage {
  type: "done"
  sandboxId: string
  jobId: string
  ts: number
  exitCode: number
}
```

### Client Usage

```typescript
const ws = new WebSocket(`ws://localhost:8787/ws?userId=${userId}`)
const messages = []

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  messages.push(data)
  
  if (data.type === "result") {
    console.log("Claude response:", data.data)
  } else if (data.type === "done") {
    console.log("Job completed with exit code:", data.exitCode)
  } else if (data.type === "error") {
    console.error("Error:", data.message)
  }
}
```

## Testing Methodology

### Test Structure

We've established a comprehensive testing approach with isolated component tests:

1. **Snapshot Test** (`01-snapshot-test.ts`): Verifies snapshot creation and basic functionality
2. **Claude Execution Test** (`02-claude-execution-test.ts`): Tests VibeKit patterns with different models
3. **Session Management Test** (`03-session-management-test.ts`): Validates session handling approaches
4. **API Endpoint Test** (`05-api-endpoint-test.ts`): Tests complete API functionality with WebSocket
5. **E2E Test** (`scripts/e2e-process.ts`): Full pipeline validation

### Running Tests

```bash
# Individual tests
bun run test:snapshot    # Basic functionality
bun run test:claude      # Claude execution patterns  
bun run test:session     # Session management
bun run test:api         # API endpoints

# Complete test suite
bun run test:all

# End-to-end validation
USER_ID=test INPUT="your prompt" bun run scripts/e2e-process.ts
```

### Test Results Validation

Every test should show:
- ✅ Sandbox creation from snapshot
- ✅ Claude Code version 1.0.80 available
- ✅ ANTHROPIC_API_KEY present (108 chars)
- ✅ Successful Claude execution with correct responses
- ✅ Proper cleanup

## Implementation Details

### File Structure

```
server/
├── src/
│   ├── index.ts                 # Main server with /api/knowledge/process
│   └── services/
│       ├── daytona.ts          # Snapshot-based sandbox management
│       ├── config.ts           # Environment configuration
│       └── ws.ts               # WebSocket broadcasting
├── tests/                      # Comprehensive test suite
└── scripts/
    └── e2e-process.ts          # End-to-end validation
```

### Key Configuration

**Environment Variables:**
```bash
DAYTONA_API_KEY=dtn_...         # Daytona API access
DAYTONA_API_URL=https://app.daytona.io/api
ANTHROPIC_API_KEY=sk-ant-...    # Claude API access  
```

**Snapshot Cache:**
```json
{
  "name": "omni-snapshot-2025-08-18T21-57-49-580Z",
  "id": "ae794536-7f2b-4e9d-851e-05174e7a273c",
  "dockerHash": "new",
  "ts": 1755162579704,
  "createdFrom": "current-dockerfile"
}
```

### Sandbox Creation Pattern

```typescript
// CORRECT: Snapshot-based creation
const workspace = await daytona.create({
  snapshot: "omni-snapshot-2025-08-18T21-57-49-580Z",  // Use current snapshot
  envVars: {
    USER_ID: userId,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
  }
})

// WRONG: Runtime installation
const workspace = await daytona.create({
  image: "node:20",  // Don't use base images
  envVars: { /* ... */ }
})
await ensureClaudeInstalled(workspace.id) // Don't install at runtime
```

## Command Execution Patterns

### ✅ Working VibeKit Pattern

```typescript
function createClaudeCommand(input: string, model: string = "sonnet"): string {
  const escapedInput = input.replace(/"/g, '\\"')
  return `echo "${escapedInput}" | claude -p --output-format json --model ${model}`
}

// Usage
const command = createClaudeCommand("What is 2 + 2?", "sonnet")
const result = await executeCommand(sandboxId, command)

if (result.exitCode === 0) {
  const response = JSON.parse(result.stdout)
  console.log("Answer:", response.result) // "4"
}
```

### Model Support

Tested and working models:
- `sonnet`: Claude 3.5 Sonnet (default, most capable)
- `haiku`: Claude 3 Haiku (faster, cheaper)

### Output Formats

```typescript
// JSON output (recommended)
echo "prompt" | claude -p --output-format json --model sonnet
// Returns: {"type":"result","result":"answer",...}

// Text output (simple)
echo "prompt" | claude -p --output-format text
// Returns: raw text response
```

## Error Handling and Troubleshooting

### Common Issues and Solutions

**1. "Claude CLI not found"**
- **Cause**: Using base image instead of snapshot
- **Fix**: Use `snapshot: "omni-snapshot-2025-08-18T21-57-49-580Z"`

**2. "401 Unauthorized" / Authentication failures**
- **Cause**: ANTHROPIC_API_KEY not properly passed
- **Fix**: Verify environment variable propagation in `envVars`

**3. Command hangs/timeouts**
- **Cause**: Complex shell commands with `su` or quote escaping
- **Fix**: Use VibeKit pipe pattern only

**4. "Total disk quota exceeded"**
- **Cause**: Too many active sandboxes
- **Fix**: Clean up old sandboxes, implement proper lifecycle management

**5. Empty files created in Dockerfile**
- **Cause**: Heredoc (`<< 'EOF'`) syntax issues when running as non-root user
- **Fix**: Use echo commands instead of heredocs for file creation
- **Example**:
  ```dockerfile
  # ❌ BROKEN: Heredoc approach
  RUN cat > file.json << 'EOF'
  {"key": "value"}
  EOF
  
  # ✅ WORKING: Echo approach  
  RUN echo "{" > file.json && \
      echo "  \"key\": \"value\"" >> file.json && \
      echo "}" >> file.json
  ```

**6. Session management errors**
- **Cause**: Not creating session before command execution
- **Fix**: Always call `workspace.process.createSession(workspace.id)` first

### Diagnostic Commands

```typescript
// Verify Claude availability
await executeCommand(sandboxId, "claude --version")
// Expected: "1.0.80 (Claude Code)"

// Check environment
await executeCommand(sandboxId, "echo $ANTHROPIC_API_KEY | wc -c")
// Expected: "109" (108 chars + newline)

// Test connectivity
await executeCommand(sandboxId, "curl -s --head https://api.anthropic.com")
// Expected: exit code 0

// Test basic execution
await executeCommand(sandboxId, 'echo "test" | claude -p --output-format json')
// Expected: Valid JSON response
```

## Reference Implementations

### Server Integration (index.ts)

Complete working implementation in `/server/src/index.ts`:
- Uses snapshot-based sandbox creation
- Implements VibeKit command pattern
- Provides WebSocket streaming
- Includes comprehensive error handling and logging

### VibeKit Integration

Reference: `/vibekit/packages/sdk/src/agents/claude.ts`
- Lines 109-118: Command construction with pipe pattern
- Lines 125-137: Environment variable handling
- Lines 195-199: Model and output format specification

### Nightona Integration

Reference: `/nightona/worker/index.ts`
- Lines 124-129: Snapshot usage pattern
- Lines 270-275: Complex shell command (avoid this pattern)
- Shows proper sandbox state management

## Performance Characteristics

### Timing Expectations

Based on test results:
- **Sandbox creation**: ~2-3 seconds
- **Claude execution**: 2-9 seconds depending on model
  - Haiku: ~1.4-2.7 seconds  
  - Sonnet: ~2.3-5.2 seconds
- **WebSocket latency**: <100ms for log streaming

### Resource Usage

- **Memory**: Pre-allocated in snapshot
- **Disk**: Snapshot approach eliminates runtime installation overhead
- **Network**: API calls to api.anthropic.com only during execution

## Security Considerations

### API Key Handling

- ✅ Pass via environment variables only
- ✅ Never log or expose in command output
- ✅ Verify presence before execution
- ❌ Never embed in command strings

### Sandbox Isolation

- ✅ Each user gets isolated sandbox
- ✅ Filesystem isolation via Daytona
- ✅ Network isolation capabilities
- ✅ Process isolation per session

### Tool Restrictions

Claude settings in snapshot:
```json
{
  "allowedTools": [
    "Edit(**)", "Write(**)", "Read(**)", "LS(**)", 
    "Glob(**)", "Grep(**)", "TodoWrite(**)", "MultiEdit(**)",
    "WebFetch(**)", "WebSearch(**)",
    "Bash(echo:*)", "Bash(cat:*)", "Bash(ls:*)", 
    "Bash(find:*)", "Bash(jq:*)", "Bash(grep:*)",
    "Bash(rg:*)", "Bash(wc:*)", "Bash(head:*)", "Bash(tail:*)"
  ],
  "deniedTools": [
    "NotebookEdit(*)", "NotebookRead(*)",
    "Bash(rm:*)", "Bash(sudo:*)", "Bash(curl:*)",
    "Bash(wget:*)", "Bash(apt:*)", "Bash(pip:*)", "Bash(npm:*)"
  ]
}
```

## Complete Working Example

### Client Code

```typescript
// 1. Create sandbox
const createResponse = await fetch("/api/sandbox/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: "user123" })
})
const { sandboxId } = await createResponse.json()

// 2. Set up WebSocket for streaming
const ws = new WebSocket(`ws://localhost:8787/ws?userId=user123`)
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.type === "result") {
    console.log("Claude says:", data.data)
  }
}

// 3. Send prompt to Claude
await fetch("/api/knowledge/process", {
  method: "POST", 
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "user123",
    sandboxId,
    input: "What is the square root of 16?",
    model: "sonnet"
  })
})
```

### Server Response Flow

1. **Job starts**: `job started` log
2. **Environment checks**: Claude version, API key, network connectivity
3. **Claude execution**: Using VibeKit pattern
4. **Response parsing**: Extract `result` from JSON
5. **Streaming**: Real-time logs and final result via WebSocket
6. **Completion**: `done` message with exit code

## Filesystem Structure

### Snapshot Workspace Layout

```
/home/daytona/workspace/
├── .system/
│   ├── index/           # JSON indexes
│   ├── prompts/         # Template prompts
│   └── logs/            # System logs
├── context/
│   ├── entities/        # People, companies
│   ├── projects/        # Project data
│   └── intelligence/    # Insights
├── decisions/
│   ├── pending/         # Awaiting decisions
│   └── completed/       # Completed decisions
├── documents/           # Source materials
├── analysis/            # Generated insights
├── deliverables/        # Work products
├── CLAUDE.md            # Claude instructions
└── README.md            # Workspace guide
```

### Working Directory

- **Default**: `/home/daytona` (user home)
- **Workspace**: `/home/daytona/workspace` (knowledge structure)
- **Artifacts**: Stored in workspace subdirectories

## Cost and Performance Optimization

### Model Selection Strategy

- **Haiku**: Quick responses, simple questions (~$0.001-0.01 per query)
- **Sonnet**: Complex reasoning, coding tasks (~$0.004-0.05 per query)

### Sandbox Lifecycle Management

```typescript
// Implement sandbox reuse for cost efficiency
interface SandboxPool {
  userId: string
  sandboxId: string
  lastUsed: number
  status: "ready" | "busy" | "cleanup"
}

// Clean up inactive sandboxes
async function cleanupInactiveSandboxes(maxAge: number = 3600000) {
  // Implementation for periodic cleanup
}
```

## Advanced Patterns

### Conversation Continuity

Claude maintains session state automatically:
```typescript
// First message
echo "My name is John" | claude -p --output-format json

// Later message (same sandbox)
echo "What is my name?" | claude -p --continue --output-format json
// Claude remembers: "Your name is John"
```

### Tool Configuration

Override default tools:
```bash
echo "prompt" | claude -p --allowedTools "Read,Write,Edit" --output-format json
echo "prompt" | claude -p --disallowedTools "Bash" --output-format json
```

### Custom System Prompts

```bash
echo "prompt" | claude -p --append-system-prompt "You are a helpful assistant" --output-format json
```

## Production Considerations

### Monitoring and Logging

Track key metrics:
- Sandbox creation rate and success
- Claude execution latency by model
- Error rates and types
- API key usage and costs
- WebSocket connection health

### Scaling Considerations

- **Sandbox pools**: Reuse sandboxes for multiple requests
- **Load balancing**: Distribute across multiple Daytona instances
- **Rate limiting**: Prevent API abuse
- **Queue management**: Handle concurrent requests

### Backup and Recovery

- **Snapshot versioning**: Maintain multiple snapshot versions
- **Configuration backup**: Store environment and settings
- **Session recovery**: Handle disconnections gracefully

## Future Enhancements

### Planned Improvements

1. **Sandbox Pooling**: Reuse sandboxes for efficiency
2. **Advanced Tool Filtering**: Dynamic tool permissions per user
3. **Multi-Model Support**: Easy model switching
4. **Cost Tracking**: Per-user usage monitoring
5. **Enhanced Streaming**: Progress indicators and partial results

### Integration Opportunities

- **GitHub Integration**: Direct repository access
- **Database Connectivity**: Structured data access
- **File Upload/Download**: Artifact management
- **Authentication**: JWT-based user management

## Key Success Factors

1. **Use snapshots, never runtime installation**
2. **Stick to VibeKit pipe pattern exclusively**
3. **Use echo commands for file creation in Dockerfiles**
4. **Verify environment setup before execution**
5. **Implement comprehensive testing at component level**
6. **Handle JSON parsing with fallbacks**
7. **Maintain proper session lifecycle**
8. **Clean up resources consistently**

This implementation provides a robust, tested foundation for Claude Code execution within Daytona sandboxes, suitable for production use with proper monitoring and scaling considerations.