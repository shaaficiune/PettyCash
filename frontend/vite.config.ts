import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const rawTarget = env.VITE_BACKEND_URL;
  // Proxy target must be a full URL with protocol (http:// or https://)
  const backendTarget = (rawTarget && /^https?:\/\//i.test(rawTarget))
    ? rawTarget
    : 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
