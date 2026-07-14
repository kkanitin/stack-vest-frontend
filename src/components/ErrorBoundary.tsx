import React from 'react';
import { Button } from '@/components/ui/button';
import './ErrorBoundary.css';

type Variant = 'page' | 'inline';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  variant?: Variant;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Logging hook point — swap for an external reporter (Sentry, etc.) later.
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, variant = 'page', fallback } = this.props;

    if (!hasError) return children;
    if (fallback) return fallback;

    const isPage = variant === 'page';

    return (
      <div className={`eb-root eb-root--${variant}`} role="alert">
        <svg
          className="eb-icon"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>

        <h1 className="eb-title headline-sm">Something went wrong</h1>
        <p className="eb-desc body-sm">
          An unexpected error occurred while rendering this {isPage ? 'page' : 'view'}.
          {isPage ? ' Try reloading the page.' : ' You can try again or navigate elsewhere.'}
        </p>

        {import.meta.env.DEV && error && (
          <details className="eb-details">
            <summary>Error details (dev only)</summary>
            <pre className="eb-pre">{error.message}{error.stack ? `\n\n${error.stack}` : ''}</pre>
          </details>
        )}

        <div className="eb-actions">
          {isPage ? (
            <Button onClick={() => window.location.reload()}>
              Reload page
            </Button>
          ) : (
            <Button onClick={this.reset}>
              Try again
            </Button>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
