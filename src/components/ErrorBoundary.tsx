import { Component, ErrorInfo, ReactNode } from 'react';

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface in console so we can grab it from the logs snapshot.
    console.error('[ErrorBoundary] Render error:', error, info.componentStack);
    this.setState({ error, info });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-lg w-full rounded-2xl border border-destructive/40 bg-card p-5 shadow-md">
            <h1 className="font-display text-xl font-bold text-destructive mb-2">Something crashed</h1>
            <p className="text-sm text-muted-foreground mb-3">{this.state.error.message}</p>
            {this.state.info?.componentStack && (
              <pre className="text-[11px] leading-tight overflow-auto max-h-64 bg-muted/40 p-2 rounded">
                {this.state.info.componentStack}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ error: null, info: null });
                window.location.href = '/';
              }}
              className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Reload home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
