import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

// Automatically compute dynamic version based on Git commits
let gitCommitCount = 0;
let gitCommitShort = '';
try {
  gitCommitCount = parseInt(execSync('git rev-list --count HEAD').toString().trim(), 10) || 0;
  gitCommitShort = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  gitCommitCount = 1;
  gitCommitShort = 'dev';
}

const appSemVer = `v2.4.${gitCommitCount}`;
const appVersion = new Date().getTime();

const versionPlugin = () => {
  return {
    name: 'version-plugin',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ 
          version: appVersion, 
          semver: appSemVer, 
          commit: gitCommitShort 
        })
      });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/version.json')) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            version: appVersion, 
            semver: appSemVer, 
            commit: gitCommitShort 
          }));
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
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_APP_SEMVER': JSON.stringify(appSemVer),
    'import.meta.env.VITE_APP_GIT_COMMIT': JSON.stringify(gitCommitShort),
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
      '/Loan-Document': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/Loan-Signature': {
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
