// Application-wide TanStack Query with selective, reviewed reference retention.
// Private HRMS business records continue to have zero cross-route retention.
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
for (const name of ['query-core', 'react-query']) {
  assert.match(lock.packages['node_modules/@tanstack/' + name]?.integrity || '',
    /^sha512-[A-Za-z0-9+/]+={0,2}$/, 'Pinned npm package must be integrity checked: ' + name);
}
for (const name of ['@tanstack/react-query-persist-client', '@tanstack/query-sync-storage-persister']) {
  assert(!packageJson.dependencies?.[name] && !packageJson.devDependencies?.[name]);
  assert(!Object.keys(lock.packages).some(p => p.endsWith('node_modules/' + name)));
}

for (const path of paths) {
  const text = read(path);
  const allowed = ['frontend/src/main.jsx', 'frontend/src/query/memoryClient.js',
    'frontend/src/query/useBranchDirectory.js',
    'frontend/src/state/remote.js',
    'frontend/src/query/publishedJobCatalog.js',
    'frontend/src/query/retentionPolicy.js'].includes(path);
  if (!allowed) {
    assert.doesNotMatch(text,
      /@tanstack\/react-query|QueryClientProvider|\bQueryClient\b|\buseQueryClient\b|\buseQuery\s*\(|\buseMutation\s*\(|\bqueryClient\b/,
      'TanStack Query imports must use the reviewed central read/task layer: ' + path);
    if (!path.endsWith('api/browserStorage.js')) {
      assert.doesNotMatch(text, /\bstaleTime\s*:|\bgcTime\s*:|\bplaceholderData\s*:/,
        'Only reviewed central query modules may set cache options: ' + path);
    }
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
const retentionPolicy = read('frontend/src/query/retentionPolicy.js');
const publishedJobs = read('frontend/src/query/publishedJobCatalog.js');
const candidateJobs = read('frontend/src/pages/CandidateJobs.jsx');
const candidateDashboard = read('frontend/src/pages/CandidateDashboard.jsx');
const storage = read('frontend/src/api/browserStorage.js');
const warmup = read('frontend/src/performance/routeWarmup.js');
const backend = read('backend/public/admin_employees_routes.php');
const index = read('backend/public/index.php');

assert.match(entry, /<QueryClientProvider client=\{memoryQueryClient\}>/);
assert.match(entry, /clearLegacySensitiveStorage\(\)/);
assert.match(entry, /registration\.unregister\(\)/);
assert.match(root, /<AuthProvider>/);
assert.match(root, /<MaintenanceGate>/);
assert.match(root, /<Suspense fallback=\{null\}>/, 'Route-level lazy loading must remain intact');
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
assert.match(branches, /verified && !permissionDenied && !query\.isError/);
assert.match(branches, /enabled: Boolean\(enabled && verified && !permissionDenied\)/);
assert.match(branches, /if \(!signal\.aborted && \[401, 403\]/);
assert.match(branches, /setPermissionDenied\(true\)/);
assert.equal((auth.match(/discardPrivateQueries\(\)/g) || []).length, 4,
  'Auth rejects account switching, logout, cross-tab logout and verified profile rejection');
assert.match(auth, /refreshControl\.reset\(\)/,
  'Nonpilot remote state must reset on account changes');
assert.match(auth, /await restoreSession\(\)/);
assert.match(auth, /await api\.get\('\/me'\)/);
assert.match(requests, /const mountedViews = new Set\(\)/);
assert.match(requests, /useQuery\(\{/,
  'Mounted read views must execute through TanStack Query');
assert.match(requests, /useMutation\(\{/,
  'Mounted tasks must execute through TanStack Mutation');
assert.match(requests, /staleTime: retention\?\.staleTime \?\? 0/,
  'Protected reads must default to zero stale time');
assert.match(requests, /gcTime: retention\?\.gcTime \?\? 0/,
  'Protected reads must default to zero unmount retention');
assert.match(requests, /getRemoteRetention\(scope\)/,
  'Only explicitly reviewed scopes may opt into retention');
assert.match(requests, /sessionEpoch, viewId.current, scopeId/,
  'Protected query keys must isolate mount instance, auth epoch and filters');
assert.match(requests, /blockedAfterReset/,
  'Mounted protected views must stay disabled on logout');
assert.match(requests, /refetchOnMount: retention \? true : 'always'/,
  'Fresh reference cache may be reused; protected data always refreshes');
assert.match(requests, /query\.meta\?\.hrmsRetained === true/,
  'Any explicit refresh must invalidate unmounted retained scopes');
assert.match(requests, /query\.meta\?\.hrmsPublishedJobs === true/,
  'Successful mutations must invalidate published jobs');
assert.match(retentionPolicy, /scope\[1\] === 'holidays'/,
  'Holiday scopes are explicitly allowlisted');
assert.match(retentionPolicy, /scope\[1\] === 'holidays-archive'/);
assert.doesNotMatch(retentionPolicy,
  /scope\\[1\\] === '(?:payroll|attendance|dashboard|leads|applications|permissions|feature-access|gps|employees)'/i,
  'Private business scopes must never be allowlisted for retention');
assert.match(publishedJobs, /api\.get\('\/candidate\/jobs', \{ signal \}\)/);
assert.match(publishedJobs, /\['candidate', 'employee'\]/,
  'Only verified candidate or employee may load the shared job catalog');
assert.match(publishedJobs, /discardPrivateQueries\(\)/,
  'Auth failures must clear the private QueryClient');
assert.match(candidateJobs, /fetchPublishedJobCatalog\(profile\)/);
assert.match(candidateDashboard, /fetchPublishedJobCatalog\(profile\)/);
assert.match(candidateJobs, /api\.get\('\/candidate\/applications'\)/,
  'Candidate applications must remain fresh independently');
assert.match(candidateDashboard, /api\.get\('\/candidate\/applications'\)/,
  'Candidate dashboard private application data must remain fresh');
assert.match(requests, /epoch !== sessionEpoch \|\| signal.aborted/,
  'Late requests must never restore data after account switch');
assert.match(requests, /mountedViews\.delete\(view\)/, 'Legacy views discard state on unmount');
assert.match(requests, /cancel\(\)/, 'Abandoned legacy requests are canceled');
assert.match(requests, /sessionEpoch \+= 1/);
assert.doesNotMatch(requests, /localStorage|sessionStorage|indexedDB/);
assert.doesNotMatch(warmup, /api\.get|prefetchQuery|loadOnce/);
const boot = read('frontend/src/performance/dashboardBoot.js');
assert.match(boot, /await preloadInitialRoute\(/,
  'Existing code-only preloading remains unchanged');
assert(storage.includes('REACT_QUERY_OFFLINE_CACHE') &&
  storage.includes('TANSTACK_QUERY_OFFLINE_CACHE'));
assert.match(backend, /SELECT id, name FROM branches ORDER BY id ASC/);
assert.match(backend, /new AuthMiddleware\(\['admin', 'employee'\]\)/);
assert.match(index, /withHeader\('Cache-Control', 'no-store'\)/);

const addEmployee = read('frontend/src/components/AddEmployeeModal.jsx');
const recruitment = read('frontend/src/pages/AdminRecruitment.jsx');
const editEmployee = read('frontend/src/pages/AdminEmployeeEdit.jsx');
assert.match(addEmployee, /if \(branchesLoading \|\| branchesError \|\|/,
  'Employee creation must fail closed during branch lookup errors');
assert.match(addEmployee, /disabled=\{loading \|\| branchesLoading \|\| branchesError \|\| !branches\.some/,
  'Cannot submit a new employee with a missing or stale branch');
assert.match(recruitment, /const validConversionBranch = !branchesLoading && !branchesError/,
  'Candidate conversion requires a fresh enough valid branch selection');
assert.match(recruitment, /if \(!selectedApp \|\| !validConversionBranch\)/,
  'Candidate conversion handler refuses an invalid branch');
assert.match(recruitment, /disabled=\{convertEmployeeMutation\.isPending \|\| !validConversionBranch\}/,
  'Candidate conversion action is disabled without a valid branch');
assert.match(editEmployee, /onClick=\{\(\) => void branchesQuery\.refetch\(\)\}/,
  'Employee edit must offer a safe retry after a branch request error');

console.log('Scoped in-memory branch cache, session isolation and SEC-021 policy PASS');
