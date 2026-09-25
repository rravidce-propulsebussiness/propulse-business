import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiTarget = process.env.VITE_DEV_API_TARGET || 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
          return undefined
        },
      },
    },
  },
  server: {
    headers: {
      'Referrer-Policy': 'no-referrer-when-downgrade',
    },
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/uploads': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
