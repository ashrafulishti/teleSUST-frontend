import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // No proxy needed — backend is deployed at https://telesust.onrender.com
    // Axios reads VITE_API_BASE_URL from .env and calls the Render URL directly.
  },
})
