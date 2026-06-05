import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().split('T')[0]),
    __APP_VERSION__: JSON.stringify('2.0.12'),
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
