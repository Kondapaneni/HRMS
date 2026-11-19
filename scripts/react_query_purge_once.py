#!/usr/bin/env python3
"""One-time branch-only removal of the legacy client query/cache library.

Not used at runtime. Converts all frontend imports to fresh-on-mount request
hooks and explicit notifications between mounted views. Does not touch backend
data, credentials, APKs, or the audited production branch.
"""
from pathlib import Path
import os, re

ROOT = Path('frontend/src')
REMOTE = ROOT / 'state' / 'remote.js'
IMPORT = re.compile(r'''import\s*\{([^}]+)\}\s*from\s*['"]@tanstack/react-query['"];?''')
CHANGED = []

for path in sorted(ROOT.rglob('*')):
    if path.suffix not in ('.jsx', '.js', '.tsx', '.ts') or path == REMOTE:
        continue
    original = path.read_text(encoding='utf-8')
    if '@tanstack/react-query' not in original:
        continue

    def redirect(match):
        fields = [p.strip() for p in match.group(1).split(',') if p.strip()]
        names = {
            'useQuery': 'useRemoteData',
            'useMutation': 'useRemoteTask',
            'useQueryClient': 'useRefreshControl',
        }
        if set(fields) - set(names) - {'keepPreviousData'}:
            raise RuntimeError(f'Unrecognized legacy import in {path}: {fields}')
        imports = [names[name] for name in fields if name in names]
        if not imports:
            return ''
        module = os.path.relpath(REMOTE, path.parent).replace(os.sep, '/')
        if not module.startswith('.'):
            module = './' + module
        return "import { " + ', '.join(imports) + " } from '" + module + "';"

    changed, num = IMPORT.subn(redirect, original)
    if num < 1 or '@tanstack/react-query' in changed:
        raise RuntimeError(f'Failed to remove legacy import: {path}')
    for old, new in (
        ('useQueryClient', 'useRefreshControl'),
        ('useMutation', 'useRemoteTask'),
        ('useQuery', 'useRemoteData'),
        ('queryClient', 'refreshControl'),
        ('queryKey', 'scope'),
        ('queryFn', 'load'),
        ('mutationFn', 'run'),
        ('refetchIntervalInBackground', 'reloadInBackground'),
        ('refetchInterval', 'pollEveryMs'),
        ('refetchOnWindowFocus', 'reloadOnFocus'),
        ('keepPreviousData', 'undefined'),
        ('getQueryCache().subscribe', 'subscribe'),
        ('getQueryState(', 'getState('),
        ('getQueryData(', 'peek('),
        ('setQueryData(', 'update('),
        ('invalidateQueries(', 'refresh('),
        ('refetchQueries(', 'refresh('),
        ('cancelQueries(', 'cancel('),
        ('resetQueries(', 'refresh('),
        ('removeQueries(', 'cancel('),
        ('refreshControl.clear()', 'refreshControl.reset()'),
    ):
        changed = re.sub(r'\b'+re.escape(old)+r'\b',new,changed) if old[0].isalpha() else changed.replace(old,new)

    # Time-based stale-while-revalidate and previous-view caching are removed.
    # Every mount/load receives a new request with no cross-route retention.
    changed = re.sub(
        r'(?m)^[ \t]*(?:staleTime|gcTime|placeholderData|refetchOnMount|refetchOnReconnect):[^\n]*\n',
        '', changed)
    # Prefix-based refresh notifications now use the generic "scope" key.
    if '@tanstack/react-query' in changed or re.search(r'\buse(Query|Mutation|QueryClient)\b', changed):
        raise RuntimeError(f'Unconverted legacy hook in {path}')
    if changed != original:
        path.write_text(changed, encoding='utf-8')
        CHANGED.append(str(path))

# Separate specialized files. Root no longer constructs any shared data cache.
path = ROOT / 'App.jsx'
s = path.read_text(encoding='utf-8')
s = re.sub(r"^import \{ QueryClient, QueryClientProvider \} from '@tanstack/react-query'\n", '', s, flags=re.M)
begin = s.index('const queryClient = new QueryClient({')
end = s.index('function App() {', begin)
s = s[:begin] + s[end:]
s = s.replace('<QueryClientProvider client={queryClient}>', '<>')
s = s.replace('</QueryClientProvider>', '</>')
if 'QueryClient' in s or 'queryClient' in s:
    raise RuntimeError('React Query provider still in App.jsx')
path.write_text(s, encoding='utf-8')
CHANGED.append(str(path))

# Route modules are still preloaded, but private API data is never prefetched
# into a shared client or retained between routes.
path = ROOT / 'performance/routeWarmup.js'
s = path.read_text(encoding='utf-8')
s = s.replace("import api from '../api/axios';\n", '')
begin = s.index('// Only a verified Admin session may prefetch private admin APIs.')
s = s[:begin] + """// Preload route *code only*. No private API prefetch or data retention.
// Protected API requests start after verified auth when the view mounts.
export function warmRoute(path, _unused, role) {
  if (!role) return Promise.resolve();
  return preloadRouteModule(path);
}
"""
path.write_text(s, encoding='utf-8')
CHANGED.append(str(path))

# Splash keeps verified session/maintenance checks and lazy code warmup, but
# avoids double-fetching data via a removed global cache.
path = ROOT / 'performance/dashboardBoot.js'
s = path.read_text(encoding='utf-8')
s = s.replace('employeeDashboardQueryOptions', 'employeeDashboardRequest')
s = s.replace('adminDashboardQueryOptions', 'adminDashboardRequest')
s = s.replace('queryKey:', 'scope:').replace('queryFn:', 'load:')
s = re.sub(r'(?m)^[ \t]*staleTime:[^\n]*\n', '', s)
s = s.replace('prepareAuthenticatedLanding(profile, queryClient, maintenanceMode)',
              'prepareAuthenticatedLanding(profile, maintenanceMode)')
start = s.index('  // Even admins require a successful /me before warming private data.')
end = s.index('\n}', start)
s = s[:start] + '  // No shared client cache: the mounted dashboard requests fresh data.\n' + s[end:]
s = s.replace("""The initial secure dashboard fetch is shared by desktop, mobile, and the
// auth splash. Keep its result exclusively in the in-memory QueryClient;
// logout clears it and no account's data is persisted to browser storage.""",
              """Desktop and mobile share the request definition, not fetched records.
// Every dashboard mount performs its own authorized, fresh server request.""")
s = s.replace("""Wait for the initial authorized query while splash is
 * visible so there is no second full-screen "Loading workspace" transition.""",
              """Wait for route module loading during the verified auth splash.""")
path.write_text(s, encoding='utf-8')
CHANGED.append(str(path))

path = ROOT / 'contexts/AuthContext.jsx'
s = path.read_text(encoding='utf-8')
s = s.replace('prepareAuthenticatedLanding(verifiedProfile, refreshControl, maintenanceMode)',
              'prepareAuthenticatedLanding(verifiedProfile, maintenanceMode)')
path.write_text(s, encoding='utf-8')

# Queries in dashboard components now refer to fresh request definitions.
for path in (ROOT / 'pages/EmployeeDashboard.jsx', ROOT / 'pages/EmployeeMobileDashboard.jsx',
             ROOT / 'pages/AdminDashboard.jsx'):
    s = path.read_text(encoding='utf-8')
    s = s.replace('employeeDashboardQueryOptions', 'employeeDashboardRequest')
    s = s.replace('adminDashboardQueryOptions', 'adminDashboardRequest')
    path.write_text(s, encoding='utf-8')

# Keep the important SEC-008/021, maintenance and lazy-route policies, updating
# assertions that previously assumed a shared React Query cache.
p = Path('tests/perf_frontend_policy_test.mjs')
s = p.read_text(encoding='utf-8')
start = s.index('const legacyInvalidationFixes = [')
end = s.index('const lazyPages =', start)
s = s[:start] + """const requests = read('frontend/src/state/remote.js');
assert.match(requests, /No data is retained when a view unmounts/);
assert.doesNotMatch(app, /QueryClient|PersistQueryClientProvider/);
assert.match(app, /<AuthProvider>/);
""" + s[end:]
start = s.index("for (const file of ['frontend/src/pages/AdminEmployees.jsx', 'frontend/src/pages/AdminAttendance.jsx'])")
end = s.index("assert.match(app, /<Suspense fallback=", start)
s = s[:start] + """for (const file of ['frontend/src/pages/AdminEmployees.jsx', 'frontend/src/pages/AdminAttendance.jsx']) {
  assert.match(read(file), /load:\\s*async \\(\\{ signal \\}\\)/,
    'Abandoned page requests must remain abortable: ' + file);
}
assert.match(read('frontend/src/pages/AdminDashboard.jsx'), /useRemoteData\\(adminDashboardRequest\\)/);
assert.match(read('frontend/src/performance/dashboardBoot.js'), /load:\\s*async \\(\\{ signal \\}\\)/);
""" + s[end:]
start = s.index("assert.match(auth, /queryClient")
end = s.index("if (process.argv.includes('--built'))", start)
s = s[:start] + """assert.match(auth, /refreshControl\\.reset\\(\\)/, 'Mounted private state cleared on logout');
assert.match(admin, /enabled:\\s*profile\\?\\.role === 'admin'/,
  'Never request privileged badge counts as employee');
assert.match(admin, /pollEveryMs:\\s*30000/, 'Limit badge polling to 30s');
assert.match(regularize, /refresh\\(\\{ scope: \\['admin', 'attendance'\\] \\}\\)/,
  'Attendance edits must refresh mounted attendance views');
assert.match(docs, /refresh\\(\\{ scope: \\['admin_pending_docs'\\] \\}\\)/,
  'Document changes must refresh mounted admin badge counts');
""" + s[end:]
p.write_text(s, encoding='utf-8')

p = Path('tests/perf_cold_route_policy_test.mjs')
s = p.read_text(encoding='utf-8')
start = s.index('assert.match(layout, /queryClient')
end = s.index('for (const p of [',start)
s = s[:start] + """assert.match(layout, /refreshControl\\.getState\\(\\['admin', 'dashboard'\\]\\)\\?\\.status !== 'success'/,
  'Do not load other route chunks until dashboard data arrives');
assert.match(layout, /profile\\?\\.role !== 'admin'/,
  'Admin route preloading must require authenticated admin role');
assert.match(routeWarmup, /return preloadRouteModule\\(path\\)/,
  'Only route code is prefetched; not private API responses');
assert.doesNotMatch(routeWarmup, /api\\.get|fetchQuery|prefetchQuery|localStorage|sessionStorage/,
  'Route warmup may not cache or persist private API records');
assert.doesNotMatch(app, /QueryClientProvider/, 'Root must not retain cross-route responses');

""" + s[end:]
p.write_text(s, encoding='utf-8')

p = Path('tests/sec021_policy_test.mjs')
s = p.read_text(encoding='utf-8')
s = s.replace("assert(root.includes('QueryClientProvider') && root.includes('queryClient'),\n  'Private queries remain in a short-lived memory-only React Query cache');",
              "assert(!root.includes('QueryClientProvider') && !root.includes('queryClient'),\n  'No React Query provider or private cross-route client cache exists');")
s = s.replace("auth.includes('queryClient.clear()')", "auth.includes('refreshControl.reset()')")
p.write_text(s, encoding='utf-8')

p = Path('tests/sec008_frontend_security_test.mjs')
s = p.read_text(encoding='utf-8').replace('queryClient', 'refreshControl').replace('clear', 'reset')
p.write_text(s, encoding='utf-8')

p = Path('tests/splash_employee_id_ui.test.mjs')
s = p.read_text(encoding='utf-8')
s = s.replace("test('startup waits at least three seconds and waits for verified dashboard warmup'",
              "test('startup waits at least three seconds and preloads authenticated route code'")
s = s.replace('/queryClient\\\\.ensureQueryData\\\\(/', '/await preloadInitialRoute\\\\(/')
s = s.replace("test('desktop and mobile share a single dashboard bootstrap query'",
              "test('desktop and mobile share a fresh dashboard request definition'")
s = s.replace('/useQuery\\\\(employeeDashboardQueryOptions\\\\)/', '/useRemoteData\\\\(employeeDashboardRequest\\\\)/')
s = s.replace('/useQuery\\\\(adminDashboardQueryOptions\\\\)/', '/useRemoteData\\\\(adminDashboardRequest\\\\)/')
p.write_text(s, encoding='utf-8')

# Do not silently allow unconverted imports in any application module.
unconverted = []
for path in ROOT.rglob('*'):
    if path.suffix in ('.js', '.jsx', '.ts', '.tsx'):
        text = path.read_text(encoding='utf-8')
        if '@tanstack/react-query' in text or 'QueryClientProvider' in text or (
            re.search(r'\b(?:useQuery|useMutation|useQueryClient|queryClient)\b', text)
        ):
            unconverted.append(str(path))
if unconverted:
    raise RuntimeError('Unconverted modules: ' + ', '.join(unconverted))
print(f'REMOVED_REACT_QUERY_IMPORTS converted_files={len(CHANGED)}')
for name in CHANGED:
    print('  ', name)
