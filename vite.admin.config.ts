import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function adminHtmlPlugin(): Plugin {
  return {
    name: 'admin-html-plugin',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '/index.html') {
          req.url = '/admin.html';
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), adminHtmlPlugin()],
  server: {
    port: 5174,
    host: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/data/**', '**/caic_db.json', '**/data/*'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5173',
        changeOrigin: true,
      },
    },
  },
});
