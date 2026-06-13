/**
 * Error fallback UI displayed when error boundary catches an error.
 */
import React from 'react';

interface ErrorFallbackProps {
  error: Error | null;
  onReset?: () => void;
}

export default function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  return (
    <div className="container">
      <div className="card" style={{ marginTop: '40px' }}>
        <h1 className="h1" style={{ color: 'var(--danger)' }}>
          Something went wrong
        </h1>

        <p className="p">
          An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
        </p>

        {error && (
          <div className="code" style={{ marginTop: '16px' }}>
            <strong>{error.name}:</strong> {error.message}
            {error.stack && (
              <pre style={{ marginTop: '8px', fontSize: '11px', opacity: 0.8 }}>
                {error.stack}
              </pre>
            )}
          </div>
        )}

        <div className="row" style={{ marginTop: '16px' }}>
          {onReset && (
            <button className="btn" onClick={onReset}>
              Try Again
            </button>
          )}

          <button
            className="btn"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>

          <button
            className="btn"
            onClick={() => (window.location.href = '/')}
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
