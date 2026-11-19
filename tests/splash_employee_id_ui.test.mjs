import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('SEC-019 database stores the full EMP-prefixed employee code', () => {
  const helper = read('backend/src/Utils/EmployeeId.php');
  assert.match(helper, /return 'EMP-' \. \(string\) random_int\(10_000_000, 99_999_999\)/);
  assert.doesNotMatch(helper, /return \(string\) random_int/, 'Do not save numeric-only employee codes');
});

test('employee views display the database employee ID directly without adding EMP-', () => {
  const files = [
    'frontend/src/pages/EmployeeDashboard.jsx',
    'frontend/src/pages/EmployeeProfile.jsx',
    'frontend/src/pages/EmployeeMobileProfile.jsx',
    'frontend/src/pages/AdminEmployees.jsx',
    'frontend/src/pages/AdminEmployeeView.jsx',
    'frontend/src/components/EmployeeSelect.jsx',
  ];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /formatEmployeeId|employeeIdDisplay|\`EMP-\$\{/,
      `No frontend prefix formatter or added EMP- allowed in ${file}`);
    assert.match(source, /employeeId/, `Database employeeId must be displayed in ${file}`);
  }
  assert.doesNotMatch(read('frontend/src/pages/EmployeeDashboard.jsx'), /Loading workspace\.\.\./);
});

test('startup waits at least three seconds and preloads authenticated route code', () => {
  const boot = read('frontend/src/performance/dashboardBoot.js');
  const auth = read('frontend/src/contexts/AuthContext.jsx');
  assert.match(boot, /MIN_SPLASH_MS\s*=\s*3000/);
  assert.match(boot, /queryClient\.ensureQueryData\(/);
  assert.match(boot, /if \(!profile \|\| profile\.forcePasswordChange\) return/);
  assert.match(boot, /isMaintenanceEnabled\(maintenanceMode\)/);
  assert.match(auth, /await prepareForDashboard\(verifiedProfile, statusPromise\)/);
  assert.match(auth, /await waitForMinimumSplash\(initialSplashStartedAt\.current\)/);
  assert.match(auth, /setLoading\(false\)/);
  assert.match(auth, /setTransitioning\(true\)/);
  assert.match(auth, /await waitForMinimumSplash\(splashStartedAt\)/);
});

test('desktop and mobile share a fresh dashboard request definition', () => {
  for (const path of ['frontend/src/pages/EmployeeDashboard.jsx', 'frontend/src/pages/EmployeeMobileDashboard.jsx']) {
    assert.match(read(path), /useQuery\(employeeDashboardQueryOptions\)/);
  }
  assert.match(read('frontend/src/pages/AdminDashboard.jsx'), /useQuery\(adminDashboardQueryOptions\)/);
  assert.doesNotMatch(read('frontend/src/components/SplashScreen.jsx'), /Loading workspace\.\.\./);
});

test('no Loading page text between splash and protected lazy routes', () => {
  const app = read('frontend/src/App.jsx');
  const auth = read('frontend/src/contexts/AuthContext.jsx');
  assert.match(app, /<Suspense fallback=\{null\}>/, 'Lazy navigation must not show a second full-page loader');
  assert.doesNotMatch(app, /Loading page\.\.\.|Opening workspace\.\.\./);
  assert.match(auth, /<SplashScreen \/>/, 'Three-second auth splash must remain intact');
  assert.match(read('frontend/src/performance/dashboardBoot.js'), /MIN_SPLASH_MS\s*=\s*3000/);
});
