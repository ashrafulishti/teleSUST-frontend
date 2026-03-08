/**
 * src/App.jsx
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Protected routes ── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        {/* ── Fallback ── */}
        {/* / and anything unknown → let ProtectedRoute decide:
            authenticated  → dashboard
            not logged in  → login
            Never send directly to /dashboard — that causes a redirect
            loop when the user isn't authenticated yet.         */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/login"     replace />} />
      </Routes>
    </BrowserRouter>
  )
}
