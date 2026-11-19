import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = p => readFileSync(p, 'utf8');
const app = read('frontend/src/App.jsx');
const auth = read('frontend/src/contexts/AuthContext.jsx');
const admin = read('frontend/src/components/AdminLayout.jsx');
const employees = read('frontend/src/pages/AdminEmployees.jsx');
const attendance = read('frontend/src/pages/AdminAttendance.jsx');
const employeeView = read('frontend/src/pages/AdminEmployeeView.jsx');
const regularize = read('frontend/src/pages/AdminAttendanceRegularize.jsx');
const docs = read('frontend/src/pages/AdminVerifyDocuments.jsx');
const legacyInvalidationFixes = [
  'frontend/src/components/AddLeadSidebar.jsx',
  'frontend/src/pages/EditProfile.jsx',
  'frontend/src/pages/CandidateProfile.jsx',
  'frontend/src/components/MfaSecurityCard.jsx',
  'frontend/src/pages/EditMobileProfile.jsx',
  'frontend/src/pages/EmployeeProfile.jsx',
  'frontend/src/pages/CandidateDocuments.jsx',
  'frontend/src/pages/EmployeeMobileProfile.jsx',
  'frontend/src/pages/AdminEmployeeView.jsx',
];
for (const file of legacyInvalidationFixes) {
  assert.doesNotMatch(read(file), /queryClient\.invalidateQueries\(\[/,
    'Legacy invalidation is not supported by TanStack Query v5 in ' + file);
}
for (const file of ['frontend/src/pages/AdminPerformance.jsx', 'frontend/src/pages/CandidateDocuments.jsx']) {
  assert.doesNotMatch(read(file), /refetchOnMount:\s*['"]always['"]/,
    'Query-specific always-refresh should not override freshness policy in ' + file);
}

assert.match(app, /refetchOnMount:\s*true/, 'Mounted queries must respect freshness');
assert.doesNotMatch(app, /refetchOnMount:\s*['"]always['"]/, 'Unconditional mount refetch causes redundant requests');
assert.match(app, /QueryClientProvider/, 'Shared in-memory cache persists across SPA navigation');
assert.doesNotMatch(app, /PersistQueryClientProvider|createSyncStoragePersister/, 'SEC-021: no persistent private query cache');
const lazyPages = (app.match(/const \w+ = lazy\(\(\) => import\('\.\/pages\//g) || []).length;
assert(lazyPages >= 60, 'Route modules must use lazy imports: found ' + lazyPages);
for (const match of app.matchAll(/const \w+ = lazy\(\(\) => import\('\.\/(pages|components)\/([^']+)'\)\);/g)) {
  const path = 'frontend/src/' + match[1] + '/' + match[2];
  const moduleFile = [path + '.jsx', path + '.js'].find(existsSync);
  assert(moduleFile, 'Lazy route module missing: ' + path);
  assert.match(read(moduleFile), /\bexport\s+default\b|\bexport\s*\{[^}]*\bdefault\b/,
    'Lazy route module needs a default export: ' + moduleFile);
}
for (const file of ['frontend/src/pages/AdminEmployees.jsx', 'frontend/src/pages/AdminAttendance.jsx']) {
  assert.match(read(file), /queryFn:\s*async \(\{ signal \}\)/,
    'Cancel abandoned page queries during rapid navigation: ' + file);
}
// The admin dashboard now shares its abortable query with the pre-splash warmup.
assert.match(read('frontend/src/pages/AdminDashboard.jsx'), /useQuery\(adminDashboardQueryOptions\)/,
  'Admin dashboard must use its shared query definition');
assert.match(read('frontend/src/performance/dashboardBoot.js'),
  /queryFn:\s*async \(\{ signal \}\)/,
  'Admin dashboard warmup must still forward cancellation signals');
assert.match(app, /<Suspense fallback=\{/, 'Lazy routes require a suspense boundary');
assert(!/import AdminPayroll from|import AdminRecruitment from|import AdminAttendance from/.test(app),
  'Heavy protected pages must not be statically imported');
assert.doesNotMatch(auth, /remaining\s*=\s*1200|setTimeout\(resolve, remaining\)/,
  'SEC-021 protected startup cannot impose a 1200ms artificial timer');
assert.match(auth, /await fetchProfile\(\)/, 'Do not bypass server-authoritative session/profile verification');
assert.doesNotMatch(auth, /useLocation|location\.pathname|PUBLIC_ROUTES/,
  'AuthProvider must not subscribe to every route change after removing the timer');
assert.match(auth, /await restoreSession\(\)/, 'Do not bypass rotating HttpOnly refresh or Android secure session restore');
assert.match(auth, /queryClient\.clear\(\)/, 'Private cache must still clear on logout');
assert.match(admin, /enabled:\s*profile\?\.role === 'admin'/, 'Never request privileged badge counts as employee');
assert.match(admin, /refetchInterval:\s*30000/, 'Limit noncritical admin badge polling to 30s');
assert.match(employees, /staleTime:\s*60 \* 1000/, 'Employees should reuse their memory-only cache');
assert.match(attendance, /staleTime:\s*10 \* 1000/, 'Attendance should refresh soon after becoming stale');
assert.doesNotMatch(employeeView, /invalidateQueries\(\[/, 'TanStack Query v5 requires filter objects for invalidation');
assert.match(regularize, /invalidateQueries\(\{ queryKey: \['admin', 'attendance'\] \}\)/,
  'Regularizing attendance should refresh attendance lists');
assert.match(docs, /invalidateQueries\(\{ queryKey: \['admin_pending_docs'\] \}\)/,
  'Document changes must invalidate admin badge counts');

if (process.argv.includes('--built')) {
  const dir = 'frontend/dist/assets';
  const js = readdirSync(dir).filter(f => f.endsWith('.js'));
  const entry = js.find(f => /^index-[^/]+\.js$/.test(f));
  assert(entry, 'Vite entry asset must exist');
  const mainBytes = statSync(join(dir, entry)).size;
  assert(mainBytes < 3_500_000, 'Initial JS entry must be significantly smaller than old 4.65MB bundle: ' + mainBytes);
  assert(js.length >= 15, 'Route splitting must create lazy JS chunks');
  console.log('Vite entry bytes: ' + mainBytes + ', JS chunks: ' + js.length);
}
console.log('Frontend performance policy and SEC-021 preservation PASS');
