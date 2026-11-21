import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// API calls go directly to VITE_API_URL (see src/services/api.js), so no dev proxy is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  }
})
