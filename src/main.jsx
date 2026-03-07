/**
 * src/main.jsx
 *
 * Application entry point.
 *
 * Provider order matters — AuthProvider must wrap App (which contains
 * BrowserRouter and all routes) so that every component in the tree
 * can call useAuth().
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'

// Global reset — keeps the dark background flush to the viewport edge
const globalStyle = document.createElement('style')
globalStyle.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f0f1a; }
`
document.head.appendChild(globalStyle)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* AuthProvider gives every component access to auth state via useAuth() */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
