/**
 * src/pages/DashboardPage.jsx
 *
 * Placeholder for the main authenticated view.
 * Replace the contents with your real application UI.
 */

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { user, logoutUser } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logoutUser()
    navigate('/login', { replace: true })
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoMark}>T</div>
          <h1 style={styles.title}>teleSUST Dashboard</h1>
        </div>
        <p style={styles.welcome}>
          Welcome back, <strong style={styles.username}>{user?.sub ?? user?.username ?? 'user'}</strong>
        </p>
        <p style={styles.hint}>
          This is a protected page. Replace this with your real UI.
        </p>
        <button onClick={handleLogout} style={styles.button}>
          Sign Out
        </button>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px', padding: '2.5rem 2rem', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', textAlign: 'center' },
  header: { marginBottom: '1.5rem' },
  logoMark: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', color: '#fff', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' },
  title: { color: '#f0f0f5', fontSize: '1.4rem', fontWeight: 700, margin: 0 },
  welcome: { color: '#9ca3af', marginBottom: '0.5rem' },
  username: { color: '#06b6d4' },
  hint: { color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' },
  button: { padding: '0.65rem 1.5rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' },
}
