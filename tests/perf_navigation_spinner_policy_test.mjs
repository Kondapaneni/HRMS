import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const boot = read('frontend/src/performance/dashboardBoot.js');
const employee = read('frontend/src/pages/EmployeeDashboard.jsx');
const mobile = read('frontend/src/pages/EmployeeMobileDashboard.jsx');
const pageLoader = read('frontend/src/components/PageLoader.jsx');
const shell = read('frontend/src/components/AppShell.jsx');
const bottom = read('frontend/src/components/ui/BottomNav.jsx');
const employeeLayout = read('frontend/src/components/EmployeeLayout.jsx');
const warmup = read('frontend/src/performance/routeWarmup.js');
const remote = read('frontend/src/state/remote.js');

const core = boot.slice(boot.indexOf('export const employeeDashboardRequest ='),
  boot.indexOf('export const employeeDashboardExtrasRequest ='));
const extras = boot.slice(boot.indexOf('export const employeeDashboardExtrasRequest ='),
  boot.indexOf('export const adminDashboardRequest ='));

for (const required of ['/employee/attendance','/employee/leaves','/employee/profile',
    '/employee/maps-rate-limit-status']) {
  assert(core.includes(required), 'Core attendance policy requires ' + required);
}
for (const optional of ['/employee/performance','/employee/payroll','/employee/holidays',
    '/employee/expenses','/employee/birthdays']) {
  assert(!core.includes(optional), 'Optional endpoint must not block attendance: ' + optional);
  assert(extras.includes(optional), 'Optional dashboard query must retain ' + optional);
}
assert(core.includes("scope: ['employee', 'dashboard']"));
assert(extras.includes("scope: ['employee', 'dashboard', 'extras']"),
  'Existing dashboard refresh prefix must cover optional cards');
for (const view of [employee, mobile]) {
  assert(view.includes('useRemoteData(employeeDashboardRequest)'));
  assert(view.includes('useRemoteData(employeeDashboardExtrasRequest)'));
}
assert(employee.includes("window.matchMedia('(max-width: 767px)')"),
  'Mount mobile or desktop dashboard based on viewport');
assert(employee.includes('return mobile ? <EmployeeMobileDashboard /> : <EmployeeDesktopDashboard />'),
  'Never mount a hidden dashboard that continues making API requests');
assert(!employee.includes('<div className="md:hidden">\n        <EmployeeMobileDashboard />'),
  'CSS hiding alone must not mount duplicate desktop/mobile dashboard queries');
assert(mobile.includes("dashboardExtrasLoading ? 'Loading upcoming birthdays…'"),
  'Defer empty-birthday statement until secondary API finishes');
assert(!/Loader2|animate-spin|animate-ping/.test(pageLoader),
  'Navigation must not show the previous blocking full-page spinner');
assert(pageLoader.includes('role="status"') && pageLoader.includes('aria-live="polite"'),
  'Skeleton must expose accessible, honest loading status');
assert(shell.includes('onRouteIntent={onRouteIntent}'),
  'Mobile navigation must receive verified code-only prefetch action');
assert(bottom.includes('onPointerDown={() => onRouteIntent?.(to)}'),
  'Mobile tap must preload route module code');
assert(employeeLayout.includes("refreshControl.getState(['employee', 'dashboard'])?.status !== 'success'"),
  'Idle warmup begins only after critical dashboard data has loaded');
assert(employeeLayout.includes('navigator.connection?.saveData'),
  'Optional preload respects slow connection/data saver');
assert(!/api\.get|fetchQuery|prefetchQuery|localStorage|sessionStorage/.test(warmup),
  'Navigation preload cannot fetch or retain private records');
assert(remote.includes('gcTime: retention?.gcTime ?? 0'),
  'Private query data must still have zero unmount retention by default');

console.log('Progressive employee dashboard, mobile route preload, accessible skeleton and private cache protection PASS');
