# File Detection Implementation - COMPLETE

## Status: ✅ FULLY IMPLEMENTED AND WORKING

Implementation completed on August 19, 2025. The system successfully detects files created by Claude Code in Daytona sandboxes and displays them in the frontend with a tabbed interface.

## Architecture Overview

### Backend (✅ Complete)
- **Location**: `server/src/services/inngest.ts`
- **Method**: Shell-based file detection using `find`, `stat`, and `head` commands
- **Working Directory**: `/home/omni` (Claude's execution directory)
- **Message Types**: Publishes `file_created` and `file_content` messages via Inngest channels

### Frontend (✅ Complete) 
- **Location**: Global message handling in `frontend/providers/inngest-realtime-provider.tsx`
- **Display**: `frontend/app/task/[id]/client-page.tsx` with tabbed file view
- **Storage**: Files stored in Task interface `files` property

## Critical Architecture Lesson: Single Subscription Pattern

### ❌ What Doesn't Work: Dual Subscriptions
```typescript
// DON'T DO THIS - Only one subscription will receive messages
// Component 1: Global Provider
const { latestData } = useInngestSubscription({ ... })

// Component 2: Task-specific handler  
const { latestData } = useInngestSubscription({ ... }) // This will be silent!
```

### ✅ What Works: Single Global Subscription
All Inngest messages MUST be handled in one place - the `InngestRealtimeProvider`. This provider:
1. Receives ALL messages for ALL tasks
2. Routes messages to appropriate task stores
3. Handles all message types including files

## Message Flow

### 1. Backend Detection Flow
```typescript
// In processKnowledge function (inngest.ts)
1. recordExecutionStart() - Capture timestamp before Claude runs
2. executeClaudeCode() - Claude creates files in /home/omni
3. detectCreatedFiles() - Shell command finds new/modified files
4. processDetectedFile() - For each file:
   - Publish file_created message with metadata
   - Publish file_content message with content
```

### 2. Frontend Processing Flow
```typescript
// In InngestRealtimeProvider (inngest-realtime-provider.tsx)
1. Receives file_created message
   - Extracts metadata (fileName, fileType, size, etc.)
   - Updates task.files with metadata
   
2. Receives file_content message
   - Matches to existing file by filePath
   - Updates task.files with content
   
3. Task store triggers re-render
   - client-page.tsx detects task.files changes
   - Right panel switches to file view
   - Tabs display for multiple files
```

## File Message Structure

### file_created Message
```typescript
{
  type: "file_created",
  data: {
    filePath: "/home/omni/deliverables/memos/q3-update.md",
    fileName: "q3-update.md",
    fileType: "markdown",
    directory: "/home/omni/deliverables/memos",
    size: 2048,
    modifiedAt: 1755537000000
  },
  jobId: "job_xxx",
  ts: 1755537001000
}
```

### file_content Message
```typescript
{
  type: "file_content",
  data: {
    filePath: "/home/omni/deliverables/memos/q3-update.md",
    content: "# Q3 Investor Update\n\nOur MRR grew 50%..."
  },
  jobId: "job_xxx",
  ts: 1755537002000
}
```

## Frontend Components

### Task Interface Enhancement
```typescript
// stores/tasks.ts
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
      content?: string;
      status: 'new' | 'updated';
      updatedAt: number;
    };
  };
}
```

### File Display Components
1. **client-page.tsx**: Main task page with conditional right panel
   - Shows files with tabs when `task.files` exists
   - Falls back to shell output view when no files

2. **FileContentRenderer.tsx**: Renders individual file content
   - Supports Markdown, JSON, HTML, text formats
   - Shows file metadata (size, modified date)
   - Visual indicators for new files

## Implementation Files

### Backend Files Modified
- `server/src/services/inngest.ts` - Added shell-based file detection

### Frontend Files Modified
- `frontend/stores/tasks.ts` - Added files property to Task interface
- `frontend/providers/inngest-realtime-provider.tsx` - Added file message handlers
- `frontend/app/task/[id]/client-page.tsx` - Added tabbed file view
- `frontend/app/task/[id]/_components/file-content-renderer.tsx` - Created file renderer

### Removed (Not Needed)
- `frontend/app/task/[id]/_components/subscription-handler.tsx` - Was causing dual subscription conflict

## Key Implementation Details

### Backend Shell Commands
```bash
# Find files modified after timestamp
find /home/omni -type f -newermt "YYYY-MM-DD HH:MM:SS" \
  \( -name "*.md" -o -name "*.txt" -o -name "*.json" -o -name "*.html" -o -name "*.csv" \) \
  2>/dev/null | head -20

# Get file metadata
stat -c "%s %Y" "/path/to/file"

# Get file content (limited to 50KB)
head -c 50000 "/path/to/file"
```

### Frontend Message Handling
```typescript
// In inngest-realtime-provider.tsx
} else if (message.type === "file_created") {
  const data = message.data as FileMetadata;
  updateTask(taskId, {
    files: {
      ...currentTask.files,
      [data.filePath]: {
        metadata: data,
        content: currentTask.files?.[data.filePath]?.content || "",
        status: 'new',
        updatedAt: Date.now()
      }
    }
  });
} else if (message.type === "file_content") {
  const data = message.data as FileContent;
  // Update existing file with content
}
```

## Testing & Verification

### Backend Testing
```bash
cd server
bun run tests/06-file-detection-test.ts
```

### Frontend Testing
1. Create a task with prompt: "Create a Q3 investor update memo"
2. Check browser console for:
   - 📁 FILE_CREATED message received
   - 📄 FILE_CONTENT message received
   - 📂 Task files updated
3. Verify files appear in right panel with tabs
4. Test tab switching and content rendering

## Common Issues & Solutions

### Issue 1: Files Not Appearing
**Symptom**: File messages received but files don't show in UI
**Cause**: Dual subscription conflict - multiple `useInngestSubscription` hooks
**Solution**: Handle all messages in global `InngestRealtimeProvider`

### Issue 2: "System:" Messages in Chat
**Symptom**: File messages appear as "System: file_content - [object Object]"
**Cause**: Unknown message types being added to chat messages
**Solution**: Add explicit handlers for file message types

### Issue 3: TypeScript Errors
**Symptom**: "task.files is possibly undefined" errors
**Cause**: Optional chaining not used consistently
**Solution**: Use `task?.files` and proper null checks

## Performance Considerations

1. **File Size Limit**: Content limited to 50KB with `head -c 50000`
2. **File Count Limit**: Maximum 20 files detected per execution
3. **File Types**: Only text-based files (md, txt, json, html, csv)
4. **Real-time Updates**: Files appear immediately as messages are received

## Future Enhancements

1. **File Actions**: Add download, copy, and share buttons
2. **File Preview**: Enhanced preview for different file types
3. **File History**: Track file versions across task executions
4. **File Search**: Search within file contents
5. **File Export**: Bulk export all deliverables

## Maintenance Notes

### Adding New File Types
1. Update backend `find` command pattern in `detectCreatedFiles()`
2. Update `determineFileType()` function
3. Add renderer in `FileContentRenderer.tsx`

### Debugging File Detection
1. Check backend logs for shell command execution
2. Monitor browser console for message flow
3. Verify task.files state updates
4. Check right panel rendering logic

### Critical Rules
1. **NEVER** add another `useInngestSubscription` hook - use global provider
2. **ALWAYS** handle new message types in `inngest-realtime-provider.tsx`
3. **ALWAYS** use optional chaining for `task?.files`
4. **NEVER** modify `subscription-handler.tsx` - it should remain unused

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Inngest Function)               │
├─────────────────────────────────────────────────────────────┤
│ 1. Claude executes in /home/omni                            │
│ 2. Shell commands detect new files                          │
│ 3. Publish file_created + file_content messages             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Inngest Channels
                  ▼
┌─────────────────────────────────────────────────────────────┐
│           Frontend (InngestRealtimeProvider)                 │
├─────────────────────────────────────────────────────────────┤
│ 1. Single subscription receives ALL messages                 │
│ 2. Routes file messages to task.files                       │
│ 3. Updates task store triggering re-render                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Zustand Store
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend (client-page.tsx)                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Detects task.files changes                               │
│ 2. Renders tabbed file view in right panel                  │
│ 3. Uses FileContentRenderer for each file                   │
└─────────────────────────────────────────────────────────────┘
```

This implementation is production-ready and fully tested.