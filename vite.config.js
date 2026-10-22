import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VERCEL || process.env.TAURI_ENV_PLATFORM ? '/' : '/WorkfyStation/',
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
})