/**
 * src/services/api.js
 *
 * Central Axios instance used by every part of the app.
 *
 * Why a single instance?
 *  - One place to set the baseURL (reads from .env so it works in every environment)
 *  - Request interceptor automatically attaches the JWT Bearer token
 *  - Response interceptor handles 401 → redirect to login centrally
 */

import axios from 'axios'

// Vite exposes env vars prefixed with VITE_ at build time.
// Falls back to '/api' so the Vite dev-proxy handles local development.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor ────────────────────────────────────────────────────
// Runs before every outgoing request.
// Reads the stored token and injects it into the Authorization header.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor ───────────────────────────────────────────────────
// Runs after every response (including errors).
// On 401 Unauthorized we clear stale credentials and bounce to /login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      // Hard redirect — clears all React state cleanly.
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
