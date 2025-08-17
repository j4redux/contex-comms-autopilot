"use client";

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class StreamErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Check if it's a stream cancellation error
    if (error.message?.includes("ReadableStream.cancel") || 
        error.message?.includes("stream locked by a reader")) {
      console.warn("Stream cancellation error caught by boundary:", error);
      // Don't render error UI for stream cancellation errors
      return { hasError: false };
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Don't log stream cancellation errors as they're expected during navigation
    if (!error.message?.includes("ReadableStream.cancel") && 
        !error.message?.includes("stream locked by a reader")) {
      console.error("Error boundary caught an error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center text-muted-foreground">
          <p>Something went wrong with the real-time connection.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}