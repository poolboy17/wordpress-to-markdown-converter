import React, { Component, ReactNode, ErrorInfo } from 'react';
import { ErrorMessage } from './ErrorMessage';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

/**
 * Error Boundary component to catch and display errors in the UI
 * Prevents the entire application from crashing when an error occurs
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: '',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      errorInfo: errorInfo.componentStack || String(errorInfo),
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: '',
    });
    // Optionally reload the page for a fresh start
    // window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // If a custom fallback is provided, use that
      if (fallback) {
        return fallback;
      }

      // Otherwise, use our default error UI
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="w-full max-w-xl mx-auto">
            <ErrorMessage
              title="Something went wrong"
              message={error?.message || 'An unexpected error occurred.'}
              severity="error"
              details={errorInfo}
              suggestions={[
                'Try refreshing the page',
                'Clear your browser cache',
                'If the problem persists, please contact support'
              ]}
              onRetry={this.handleReset}
            />
            
            <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Technical information
              </h3>
              
              <div className="overflow-auto max-h-64 rounded bg-gray-50 dark:bg-gray-900 p-4">
                <pre className="text-xs text-gray-800 dark:text-gray-300">{error?.stack}</pre>
              </div>
              
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}