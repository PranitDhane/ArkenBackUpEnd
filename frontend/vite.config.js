import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Mirror the nginx routing: /api/v1/hx/* → HX Engine (port 8100)
      // This makes SSE streams and respond endpoints resolve correctly in dev.
      // In production, nginx handles this routing instead.
      '/api/v1/hx': {
        target: 'http://localhost:8100',
        changeOrigin: true,
        // Required for SSE: disable response buffering
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-cache';
          });
        },
      },
    },
  },
})
