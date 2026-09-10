import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

// Automatically compute dynamic version in format: v[YY].[M].[D].[today_commits]
// Example: v26.8.28.1 (Year 26, Month 8, Day 28, 1st commit today)
const now = new Date();
const yy = now.getFullYear() % 100;
const m = now.getMonth() + 1;
const d = now.getDate();

let todayCommits = 1;
let gitCommitShort = '';
try {
  const countOutput = execSync('git rev-list --count --since="midnight" HEAD').toString().trim();
  todayCommits = Math.max(1, parseInt(countOutput, 10) || 1);
  gitCommitShort = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  todayCommits = 1;
  gitCommitShort = 'dev';
}

const appSemVer = `v${yy}.${m}.${d}.${todayCommits}`;
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
    proxy: Object.fromEntries(
      [
        '/api',
        '/Avatar',
        '/Bills',
        '/Holiday',
        '/Attendance',
        '/Candidate-Document',
        '/Loan-Document',
        '/Loan-Signature',
        '/Resume',
        '/Job-Description',
        '/Offer-Letter',
        '/Training-Video'
      ].map(path => [
        path,
        {
          target: 'http://127.0.0.1:8081',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              if (res && !res.headersSent && !res.writableEnded && typeof res.writeHead === 'function') {
                try {
                  res.writeHead(502, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Bad Gateway / Proxy Error', message: err?.message }));
                } catch (_) {}
              }
            });
          }
        }
      ])
    ),
    historyApiFallback: true
  }
})
