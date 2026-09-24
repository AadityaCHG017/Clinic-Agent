import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="page-container center-content" style={{ minHeight: '60vh', textAlign: 'center' }}>
          <div className="error-card" style={{ maxWidth: 480, padding: '2rem', background: 'white', borderRadius: '1rem', boxShadow: 'var(--shadow-md)' }}>
            <AlertCircle size={48} style={{ color: 'var(--clr-danger-500)', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1rem' }}>
              We encountered an unexpected rendering error. Please try refreshing the page.
            </p>
            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={18} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
