"use client";

import { Markdown } from "@/components/markdown";

interface FileData {
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
}

interface FileContentRendererProps {
  file: FileData;
  filePath: string;
}

export function FileContentRenderer({ file }: FileContentRendererProps) {
  if (!file.content) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <span className="text-sm">Loading file content...</span>
      </div>
    );
  }

  const renderContent = () => {
    const { fileType, fileName } = file.metadata;
    const content = file.content!;

    if (fileType === 'markdown' || fileName.endsWith('.md')) {
      // Use the Markdown component for markdown files
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Markdown>{content}</Markdown>
        </div>
      );
    } else if (fileType === 'json' || fileName.endsWith('.json')) {
      try {
        const parsed = JSON.parse(content);
        return (
          <pre className="bg-muted/50 p-4 rounded-lg overflow-auto text-sm font-mono">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch {
        return (
          <pre className="bg-muted/50 p-4 rounded-lg overflow-auto text-sm font-mono">
            {content}
          </pre>
        );
      }
    } else if (fileType === 'html' || fileName.endsWith('.html')) {
      // For HTML files, show the raw HTML code rather than rendering it
      return (
        <pre className="bg-muted/50 p-4 rounded-lg overflow-auto text-sm font-mono">
          {content}
        </pre>
      );
    } else {
      // Default text rendering
      return (
        <pre className="bg-muted/50 p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap">
          {content}
        </pre>
      );
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Simplified metadata header */}
      <div className="border-b pb-3 mb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Modified: {new Date(file.metadata.modifiedAt).toLocaleString()}
          </div>
          {file.status === 'new' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md text-xs font-medium">
              New
            </span>
          )}
        </div>
      </div>

      {/* File content - scrollable area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-4 pb-4">
        {renderContent()}
      </div>
    </div>
  );
}