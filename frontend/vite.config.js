import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const appVersion = new Date().getTime();

const versionPlugin = () => {
  return {
    name: 'version-plugin',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: appVersion })
      });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/version.json')) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ version: appVersion }));
        } else {
          next();
        }
      });
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion)
  },
  plugins: [
    react(), 
    tailwindcss(),
    versionPlugin()
  ],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/Avatar': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/Bills': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/Holiday': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/Attendance': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },

      '/Candidate-Document': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/Resume': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/Job-Description': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/Offer-Letter': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/Training-Video': {
        target: 'http://localhost:8081',
        changeOrigin: true
      }
    },
    historyApiFallback: true
  }
})
