import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import path from 'path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mkcert()],
  server: {
    port: 8080,
    https: true,
    proxy: {
      '/payments/webhook': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
      },
      '/api/orders': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
        rewrite: p => p.replace(/^\/api\/orders/, '/orders'),
      },
      '/api/cart': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
        rewrite: p => p.replace(/^\/api\/cart/, '/cart'),
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure:false,
        rewrite: p => p.replace(/^\/api/, ''),
      },
      '/auth': {
       target: 'http://localhost:4000',
       changeOrigin: true,
       secure: false,
       bypass(req) {
         const isHtml = req.headers.accept && req.headers.accept.includes('text/html');
         const uiRoutes = ['/auth/reset', '/auth/reset-request', '/auth/verify'];
         // Only serve SPA for browser navigation; let XHR pass through to backend
         if (isHtml && uiRoutes.some((p) => req.url.startsWith(p))) {
           return '/index.html';
         }
       },
     },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@your-org/common': path.resolve(__dirname, '../common'),
    },
  },
});
