import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { formatEmployeeId } from '../frontend/src/utils/employeeIdDisplay.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('SEC-019 eight-digit employee ID is prefixed for display only', () => {
  assert.equal(formatEmployeeId('12345678'), 'EMP-12345678');
  assert.equal(formatEmployeeId(12345678), 'EMP-12345678');
  assert.equal(formatEmployeeId(' 12345678 '), 'EMP-12345678');
  assert.equal(formatEmployeeId('EMP-12345678'), 'EMP-12345678');
  assert.equal(formatEmployeeId('EMP-LEGACY'), 'EMP-LEGACY');
  assert.equal(formatEmployeeId('EMP001'), 'EMP001');
  assert.equal(formatEmployeeId('abc-def'), 'abc-def');
  assert.equal(formatEmployeeId(''), 'Not set');
  assert.equal(formatEmployeeId(null, '-'), '-');
});

test('all major employee ID views use the display formatter', () => {
  const files = [
    'frontend/src/pages/EmployeeDashboard.jsx',
    'frontend/src/pages/EmployeeProfile.jsx',
    'frontend/src/pages/EmployeeMobileProfile.jsx',
    'frontend/src/pages/AdminEmployees.jsx',
    'frontend/src/pages/AdminEmployeeView.jsx',
    'frontend/src/components/EmployeeSelect.jsx',
  ];
  for (const file of files) {
    assert.match(read(file), /formatEmployeeId\(/, `Expected formatted employee display in ${file}`);
  }
  assert.doesNotMatch(read('frontend/src/pages/EmployeeDashboard.jsx'), /Loading workspace\.\.\./);
});

test('startup waits at least three seconds and waits for verified dashboard warmup', () => {
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

test('desktop and mobile share a single dashboard bootstrap query', () => {
  for (const path of ['frontend/src/pages/EmployeeDashboard.jsx', 'frontend/src/pages/EmployeeMobileDashboard.jsx']) {
    assert.match(read(path), /useQuery\(employeeDashboardQueryOptions\)/);
  }
  assert.match(read('frontend/src/pages/AdminDashboard.jsx'), /useQuery\(adminDashboardQueryOptions\)/);
  assert.doesNotMatch(read('frontend/src/components/SplashScreen.jsx'), /Loading workspace\.\.\./);
});
