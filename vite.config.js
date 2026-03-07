import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to FastAPI backend during development
    // so you never hit CORS issues locally
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Strip the /api prefix before forwarding to FastAPI
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
