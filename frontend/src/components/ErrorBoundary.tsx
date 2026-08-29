import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// The app previously had no error boundary anywhere — any uncaught render
// error unmounts the whole React tree, leaving a blank page with no clue
// what happened (only visible in the browser console, which isn't always
// available when debugging a report). This is a permanent safety net, not
// tour-specific: it stays useful for any future crash, anywhere in the app.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console -- last-resort diagnostic, this is the error boundary itself
    console.error("Unhandled error caught by ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
          <h1 className="text-xl font-semibold text-danger">Something went wrong</h1>
          <p className="max-w-md text-sm text-gray">{this.state.error.message}</p>
          <pre className="max-w-2xl overflow-auto rounded-md border border-gray/30 bg-white p-3 text-left text-xs text-gray">
            {this.state.error.stack}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
