import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = file => readFileSync(file, 'utf8');
const root = 'frontend/src';
const paths = [];
function visit(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) visit(path);
    else if (/\.[jt]sx?$/.test(path)) paths.push(path);
  }
}
visit(root);

const packageJson = JSON.parse(read('frontend/package.json'));
const packageLock = JSON.parse(read('frontend/package-lock.json'));
for (const name of [
  '@tanstack/react-query',
  '@tanstack/react-query-persist-client',
  '@tanstack/query-sync-storage-persister',
]) {
  assert(!packageJson.dependencies?.[name] && !packageJson.devDependencies?.[name],
    'Legacy package remains in frontend/package.json: ' + name);
  assert(!Object.keys(packageLock.packages || {}).some(p => p.endsWith('node_modules/' + name)),
    'Legacy package remains in npm lockfile: ' + name);
}

for (const path of paths) {
  const contents = read(path);
  assert.doesNotMatch(contents,
    /@tanstack\/react-query|QueryClientProvider|\bQueryClient\b|\buseQueryClient\b|\buseMutation\s*\(|\buseQuery\s*\(|\bqueryClient\b/,
    'Legacy client cache API remains in ' + path);
  if (!path.endsWith('api/browserStorage.js')) {
    assert.doesNotMatch(contents,
      /\bstaleTime\s*:|\bgcTime\s*:|\bplaceholderData\s*:|PersistQueryClientProvider|createSyncStoragePersister/,
      'No cache retention, stale view reuse, or storage persister in ' + path);
  }
}

const rootComponent = read('frontend/src/App.jsx');
const auth = read('frontend/src/contexts/AuthContext.jsx');
const requests = read('frontend/src/state/remote.js');
const boot = read('frontend/src/performance/dashboardBoot.js');
const warmup = read('frontend/src/performance/routeWarmup.js');
const storage = read('frontend/src/api/browserStorage.js');

assert.match(rootComponent, /<AuthProvider>/, 'Auth provider remains mounted');
assert.match(rootComponent, /<MaintenanceGate>/, 'Maintenance gate remains mounted');
assert.match(rootComponent, /<Suspense fallback=\{null\}>/, 'Lazy routes remain safe to mount');
assert.doesNotMatch(rootComponent, /QueryClientProvider/, 'No shared response cache provider');

assert.match(requests, /const mountedViews = new Set\(\)/,
  'Request state belongs only to live mounted views');
assert.match(requests, /mountedViews\.delete\(view\)/,
  'Unmount must discard request state');
assert.match(requests, /cancel\(\)/, 'Abandoned requests must be cancelled');
assert.match(requests, /sessionEpoch \+= 1/, 'Cross-account resets invalidate in-flight responses');
assert.doesNotMatch(requests, /localStorage|sessionStorage|indexedDB|persist/i,
  'Replacement must never retain HRMS records in browser storage');
assert.match(auth, /refreshControl\.reset\(\)/,
  'Login/logout must immediately clear mounted private state');
assert.match(auth, /await restoreSession\(\)/,
  'HttpOnly refresh / Android secure auth restore remains unchanged');
assert.match(auth, /await api\.get\('\/me'\)/,
  'Backend role verification remains authoritative');
assert.doesNotMatch(warmup, /api\.get|prefetchQuery|loadOnce/,
  'Code prefetch must not preload or cache private API data');
assert.match(boot, /await preloadInitialRoute\(/,
  'Verified boot still warms route code without retaining API records');
assert(storage.includes('REACT_QUERY_OFFLINE_CACHE') &&
  storage.includes('TANSTACK_QUERY_OFFLINE_CACHE'),
  'SEC-021 intentionally preserves cleanup of old private storage keys');

console.log('No shared React Query cache, zero active package imports, and SEC-021 preserved PASS');
