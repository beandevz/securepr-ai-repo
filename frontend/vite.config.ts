import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Supports two modes:
// 1) VITE_API_BASE_URL=/api and VITE_PROXY_TARGET=http://localhost:8000 -> dev proxy avoids CORS.
// 2) VITE_API_BASE_URL=http://localhost:8000 -> direct calls.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE_URL || '/api';
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8000';

  const proxy = apiBase.startsWith('/')
    ? {
        [apiBase]: {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(new RegExp('^' + apiBase), ''),
        },
      }
    : undefined;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy,
    },
  };
});
