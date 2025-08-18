# File Detection Implementation - Current Status

## Goal

Implement real-time detection and display of deliverable files created by Claude Code within the Daytona sandbox workspace. Display these files in the task page right panel with tabbed navigation for multiple files.

## Current Filesystem Structure

Based on updated Dockerfile (lines 63-81):

```
/home/daytona/workspace/
├── CLAUDE.md          # Empty file
├── README.md          # Empty file  
├── context/
│   ├── company.json   # Company intelligence
│   └── product.json   # Product information
├── deliverables/
│   ├── emails/        # Ready-to-send emails
│   ├── memos/         # Investment/board memos
│   └── presentations/ # Pitch decks, reports
├── metrics/
│   ├── current.json   # Real-time metrics
│   └── historical/    # Metrics snapshots
├── stakeholders/
│   ├── customers/     # Customer profiles
│   └── investors/     # Investor profiles
├── updates/           # Timestamped investor updates
├── .system/           # Templates and prompts
└── .founder_profile/   # Founder voice settings
```

**Working Directory**: `/home/daytona/workspace` (Dockerfile line 503)

## Backend Implementation

### File Detection Strategy

**Location**: `server/src/services/inngest.ts`

**Implementation Flow**:
1. **Pre-execution** (lines 394-396): Capture baseline file state
2. **Claude execution** (line 398): Run Claude command  
3. **Post-execution** (lines 431, 462): Scan for file changes
4. **Message publishing**: Send file metadata + content to frontend

### Target Detection Directories

```typescript
const deliverableDirs = [
  "workspace/deliverables/emails",
  "workspace/deliverables/memos", 
  "workspace/deliverables/presentations",
  "workspace/updates",
  "workspace/metrics/historical"
];
```

**Supported File Types**: `*.md`, `*.txt`, `*.json`, `*.html`, `*.csv`

### Daytona SDK Integration

**Key Functions Implemented**:

```typescript
// Capture existing files before Claude execution
async function captureExistingFiles(sandboxId: string): Promise<Map<string, number>>

// Scan for file changes after Claude execution  
async function scanFileChanges(sandboxId: string, startTime: number, existingFiles: Map<string, number>, jobId: string, publish: any, taskId: string)

// Process individual file (new or updated)
async function processFileChange(workspace: any, filePath: string, fileInfo: any, messageType: string, taskId: string, jobId: string, publish: any)
```

**SDK Operations Used**:
- `workspace.fs.listFiles(dir)` - List directory contents with metadata
- `workspace.fs.getFileDetails(path)` - Get rich file information  
- `workspace.fs.downloadFile(path)` - Read file contents

### Message Types Published

**File Metadata Message**:
```typescript
{
  type: "file_created" | "file_updated",
  data: {
    filePath: "workspace/deliverables/memos/q3-update.md",
    fileName: "q3-update.md",
    fileType: "markdown",
    directory: "workspace/deliverables/memos", 
    size: 2048,
    modifiedAt: 1755537000000
  },
  jobId,
  ts: Date.now()
}
```

**File Content Message**:
```typescript
{
  type: "file_content",
  data: {
    filePath: "workspace/deliverables/memos/q3-update.md",
    content: "# Q3 Investor Update\n\nOur MRR grew 50%..." // Limited to 50KB
  },
  jobId,
  ts: Date.now()
}
```

## Frontend Plan (Not Yet Implemented)

### Task Store Updates

**Enhanced Task Interface**:
```typescript
interface Task {
  // ... existing fields
  files?: {
    [filePath: string]: {
      metadata: {
        fileName: string;
        fileType: string;
        directory: string;
        size: number;
        modifiedAt: number;
      };
      content: string;
    };
  };
}
```

### Message Handling

**New Message Handlers** (client-page.tsx):
```typescript
else if (message.type === "file_created") {
  // Store new file metadata and prepare tab
} else if (message.type === "file_updated") {
  // Update existing file, show update indicator
} else if (message.type === "file_content") {
  // Store file content for display
}
```

### Right Panel UI Design

**Option B: Tabbed File View** (Approved)
```jsx
{/* File tabs at top */}
<Tabs value={activeFileTab} onValueChange={setActiveFileTab}>
  <TabsList>
    {Object.keys(task?.files || {}).map(filePath => (
      <TabsTrigger key={filePath} value={filePath}>
        {task?.files?.[filePath]?.metadata?.fileName}
      </TabsTrigger>
    ))}
  </TabsList>
</Tabs>

{/* Active file content */}
<TabsContent value={activeFileTab}>
  <FileContentRenderer 
    file={activeFileContent}
    metadata={activeFileMetadata}
  />
</TabsContent>
```

**Content Renderers**:
- **Markdown**: Use existing `<Markdown>` component
- **JSON**: Syntax highlighted JSON viewer
- **Text**: Monospace pre-formatted text
- **HTML**: Rendered HTML content

## Testing Results

### Backend File Detection Testing

**Test Setup**:
- Modified E2E script with file creation prompt
- Explicit Write tool instruction: `"Use the Write tool to create a file at workspace/deliverables/memos/test-memo.md"`

**Results**:
- ✅ **Sandbox Creation**: Working correctly
- ✅ **Directory Structure**: Confirmed via Claude directory listing
- ✅ **File Detection Logic**: Runs without errors ("File detection scan completed")
- ❌ **Actual File Creation**: Claude claims success but files don't exist

### Critical Issue Discovered

**Problem**: Claude responds with success ("The investor memo has been created at `deliverables/memos/test-memo.md`") but files are not actually created in the sandbox.

**Possible Causes**:
1. **Tool Permission Issues**: Write tool might be restricted for certain paths
2. **Path Resolution**: Claude using incorrect paths for file creation
3. **Silent Tool Failures**: Write tool failing without proper error reporting
4. **Working Directory Mismatch**: Claude running from different directory than expected

**Investigation Needed**:
- Check actual tool call logs (not just Claude's response text)
- Verify Write tool permissions for workspace paths
- Test simple file creation in current directory
- Confirm working directory during Claude execution

### Message Flow Architecture

**Current Message Sequence**:
1. `"log"` - Initial status and progress messages
2. `"result"` - Claude's conversational response
3. **[NEW]** `"file_created"/"file_updated"` - File metadata (when files exist)
4. **[NEW]** `"file_content"` - File contents (when files exist)
5. `"done"` - Task completion

**Frontend Integration Points**:
- Messages already being received correctly in frontend
- New message types need handlers in `client-page.tsx:73-103`
- Right panel UI needs tabbed file viewer implementation

## Implementation Status

### ✅ Completed

1. **Backend File Detection Logic**: Implemented using Daytona SDK
2. **Message Publishing**: New message types added to Inngest flow
3. **Directory Structure**: Updated Dockerfile with streamlined workspace
4. **Testing Infrastructure**: E2E script modified for file detection testing
5. **Error Handling**: Robust error isolation for file operations

### ❌ Blocking Issues

1. **File Creation**: Claude Write tool not actually creating files
2. **Path Resolution**: Unclear why file creation claims success but fails
3. **Tool Debugging**: Need visibility into actual Claude tool execution

### 🔄 Next Steps

1. **Debug File Creation**: Investigate why Write tool isn't working
2. **Tool Call Logging**: Add detailed logging of Claude's actual tool usage
3. **Path Testing**: Test file creation with different path formats
4. **Frontend Implementation**: Once file creation works, implement tabbed UI

## Technical Architecture

### Backend Components

**File**: `server/src/services/inngest.ts`
- `captureExistingFiles()` - Baseline file state capture
- `scanFileChanges()` - Post-execution change detection
- `processFileChange()` - Individual file processing and message publishing

**Dependencies**: 
- Daytona SDK for file operations
- Existing Inngest real-time messaging
- No new external dependencies required

### Frontend Components (Planned)

**File**: `frontend/app/task/[id]/client-page.tsx`
- Enhanced message handlers for file messages
- Tabbed file navigation in right panel
- Content renderers for different file types

**Dependencies**:
- Existing shadcn Tabs component
- Existing Markdown component
- Potential JSON viewer component

## Message Flow Validation

**Real-time Subscription**: Already working correctly
- Frontend receives `"result"` messages ✅
- Backend publishes to correct channel ✅  
- Message type filtering working ✅

**New Message Types**: Ready for frontend integration
- Backend publishes `file_created`, `file_updated`, `file_content`
- Frontend message handler structure already in place
- Just needs new message type cases added

The core infrastructure is solid - the blocking issue is Claude tool execution, not our file detection or messaging architecture.