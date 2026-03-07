/**
 * src/context/AuthContext.jsx
 *
 * Provides global authentication state to the entire React tree.
 *
 * What it does:
 *  1. Reads a persisted token from localStorage on first render so the user
 *     stays logged in across page refreshes.
 *  2. Exposes `user`, `token`, `isAuthenticated`, `isLoading`.
 *  3. Exposes `loginUser()` and `logoutUser()` actions that components call.
 *
 * Usage:
 *   // Wrap your app (done in main.jsx):
 *   <AuthProvider><App /></AuthProvider>
 *
 *   // Consume anywhere:
 *   const { user, isAuthenticated, loginUser, logoutUser } = useAuth()
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { login as apiLogin } from '../services/authService'

// ── Context creation ───────────────────────────────────────────────────────

const AuthContext = createContext(null)

// ── Storage helpers ────────────────────────────────────────────────────────
// Centralising localStorage keys avoids typo bugs scattered around the app.

const TOKEN_KEY = 'access_token'
const USER_KEY = 'user'

function persistSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function readSession() {
  const token = localStorage.getItem(TOKEN_KEY)
  const rawUser = localStorage.getItem(USER_KEY)
  const user = rawUser ? JSON.parse(rawUser) : null
  return { token, user }
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  // isLoading is true during the initial "restore session" phase so that
  // ProtectedRoute doesn't flash the login page on refresh.
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from localStorage on mount (runs once)
  useEffect(() => {
    const { token: savedToken, user: savedUser } = readSession()
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(savedUser)
    }
    setIsLoading(false)
  }, [])

  /**
   * loginUser — called by LoginPage after the user submits the form.
   *
   * @param {string} username
   * @param {string} password
   * @throws Will re-throw any Axios error so the form can display it.
   */
  const loginUser = useCallback(async (username, password) => {
    // Call the FastAPI /auth/login endpoint
    const data = await apiLogin(username, password)
    // data = { access_token: "...", token_type: "bearer" }

    const newToken = data.access_token

    // Build a minimal user object from the token.
    // If your backend also returns a user object, use that instead.
    // e.g. if data.user exists: const newUser = data.user
    const newUser = decodeTokenPayload(newToken)

    // Update React state
    setToken(newToken)
    setUser(newUser)

    // Persist so the session survives a browser refresh
    persistSession(newToken, newUser)

    return newUser
  }, [])

  /**
   * logoutUser — clears all auth state.
   */
  const logoutUser = useCallback(() => {
    setToken(null)
    setUser(null)
    clearSession()
    // Navigation is handled by the caller (e.g. navigate('/login'))
  }, [])

  const value = {
    token,
    user,
    isAuthenticated: !!token,
    isLoading,
    loginUser,
    logoutUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Consumer hook ──────────────────────────────────────────────────────────

/**
 * useAuth — shorthand hook to consume AuthContext.
 *
 * Throws a helpful error if used outside <AuthProvider> so bugs surface
 * immediately during development rather than as cryptic null-reference errors.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Decode the JWT payload (the middle Base64 segment) without verifying
 * the signature — verification happens on the server.
 * Returns an object with the claims, or an empty object on failure.
 */
function decodeTokenPayload(token) {
  try {
    const base64Payload = token.split('.')[1]
    const jsonStr = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(jsonStr)
  } catch {
    return {}
  }
}
