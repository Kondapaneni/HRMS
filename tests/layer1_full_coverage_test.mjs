import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const pages = readdirSync('frontend/src/pages').filter(file => /\.jsx?$/.test(file));
const components = readdirSync('frontend/src/components').filter(file => /\.jsx?$/.test(file));
const scanned = [...pages.map(file => 'frontend/src/pages/' + file),
  ...components.map(file => 'frontend/src/components/' + file)];
const readHook = /\b(?:useRemoteData|useBranchDirectory)\(/;
const routineGet = /\b(?:api|axios)\.get\(/;

// Authentication, background GPS and maintenance status are deliberately
// live security/session operations, not cacheable page data queries.
const liveExceptions = new Set([
  'frontend/src/components/BackgroundLocationTracker.jsx',
  'frontend/src/components/MaintenanceGate.jsx',
]);
const unmanaged = [];
const missingScopes = [];
let managedFiles = 0;
let managedCalls = 0;
for (const path of scanned) {
  const source = read(path);
  if (readHook.test(source)) managedFiles++;
  if (routineGet.test(source) && !readHook.test(source) && !liveExceptions.has(path)) {
    unmanaged.push(path);
  }
  // A mounted query must declare an unambiguous scope; new views may not
  // silently enter the global cache with an unscoped identity.
  for (const match of source.matchAll(/useRemoteData\s*\(\s*\{/g)) {
    managedCalls++;
    if (!/\bscope\s*:/.test(source.slice(match.index, match.index + 450))) {
      missingScopes.push(path + ':' + source.slice(0, match.index).split('\n').length);
    }
  }
}
assert.deepEqual(unmanaged, [], 'Routine API GET reads must use a reviewed query hook');
assert.deepEqual(missingScopes, [], 'Mounted query declarations must have scoped keys');
assert(managedFiles >= 75, 'Majority of route-based data flows must be query-managed');
assert(managedCalls >= 100, 'All mounted page data reads should be query-scoped');

const paired = {
  EmployeeHolidays: 'EmployeeMobileHolidays',
  EmployeePayroll: 'EmployeeMobilePayroll',
  EmployeeAttendance: 'EmployeeMobileAttendance',
  EmployeeLeaves: 'EmployeeMobileLeaves',
  EmployeeExpenses: 'EmployeeMobileExpenses',
  EmployeePerformance: 'EmployeeMobilePerformance',
  EmployeeProfile: 'EmployeeMobileProfile',
  EmployeeTrainingVideos: 'EmployeeMobileTrainingVideos',
  OriginationLoanDashboard: 'OriginationMobileLoanDashboard',
  OriginationSaleDashboard: 'OriginationMobileSaleDashboard',
  BranchOperationsDashboard: 'BranchOperationsMobileDashboard',
  OriginationLoanLeadsList: 'OriginationMobileLoanLeadsList',
  OriginationSaleLeadsList: 'OriginationMobileSaleLeadsList',
  BranchOperationsLeads: 'BranchOperationsMobileLeads',
  BranchOperationsLoansApplicationsList: 'BranchOperationsMobileLoansApplicationsList',
  OriginationLoanApplicationsList: 'OriginationMobileLoanApplicationsList',
  OriginationLoanMembersList: 'OriginationMobileLoanMemberList',
  OriginationSaleMembersList: 'OriginationMobileSaleMemberList',
  OriginationActivities: 'OriginationMobileActivities',
};
for (const [parent, mobile] of Object.entries(paired)) {
  const source = read('frontend/src/pages/' + parent + '.jsx');
  assert(source.includes('const ' + parent + 'Desktop = () => {'),
    'Desktop data view must be independently mounted: ' + parent);
  assert(source.includes('return mobile ? <' + mobile + ' ') ||
      source.includes('return mobile ? <' + mobile + '/>'),
    'Only the visible mobile or desktop view may mount: ' + parent);
  assert(!new RegExp('<div className="md:hidden">\\s*<' + mobile + '\\b').test(source),
    'CSS-hidden duplicate request source is prohibited: ' + parent);
}
const viewport = read('frontend/src/performance/useMobileViewport.js');
assert.match(viewport, /window\.matchMedia\('\(max-width: 767px\)'\)/);
assert.match(viewport, /addEventListener\('change', onChange\)/);
assert.match(viewport, /removeEventListener\('change', onChange\)/);

const bulk = read('frontend/src/pages/AdminBulkPayroll.jsx');
assert.match(bulk, /useRemoteData\(\{/,
  'Bulk payroll roster must use fresh cancelable mounted query');
assert.match(bulk, /scope: \['admin', 'payroll', 'pending'/);
assert.match(bulk, /useRemoteTask\(\{/,
  'Bulk payroll writes must flow through managed mutation');
assert.match(bulk, /refreshControl\.refresh\(\{ scope: \['admin', 'payroll'/,
  'Bulk payroll writes must invalidate pending and payroll views');
assert.doesNotMatch(bulk, /fetchPendingEmployees|new AbortController\(\)/,
  'Do not restore manual, unscoped payroll request effects');

// Deliberately fresh protected data: never reuse it between views, even when
// the browser remains authenticated, because permission revocation must win.
const cache = read('frontend/src/state/remote.js');
const retention = read('frontend/src/query/retentionPolicy.js');
const published = read('frontend/src/query/publishedJobCatalog.js');
assert.match(cache, /staleTime: retention\?\.staleTime \?\? 0/);
assert.match(cache, /gcTime: retention\?\.gcTime \?\? 0/);
assert.match(cache, /sessionEpoch, viewId.current, scopeId/);
assert.match(cache, /blockedAfterReset/);
assert.match(cache, /Date\.now\(\) - state\.dataUpdatedAt < retention\.staleTime/,
  'Reference focus reload must obey TTL');
assert.match(cache, /state\?\.fetchStatus === 'fetching'/,
  'Focus/visibility events must deduplicate overlapping refetches');
assert.match(retention, /scope\[1\] === 'holidays'/);
assert.match(retention, /scope\[1\] === 'holidays-archive'/);
assert.match(published, /staleTime: 60 \* 1000/);
assert.match(read('frontend/src/query/useBranchDirectory.js'), /staleTime: 5 \* 60 \* 1000/);

console.log('Layer 1 route coverage PASS', {
  scannedFiles: scanned.length, managedFiles, scopedMountedCalls: managedCalls,
  responsiveDuplicateFetchesPrevented: Object.keys(paired).length,
  manuallyUnmanagedRoutineReads: unmanaged.length,
});
