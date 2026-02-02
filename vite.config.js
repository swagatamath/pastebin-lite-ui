import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://pastebin-backend-new.vercel.app',
        changeOrigin: true,
        secure: true,
      },
      '/p': {
        target: 'https://pastebin-backend-new.vercel.app',
        changeOrigin: true,
        secure: true,
      }
    }
  }
})
