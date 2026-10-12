import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, createLogger } from 'vite';

const customLogger = createLogger();
const originalError = customLogger.error;
customLogger.error = (msg, options) => {
  // Filter out transient proxy connection refused messages while backend starts/reloads
  if (typeof msg === 'string' && (msg.includes('ECONNREFUSED') || msg.includes('ws proxy error'))) {
    return;
  }
  originalError(msg, options);
};

export default defineConfig({
  appType: 'spa',
  customLogger,
  root: path.resolve(__dirname),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
      },
    },
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : undefined,
  },
});
