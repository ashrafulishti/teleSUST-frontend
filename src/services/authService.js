/**
 * src/services/authService.js
 *
 * Thin wrappers around the FastAPI /auth/* endpoints.
 * Components should call these functions, not `api` directly,
 * so that URL paths are defined in exactly one place.
 */

import api from './api'

/**
 * POST /auth/login
 *
 * FastAPI's OAuth2PasswordRequestForm expects the body as
 * application/x-www-form-urlencoded with fields `username` and `password`.
 * (FastAPI's OAuth2PasswordBearer uses `username` even when the field
 *  is actually an email — adjust if your backend differs.)
 *
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ access_token: string, token_type: string }>}
 */
export async function login(username, password) {
  // FormData serialises as application/x-www-form-urlencoded automatically
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password)

  const response = await api.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return response.data
}

/**
 * POST /auth/register
 *
 * Sends a JSON body. Adjust the fields to match your RegisterSchema.
 *
 * @param {{ username: string, email: string, password: string }} userData
 * @returns {Promise<object>} The newly created user object
 */
export async function register(userData) {
  const response = await api.post('/auth/register', userData)
  return response.data
}

/**
 * GET /auth/me  (optional — add if your backend exposes this)
 *
 * Fetch the currently authenticated user's profile.
 * Used by AuthContext on page refresh to rehydrate state from the token.
 *
 * @returns {Promise<object>} User object
 */
export async function getMe() {
  const response = await api.get('/auth/me')
  return response.data
}
