import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/lessonprep': { target: 'http://localhost:5132', changeOrigin: true },
    },
  },
})
