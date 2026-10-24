import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm p-6 md:p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
                {this.props.fallbackTitle || 'Something went wrong rendering this view'}
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                An unexpected interface error occurred. The application remains running.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-900 text-rose-300 p-3 rounded-lg text-xs font-mono max-h-32 overflow-y-auto">
                <div className="font-semibold text-rose-400">{this.state.error.name}: {this.state.error.message}</div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <a
                href="/dashboard"
                className="px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))] text-xs font-semibold hover:bg-[hsl(var(--secondary))] flex items-center gap-1.5 transition"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Dashboard</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
