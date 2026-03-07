/**
 * src/context/AuthContext.jsx
 *
 * FIX (Problem 4): After login, call GET /auth/me to get the real user
 * object (id, username, email, is_admin, is_active) instead of relying
 * on decodeTokenPayload(), which only gives sub/iat/exp from the JWT and
 * never contains username.
 *
 * Also fixes session restore on page refresh — we now re-fetch /auth/me
 * on mount when a stored token is found, so the user object is always
 * fresh and complete (not a stale localStorage blob).
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { login as apiLogin, getMe } from '../services/authService'

const AuthContext = createContext(null)

const TOKEN_KEY = 'access_token'
const USER_KEY  = 'user'

function persistSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function readToken() {
  return localStorage.getItem(TOKEN_KEY)
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [token,     setToken]     = useState(null)
  const [user,      setUser]      = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // ── Restore session on mount ─────────────────────────────────────────────
  // Re-fetch /auth/me instead of trusting the localStorage user blob.
  // This guarantees the user object is always complete and up-to-date
  // (username, email, is_admin — none of which live in the JWT payload).
  useEffect(() => {
    const savedToken = readToken()
    if (!savedToken) {
      setIsLoading(false)
      return
    }

    // Optimistically set the token so the Axios interceptor can attach it
    setToken(savedToken)

    getMe()
      .then(freshUser => {
        setUser(freshUser)
        persistSession(savedToken, freshUser)
      })
      .catch(() => {
        // Token is expired or invalid — clear everything
        clearSession()
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  // ── loginUser ────────────────────────────────────────────────────────────

  const loginUser = useCallback(async (username, password) => {
    // 1. Exchange credentials for a JWT
    const data     = await apiLogin(username, password)
    const newToken = data.access_token

    // Persist token first so the Axios interceptor can attach it
    // to the immediately-following /auth/me request
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)

    // 2. Fetch the full user profile — this is the ONLY reliable way
    //    to get username/email/is_admin (they are NOT in the JWT payload)
    const fullUser = await getMe()

    setUser(fullUser)
    persistSession(newToken, fullUser)

    return fullUser
  }, [])

  // ── logoutUser ───────────────────────────────────────────────────────────

  const logoutUser = useCallback(() => {
    setToken(null)
    setUser(null)
    clearSession()
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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
