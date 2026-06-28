import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="center" style={{ height: '100vh', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ maxWidth: 500, padding: 24, textAlign: 'center', borderColor: 'var(--red)' }}>
            <span style={{ fontSize: 48 }}>⚠️</span>
            <h2 style={{ marginTop: 12, marginBottom: 8 }}>Something went wrong</h2>
            <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
              The application encountered an unexpected error and could not render this page.
            </p>
            {this.state.error?.message && (
              <pre style={{
                textAlign: 'left',
                background: 'rgba(239, 68, 68, 0.08)',
                color: 'var(--red)',
                padding: 12,
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'var(--mono)',
                overflowX: 'auto',
                marginBottom: 20,
                border: '1px solid rgba(239, 68, 68, 0.2)',
                whiteSpace: 'pre-wrap'
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button className="primary" onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
