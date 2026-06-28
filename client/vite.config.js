import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4001',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
              return; // Silence harmless client-disconnect warnings
            }
            console.error('WebSocket proxy error:', err);
          });
        },
      },
    },
  },
});
  