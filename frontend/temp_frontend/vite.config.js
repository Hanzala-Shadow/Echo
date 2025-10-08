import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  define: {
    global: 'globalThis',
  },
  
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy for weather API to avoid CORS issues
      '/api/weather': {
        target: 'https://wttr.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/weather/, ''),
        secure: true
      }
    }
  },
  preview: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  root: '.',
  publicDir: 'public'
})