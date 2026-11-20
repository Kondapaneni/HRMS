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
const requests = read('frontend/src/state/remote.js');
assert.match(requests, /gcTime: retention\?\.gcTime \?\? 0/,
  'Private HRMS reads must still have zero inactive retention by default');
assert.match(read('frontend/src/query/retentionPolicy.js'), /getRemoteRetention/,
  'Only explicit low-risk reference reads may retain cache entries');
assert.doesNotMatch(app, /QueryClient|PersistQueryClientProvider/);
assert.match(app, /<AuthProvider>/);
// A production incident proved Vite can build when a route guard references
// an undeclared const. Prevent the root router from crashing on every URL.
const routeDeclarationScope = app.slice(0, app.indexOf('function App()'));
for (const [name, roles] of Object.entries({
  ADMIN_DASHBOARD_ROLES: "['admin']",
  EMPLOYEE_DASHBOARD_ROLES: "['employee', 'hr', 'manager']",
  CANDIDATE_DASHBOARD_ROLES: "['candidate']",
})) {
  assert(routeDeclarationScope.includes('const ' + name + ' = ' + roles),
    'Route guard variable must be defined BEFORE App renders: ' + name);
}
assert.match(app, /\.\.\.ADMIN_DASHBOARD_ROLES, \.\.\.EMPLOYEE_DASHBOARD_ROLES/,
  'Protected admin shell must preserve its verified route role wiring');
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
  assert.match(read(file), /load:\s*async \(\{ signal \}\)/,
    'Abandoned page requests must remain abortable: ' + file);
}
assert.match(read('frontend/src/pages/AdminDashboard.jsx'), /useRemoteData\(adminDashboardRequest\)/);
assert.match(read('frontend/src/performance/dashboardBoot.js'), /load:\s*async \(\{ signal \}\)/);
assert.match(app, /<Suspense fallback=\{/, 'Lazy routes require a suspense boundary');
assert(!/import AdminPayroll from|import AdminRecruitment from|import AdminAttendance from/.test(app),
  'Heavy protected pages must not be statically imported');
assert.doesNotMatch(auth, /remaining\s*=\s*1200|setTimeout\(resolve, remaining\)/,
  'SEC-021 protected startup cannot impose a 1200ms artificial timer');
assert.match(auth, /await fetchProfile\(\)/, 'Do not bypass server-authoritative session/profile verification');
assert.doesNotMatch(auth, /useLocation|location\.pathname|PUBLIC_ROUTES/,
  'AuthProvider must not subscribe to every route change after removing the timer');
assert.match(auth, /await restoreSession\(\)/, 'Do not bypass rotating HttpOnly refresh or Android secure session restore');
assert.match(auth, /refreshControl\.reset\(\)/, 'Mounted private state cleared on logout');
assert.match(admin, /enabled:\s*profile\?\.role === 'admin'/,
  'Never request privileged badge counts as employee');
assert.match(admin, /pollEveryMs:\s*30000/, 'Limit badge polling to 30s');
assert.match(regularize, /refresh\(\{ scope: \['admin', 'attendance'\] \}\)/,
  'Attendance edits must refresh mounted attendance views');
assert.match(docs, /refresh\(\{ scope: \['admin_pending_docs'\] \}\)/,
  'Document changes must refresh mounted admin badge counts');
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
