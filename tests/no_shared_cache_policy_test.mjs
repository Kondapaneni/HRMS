// First independent memory-only query pilot. Preserve SEC-021 constraints
// without forbidding the explicitly scoped, reviewed branch reference cache.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = path => readFileSync(path, 'utf8');
const paths = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) walk(file);
    else if (/\.[jt]sx?$/.test(file)) paths.push(file);
  }
}
walk('frontend/src');

const packageJson = JSON.parse(read('frontend/package.json'));
const lock = JSON.parse(read('frontend/package-lock.json'));
const version = packageJson.dependencies['@tanstack/react-query'];
assert(/^5\.[0-9]+\.[0-9]+$/.test(version), 'React Query v5 must be pinned for a reviewed pilot');
assert.equal(lock.packages[''].dependencies['@tanstack/react-query'], version);
assert.equal(lock.packages['node_modules/@tanstack/react-query']?.version, version);
assert.equal(lock.packages['node_modules/@tanstack/query-core']?.version, version);
for (const name of ['@tanstack/react-query-persist-client', '@tanstack/query-sync-storage-persister']) {
  assert(!packageJson.dependencies?.[name] && !packageJson.devDependencies?.[name]);
  assert(!Object.keys(lock.packages).some(p => p.endsWith('node_modules/' + name)));
}

for (const path of paths) {
  const text = read(path);
  const allowed = ['frontend/src/main.jsx', 'frontend/src/query/memoryClient.js',
    'frontend/src/query/useBranchDirectory.js'].includes(path);
  if (!allowed) {
    assert.doesNotMatch(text, /@tanstack\/react-query|\buseQuery\(|\buseMutation\(/,
      'Only the reviewed branch pilot may import TanStack Query: ' + path);
  }
  assert.doesNotMatch(text,
    /(?:localStorage|sessionStorage|indexedDB)\.(?:setItem|put)\s*\(\s*['"](?:hrms.?query|query.?cache|REACT_QUERY_OFFLINE_CACHE|TANSTACK_QUERY_OFFLINE_CACHE)/i,
    'No private query persistence in ' + path);
  assert.doesNotMatch(text, /PersistQueryClientProvider|createSyncStoragePersister/,
    'No persistence provider in ' + path);
}

const entry = read('frontend/src/main.jsx');
const auth = read('frontend/src/contexts/AuthContext.jsx');
const root = read('frontend/src/App.jsx');
const cache = read('frontend/src/query/memoryClient.js');
const branches = read('frontend/src/query/useBranchDirectory.js');
const requests = read('frontend/src/state/remote.js');
const storage = read('frontend/src/api/browserStorage.js');
const warmup = read('frontend/src/performance/routeWarmup.js');
const backend = read('backend/public/admin_employees_routes.php');
const index = read('backend/public/index.php');

assert.match(entry, /<QueryClientProvider client=\{memoryQueryClient\}>/);
assert.match(entry, /clearLegacySensitiveStorage\(\)/);
assert.match(entry, /registration\.unregister\(\)/);
assert.match(root, /<AuthProvider>/);
assert.match(root, /<MaintenanceGate>/);
assert.match(root, /<BackgroundLocationTracker \/>/);
assert.match(cache, /new QueryClient\(/);
assert.match(cache, /gcTime: 0/);
assert.match(cache, /memoryQueryClient\.cancelQueries\(\)/);
assert.match(cache, /memoryQueryClient\.clear\(\)/);
assert.match(cache, /String\(profile\?\.id \?\? ''\)/);
assert.match(branches, /api\.get\('\/branches', \{ signal \}\)/);
assert.match(branches, /staleTime: 5 \* 60 \* 1000/);
assert.match(branches, /gcTime: 5 \* 60 \* 1000/);
assert.match(branches, /\[401, 403\]/);
assert.match(branches, /discardPrivateQueries\(\)/);
assert.match(branches, /verified && !query\.isError/);
assert.equal((auth.match(/discardPrivateQueries\(\)/g) || []).length, 4,
  'Auth rejects account switching, logout, cross-tab logout and verified profile rejection');
assert.match(auth, /await restoreSession\(\)/);
assert.match(auth, /await api\.get\('\/me'\)/);
assert.match(requests, /const mountedViews = new Set\(\)/);
assert.match(requests, /sessionEpoch \+= 1/);
assert.doesNotMatch(requests, /localStorage|sessionStorage|indexedDB/);
assert.doesNotMatch(warmup, /api\.get|prefetchQuery|loadOnce/);
assert(storage.includes('REACT_QUERY_OFFLINE_CACHE') &&
  storage.includes('TANSTACK_QUERY_OFFLINE_CACHE'));
assert.match(backend, /SELECT id, name FROM branches ORDER BY id ASC/);
assert.match(backend, /new AuthMiddleware\(\['admin', 'employee'\]\)/);
assert.match(index, /withHeader\('Cache-Control', 'no-store'\)/);

console.log('Scoped in-memory branch cache, session isolation and SEC-021 policy PASS');
