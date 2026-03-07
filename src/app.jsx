/**
 * src/App.jsx
 *
 * Defines the application's route tree using React Router v6.
 *
 * Route layout:
 *
 *   /login        → LoginPage       (public)
 *   /register     → RegisterPage    (public)
 *   /             → redirects to /dashboard
 *   /dashboard    → DashboardPage   (protected — requires auth)
 *   *             → redirects to /dashboard
 *
 * Adding a new protected route:
 *   1. Import your page component.
 *   2. Add a <Route path="/your-path" element={<YourPage />} /> inside the
 *      <Route element={<ProtectedRoute />}> block.
 *   That's it — ProtectedRoute handles the auth check for all children.
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Protected routes ── */}
        {/* All children of this Route require authentication. */}
        {/* ProtectedRoute redirects to /login if the user isn't signed in. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* Add more protected routes here, e.g.: */}
          {/* <Route path="/channels" element={<ChannelsPage />} /> */}
          {/* <Route path="/groups" element={<GroupsPage />} /> */}
        </Route>

        {/* ── Fallback redirects ── */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
