/**
 * src/components/ProtectedRoute.jsx
 *
 * A wrapper component used in the router to guard private pages.
 *
 * Behaviour:
 *  - While the auth session is being restored from localStorage → renders nothing
 *    (avoids a flash of the login page on refresh).
 *  - If the user is not authenticated → redirects to /login, preserving the
 *    originally requested URL so we can redirect back after login.
 *  - If the user is authenticated → renders the child route.
 *
 * Usage in App.jsx:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Still reading localStorage — render nothing to avoid flicker
  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    // Pass the attempted path so LoginPage can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Render the matched child route
  return <Outlet />
}
