/**
 * src/pages/RegisterPage.jsx
 *
 * Fixes:
 * - Error from duplicate username/email now shows inline under the form
 * - Validation errors from Pydantic (422) are extracted and displayed
 * - Never crashes the page
 * - Mobile responsive
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { loginUser } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  function extractError(err) {
    const data = err?.response?.data
    if (!data) return err?.message ?? 'Registration failed. Please try again.'
    // Pydantic 422 returns { detail: [ { msg, loc } ] }
    if (Array.isArray(data.detail)) {
      return data.detail.map(d => d.msg).join(' · ')
    }
    if (typeof data.detail === 'string') return data.detail
    return 'Registration failed. Please try again.'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !email.trim() || !password) return
    setError('')
    setLoading(true)
    try {
      // Register then auto-login
      const { registerUser } = await import('../services/authService')
      await registerUser({ username: username.trim(), email: email.trim(), password })
      await loginUser(username.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <style>{`
        .tele-input {
          width: 100%; box-sizing: border-box;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 10px 14px;
          color: #e5e7eb; font-size: 14px;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .tele-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
        }
        .tele-input:hover:not(:focus) {
          border-color: rgba(255,255,255,0.2);
        }
        .tele-input::placeholder { color: rgba(255,255,255,0.25); }
        .tele-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .tele-btn {
          width: 100%; padding: 11px;
          background: linear-gradient(135deg, #4f46e5, #06b6d4);
          border: none; border-radius: 8px;
          color: #fff; font-size: 14px; font-weight: 600;
          font-family: 'Inter', sans-serif; cursor: pointer;
          transition: opacity 0.2s, box-shadow 0.2s;
        }
        .tele-btn:hover:not(:disabled) {
          opacity: 0.9;
          box-shadow: 0 4px 20px rgba(79,70,229,0.4);
        }
        .tele-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .tele-btn:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
      `}</style>

      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>💬</span>
          <h1 style={styles.logoText}>teleSUST</h1>
        </div>
        <p style={styles.subtitle}>Create your account</p>

        {error && (
          <div style={styles.errorBanner}>
            <span style={{ fontSize: 14 }}>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              className="tele-input"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              disabled={loading}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              className="tele-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              className="tele-input"
              type="password"
              placeholder="Min 8 chars, include a number"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <button
            className="tele-btn"
            type="submit"
            disabled={loading || !username.trim() || !email.trim() || !password}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0e0e14 0%, #13131e 100%)',
    padding: '1rem',
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '2rem',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 4,
  },
  logoIcon: { fontSize: 28 },
  logoText: {
    fontSize: 24,
    fontWeight: 800,
    color: '#f0f0f5',
    margin: 0,
    background: 'linear-gradient(135deg, #818cf8, #06b6d4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    marginBottom: 24,
    marginTop: 4,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 8,
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 1.4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '0.03em',
  },
  switchText: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 20,
    marginBottom: 0,
  },
  link: {
    color: '#818cf8',
    textDecoration: 'none',
    fontWeight: 500,
  },
}
