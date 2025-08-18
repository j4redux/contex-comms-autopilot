# Deliverable Files Implementation Plan

## Overview

Implement real-time detection and display of deliverable files created by Claude Code within the Daytona sandbox workspace. This system will show founder-generated content (emails, memos, updates) in the frontend right panel with tabbed navigation.

## Updated Filesystem Structure

Based on the streamlined Dockerfile workspace structure for founder operations:

```
/home/daytona/workspace/
├── deliverables/
│   ├── emails/          # Ready-to-send emails
│   ├── memos/           # Investment memos, board memos
│   └── presentations/   # Pitch decks, reports
├── updates/             # Timestamped investor updates  
├── metrics/             # Current and historical metrics
├── stakeholders/        # Investor and customer profiles
├── context/             # Company and product intelligence
├── .system/             # Templates and processing logic
└── .founder_profile/    # Founder voice and preferences
```

## Backend Implementation

### File Detection Strategy

**Location**: `server/src/services/inngest.ts` after line 263 (successful Claude execution)

**Target Directories for Deliverables**:
- `deliverables/emails/`
- `deliverables/memos/`
- `deliverables/presentations/`
- `updates/`

**Implementation using Daytona SDK**:

```typescript
// Import workspace access
import { createClient } from "./daytona"

// Add after Claude execution success (line 263):
async function scanDeliverableFiles(sandboxId: string, jobId: string, publish: any, taskId: string) {
  try {
    const daytona = createClient();
    const workspace = await daytona.get(sandboxId);
    
    const deliverableDirs = [
      "deliverables/emails",
      "deliverables/memos", 
      "deliverables/presentations",
      "updates"
    ];
    
    const supportedExtensions = ["*.md", "*.txt", "*.json", "*.html", "*.csv"];
    
    for (const dir of deliverableDirs) {
      try {
        // Search for each file type using Daytona SDK
        for (const pattern of supportedExtensions) {
          const result = await workspace.fs.searchFiles(dir, pattern);
          
          for (const filePath of result.files) {
            // Get rich file metadata using SDK
            const fileInfo = await workspace.fs.getFileDetails(filePath);
            
            // Send file metadata message
            await publish(taskChannel().update({
              taskId,
              message: {
                type: "file_created",
                data: {
                  filePath,
                  fileName: fileInfo.name,
                  fileType: getFileTypeFromPath(filePath),
                  directory: dir,
                  size: fileInfo.size,
                  modifiedAt: fileInfo.modTime,
                  permissions: fileInfo.permissions
                },
                jobId,
                ts: Date.now(),
              }
            }));
            
            // Download and send file content using SDK  
            const contentBuffer = await workspace.fs.downloadFile(filePath);
            await publish(taskChannel().update({
              taskId,
              message: {
                type: "file_content",
                data: {
                  filePath,
                  content: contentBuffer.toString('utf-8'),
                  encoding: 'utf-8'
                },
                jobId,
                ts: Date.now(),
              }
            }));
          }
        }
      } catch (dirError) {
        // Directory might not exist or no files - continue processing
        console.log(`No deliverable files found in ${dir}`);
      }
    }
  } catch (error) {
    console.error("Failed to scan deliverable files:", error);
    // Don't fail the main process, just log the error
  }
}

function getFileTypeFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md': return 'markdown';
    case 'txt': return 'text'; 
    case 'json': return 'json';
    case 'html': return 'html';
    case 'csv': return 'csv';
    default: return 'text';
  }
}

// Call after successful Claude execution and result publishing:
await scanDeliverableFiles(sandboxId, jobId, publish, taskId);
```

### New Message Types

**File Metadata Message**:
```typescript
{
  type: "file_created",
  data: {
    filePath: "deliverables/emails/investor-update-2025-08-18.md",
    fileName: "investor-update-2025-08-18.md", 
    fileType: "markdown",
    directory: "deliverables/emails",
    size: 2048,
    modifiedAt: 1755530280000,
    permissions: "644"
  },
  jobId: "job_xxx",
  ts: 1755530281000
}
```

**File Content Message**:
```typescript
{
  type: "file_content",
  data: {
    filePath: "deliverables/emails/investor-update-2025-08-18.md",
    content: "# Subject: Omni - 50% MRR Growth - August Update\n\nHi investors...",
    encoding: "utf-8"
  },
  jobId: "job_xxx", 
  ts: 1755530281000
}
```

## Frontend Implementation

### Task Store Updates

**Enhanced Task Interface** (`stores/tasks.ts`):
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
        permissions?: string;
      };
      content: string;
    };
  };
}
```

### Message Handling Updates

**Location**: `frontend/app/task/[id]/client-page.tsx` message handler

**Add new message type handlers**:
```typescript
if (message.type === "result") {
  // Existing Claude response handling
} else if (message.type === "file_created") {
  // Store file metadata
  updateTask(id, {
    files: {
      ...task?.files,
      [message.data.filePath]: {
        metadata: message.data,
        content: task?.files?.[message.data.filePath]?.content || ""
      }
    }
  });
} else if (message.type === "file_content") {
  // Store file content
  updateTask(id, {
    files: {
      ...task?.files,
      [message.data.filePath]: {
        metadata: task?.files?.[message.data.filePath]?.metadata || {},
        content: message.data.content
      }
    }
  });
}
```

### Right Panel UI (Option B: Tabbed File View)

**Structure**:
```jsx
{/* Right panel for deliverables */}
<div className="flex-1 bg-gradient-to-br from-muted/50 to-background">
  {/* File tabs at top */}
  <div className="border-b border-border bg-background/95 backdrop-blur">
    <Tabs value={activeFileTab} onValueChange={setActiveFileTab}>
      <TabsList>
        {Object.keys(task?.files || {}).map(filePath => (
          <TabsTrigger key={filePath} value={filePath}>
            {task?.files?.[filePath]?.metadata?.fileName}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  </div>
  
  {/* Active file content */}
  <ScrollArea className="h-full">
    <div className="p-6">
      {activeFileContent && (
        <FileContentRenderer 
          file={activeFileContent}
          metadata={activeFileMetadata}
        />
      )}
    </div>
  </ScrollArea>
</div>
```

**File Content Renderer Component**:
```typescript
function FileContentRenderer({ file, metadata }: {
  file: { content: string };
  metadata: { fileType: string; fileName: string };
}) {
  if (metadata.fileType === 'markdown') {
    return <Markdown>{file.content}</Markdown>;
  } else if (metadata.fileType === 'json') {
    return <JsonViewer content={file.content} />;
  } else {
    return <pre className="whitespace-pre-wrap font-mono text-sm">{file.content}</pre>;
  }
}
```

## Implementation Sequence

### Phase 1: Backend File Detection
1. **Update inngest.ts**: Add `scanDeliverableFiles()` function after Claude execution
2. **Test file detection**: Use SDK file operations for robust scanning
3. **Verify messages**: Ensure file messages are published to frontend

### Phase 2: Frontend Message Handling  
1. **Update task store**: Add files field to Task interface
2. **Add message handlers**: Process `file_created` and `file_content` messages
3. **Test store updates**: Verify files are stored correctly

### Phase 3: Right Panel UI
1. **Add tab navigation**: Use shadcn Tabs component for file switching
2. **Create file renderer**: Support markdown, text, JSON content types
3. **Style and polish**: Match existing design patterns

### Phase 4: Integration & Testing
1. **End-to-end test**: Create task, verify files appear in right panel
2. **Error handling**: Graceful handling of missing files or parsing errors
3. **Performance**: Optimize for multiple files and large content

## Key Advantages of SDK Approach

**vs Shell Commands**:
- ✅ **Type Safety**: FileInfo objects with proper metadata
- ✅ **Error Handling**: Built-in SDK error handling
- ✅ **Performance**: Direct API calls, no shell overhead
- ✅ **Rich Metadata**: Size, timestamps, permissions available
- ✅ **Reliability**: No shell escaping or path issues

**vs Manual File Watching**:
- ✅ **On-Demand**: Scan after Claude completion, not continuous monitoring
- ✅ **Targeted**: Only scan deliverable directories 
- ✅ **Efficient**: Single scan per Claude execution
- ✅ **Accurate**: No race conditions or timing issues

## Testing Strategy

1. **Backend Testing**: Verify file detection with sample deliverables
2. **Message Flow**: Confirm messages reach frontend correctly  
3. **UI Rendering**: Test tabbed navigation and content display
4. **Edge Cases**: Empty directories, unsupported files, large content

This plan leverages the robust Daytona SDK for reliable file operations while integrating seamlessly with the existing Inngest real-time messaging architecture.