import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const root = read('frontend/src/App.jsx');
const auth = read('frontend/src/contexts/AuthContext.jsx');
const gate = read('frontend/src/components/MaintenanceGate.jsx');
const route = read('frontend/src/performance/InitialRouteWarmup.jsx');
const warm = read('frontend/src/performance/routeWarmup.js');
const status = read('frontend/src/performance/initialMaintenanceStatus.js');

assert(root.includes('<InitialRouteWarmup />')
  && root.indexOf('<InitialRouteWarmup />') < root.indexOf('<AuthProvider>'),
  'Route code should download concurrently with AuthProvider bootstrap');
assert.match(route, /useLocation\(\)/,
  'Current route code should be selected dynamically, not loaded all at once');
assert.match(route, /void preloadInitialRoute\(pathname\)/,
  'Route prefetch should run as an effect rather than a render side effect');
assert.match(warm, /const layoutModules = \[/,
  'Protected parent layout must preload alongside the nested route');
assert.match(warm, /return Promise\.all\(\[preloadingLayouts\.get\(key\), preloadRouteModule\(path\)\]\)/,
  'Preload current page and shell at the same time');
assert.doesNotMatch(route + warm, /PersistQueryClientProvider|sessionStorage\.(?:setItem|getItem)|localStorage\.(?:setItem|getItem)/,
  'No private browser persistence introduced during prefetch');
assert.match(auth, /const statusPromise = primeInitialMaintenanceStatus\(\);\s*try \{\s*const verifiedProfile = await fetchProfile\(\)/,
  'Start public maintenance check concurrently with secure profile validation');
assert.match(auth, /await prepareForDashboard\(verifiedProfile, statusPromise\)/,
  'Verified dashboard warmup must consume the same public maintenance status');
assert.match(auth, /await restoreSession\(\)/,
  'SEC-021: refresh-token rotation stays before authenticated /me');
assert.match(auth, /await api\.get\('\/me'\)/,
  'SEC-021: role and current profile remain verified by the backend');
assert.match(gate, /consumeInitialMaintenanceStatus\(\) \|\| api\.get\('\/news'/,
  'SEC-020: gate consumes recent public status or performs its own new check');
assert.match(gate, /shouldShowMaintenanceNotice\(/,
  'SEC-020: protected maintenance gate still enforces the notice');
assert.match(gate, /await fetchProfile\(\)/,
  'SEC-020: valid session is rehydrated after maintenance ends');
assert.match(status, /MAX_BOOT_STATUS_AGE_MS = 3000/,
  'Never reuse a stale maintenance status after a long auth bootstrap');
assert.match(status, /const pending = bootRequest;\s*bootRequest = null/,
  'Initial status may only be consumed once');
assert.doesNotMatch(status, /sessionStorage|localStorage/,
  'Maintenance startup status remains memory-only');

if (process.argv.includes('--built')) {
  const { readdirSync, readFileSync: readBinary } = await import('node:fs');
  const built = readdirSync('frontend/dist/assets').filter(p => p.endsWith('.js'))
    .map(p => readBinary('frontend/dist/assets/' + p, 'utf8')).join('\n');
  assert(!built.includes('hrms_refresh='),
    'No refresh credential may be embedded in the bundle');
}
console.log('Refresh bootstrap parallelism, maintenance and SEC-021 policy PASS');
