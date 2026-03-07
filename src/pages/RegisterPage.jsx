/**
 * src/pages/RegisterPage.jsx
 *
 * FIX (Bug 7): Same focus-ring fix as LoginPage — replaced inline style
 * inputs with className="tele-input" + injected <style> block.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/authService'

const FIELDS = [
  { id: 'username',        label: 'Username',         type: 'text',     autoComplete: 'username',     placeholder: 'your_username' },
  { id: 'email',           label: 'Email',            type: 'email',    autoComplete: 'email',        placeholder: 'you@example.com' },
  { id: 'password',        label: 'Password',         type: 'password', autoComplete: 'new-password', placeholder: '••••••••' },
  { id: 'confirmPassword', label: 'Confirm Password', type: 'password', autoComplete: 'new-password', placeholder: '••••••••' },
]

export default function RegisterPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '',
  })
  const [error, setError]           = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      await register({
        username: formData.username,
        email:    formData.email,
        password: formData.password,
      })
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join(', '))
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={styles.page}>
      {/* ── Focus ring styles ── */}
      <style>{`
        .tele-input {
          width: 100%;
          box-sizing: border-box;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 6px;
          color: #e5e7eb;
          font-size: 0.95rem;
          padding: 0.65rem 0.85rem;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
          font-family: inherit;
        }
        .tele-input:focus {
          border-color: rgba(99,102,241,0.7);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.18);
        }
        .tele-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .tele-btn {
          margin-top: 1.5rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, #4f46e5, #06b6d4);
          border: none;
          border-radius: 6px;
          color: #fff;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          width: 100%;
          transition: opacity 0.2s, box-shadow 0.2s;
        }
        .tele-btn:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 4px 20px rgba(79,70,229,0.35);
        }
        .tele-btn:focus-visible {
          outline: 2px solid rgba(99,102,241,0.8);
          outline-offset: 2px;
        }
        .tele-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoMark}>T</div>
          <h1 style={styles.title}>teleSUST</h1>
          <p style={styles.subtitle}>Create your account</p>
        </div>

        {error && (
          <div style={styles.errorBanner} role="alert">
            <span>⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          {FIELDS.map(({ id, label, type, autoComplete, placeholder }, i) => (
            <div key={id}>
              <label style={styles.label} htmlFor={id}>{label}</label>
              <input
                id={id}
                name={id}
                type={type}
                autoComplete={autoComplete}
                required
                autoFocus={i === 0}
                placeholder={placeholder}
                value={formData[id]}
                onChange={handleChange}
                className="tele-input"
                disabled={isSubmitting}
              />
            </div>
          ))}

          <button type="submit" className="tele-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={styles.footerText}>
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
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
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
  header:     { textAlign: 'center', marginBottom: '2rem' },
  logoMark: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '52px', height: '52px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
    color: '#fff', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem',
  },
  title: {
    color: '#f0f0f5', fontSize: '1.6rem', fontWeight: 700,
    margin: '0 0 0.25rem', letterSpacing: '-0.02em',
  },
  subtitle:   { color: '#6b7280', fontSize: '0.875rem', margin: 0 },
  errorBanner: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.35)',
    borderRadius: '6px', color: '#fca5a5', fontSize: '0.875rem',
    padding: '0.65rem 0.9rem', marginBottom: '1.25rem',
    display: 'flex', alignItems: 'center', gap: '0.5rem',
  },
  form:       { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: {
    display: 'block', color: '#9ca3af', fontSize: '0.78rem', fontWeight: 500,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    marginTop: '0.75rem', marginBottom: '0.3rem',
  },
  footerText: {
    textAlign: 'center', color: '#6b7280',
    fontSize: '0.875rem', marginTop: '1.5rem', marginBottom: 0,
  },
  link: { color: '#06b6d4', textDecoration: 'none', fontWeight: 500 },
}
