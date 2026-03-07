/**
 * src/pages/LoginPage.jsx
 *
 * Responsibilities:
 *  1. Renders a login form (username + password).
 *  2. On submit: calls AuthContext.loginUser() which hits POST /auth/login.
 *  3. On success: navigates to the page the user originally wanted, or /dashboard.
 *  4. On failure: displays the error message from the API.
 *
 * The component is intentionally "dumb" about HTTP — all networking lives in
 * AuthContext and authService.js.
 */

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { loginUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Where should we go after a successful login?
  // If the user was redirected here from a protected route, go back there.
  const from = location.state?.from?.pathname ?? '/dashboard'

  const [formData, setFormData] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear the error as soon as the user starts correcting their input
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await loginUser(formData.username, formData.password)
      navigate(from, { replace: true })
    } catch (err) {
      // FastAPI returns error details in err.response.data.detail
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else if (Array.isArray(detail)) {
        // Pydantic validation errors come as an array of objects
        setError(detail.map((d) => d.msg).join(', '))
      } else {
        setError('Login failed. Please check your credentials.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* ── Header ── */}
        <div style={styles.header}>
          <div style={styles.logoMark}>T</div>
          <h1 style={styles.title}>teleSUST</h1>
          <p style={styles.subtitle}>Sign in to continue</p>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={styles.errorBanner} role="alert">
            <span style={styles.errorIcon}>⚠</span> {error}
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <label style={styles.label} htmlFor="username">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            placeholder="your_username"
            value={formData.username}
            onChange={handleChange}
            style={styles.input}
            disabled={isSubmitting}
          />

          <label style={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            style={styles.input}
            disabled={isSubmitting}
          />

          <button type="submit" style={styles.button} disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* ── Footer link ── */}
        <p style={styles.footerText}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={styles.link}>
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}

// ── Inline styles ──────────────────────────────────────────────────────────
// Inline styles keep this file self-contained. For a larger project,
// move these to a CSS Module (LoginPage.module.css) or Tailwind classes.

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
    padding: '1rem',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '12px',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(12px)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoMark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '0.75rem',
  },
  title: {
    color: '#f0f0f5',
    fontSize: '1.6rem',
    fontWeight: 700,
    margin: '0 0 0.25rem',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '0.875rem',
    margin: 0,
  },
  errorBanner: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.35)',
    borderRadius: '6px',
    color: '#fca5a5',
    fontSize: '0.875rem',
    padding: '0.65rem 0.9rem',
    marginBottom: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  errorIcon: {
    flexShrink: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  label: {
    color: '#9ca3af',
    fontSize: '0.78rem',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginTop: '0.75rem',
  },
  input: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '6px',
    color: '#e5e7eb',
    fontSize: '0.95rem',
    padding: '0.65rem 0.85rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  button: {
    marginTop: '1.5rem',
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    transition: 'opacity 0.2s',
    fontFamily: 'inherit',
  },
  footerText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '0.875rem',
    marginTop: '1.5rem',
    marginBottom: 0,
  },
  link: {
    color: '#06b6d4',
    textDecoration: 'none',
    fontWeight: 500,
  },
}
