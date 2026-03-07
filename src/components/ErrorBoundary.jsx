/**
 * src/components/ErrorBoundary.jsx
 *
 * Catches any unhandled JS error in the React tree and shows a friendly
 * recovery screen instead of a blank white page.
 *
 * Without this, any uncaught render error kills the entire app and the
 * only recovery is a hard navigation (which is what users were experiencing).
 *
 * Usage: wrap the app root in main.jsx:
 *   <ErrorBoundary>
 *     <AuthProvider><App /></AuthProvider>
 *   </ErrorBoundary>
 */

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0e0e14',
        fontFamily: "'Inter', sans-serif",
        padding: '2rem',
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: 400,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ color: '#f0f0f5', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Reload app
          </button>
        </div>
      </div>
    )
  }
}
