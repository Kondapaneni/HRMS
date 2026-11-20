import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const app = read('frontend/src/App.jsx');
const shell = read('frontend/src/components/AppShell.jsx');
const shared = read('frontend/src/components/PageLoader.jsx');
const bridge = read('frontend/src/components/RouteSkeleton.jsx');
const guard = read('frontend/src/components/ProtectedRoute.jsx');
const table = read('frontend/src/components/ui/DataTable.jsx');
const sidebar = read('frontend/src/components/MemberDetailsSidebar.jsx');

const pages = readdirSync('frontend/src/pages')
  .filter(name => /\.jsx$/.test(name)).sort();

assert(pages.length >= 115, 'All HRMS page modules must remain in scope');
assert.match(shared, /export const PageLoader/);
assert.match(shared, /role="status"/);
assert.match(shared, /aria-live="polite"/);
assert.match(shared, /aria-busy="true"/);
assert.match(shared, /min-h-\[calc\(100dvh-8rem\)\]/);
assert.doesNotMatch(shared, /Loader2|animate-spin/,
  'The one shared full-page skeleton may not be replaced by a spinner');
assert.match(bridge, /return <PageLoader message="Opening page\.\.\." \/>/);
assert.match(shell, /<Suspense fallback=\{<RouteSkeleton\s*\/>\}>/,
  'Nested code-split routes retain navigation and show the shared skeleton');
assert.match(app, /<Suspense fallback=\{null\}>/,
  'Preserve the splash and existing top-level navigation; nested shells provide PageLoader');
assert.match(guard, /<PageLoader message="Verifying your session\.\.\."/);
assert.match(guard, /<PageLoader message="Verifying your permissions\.\.\."/);
assert(!/min-h-screen flex items-center justify-center bg-slate-50/.test(guard),
  'Protected page loading cannot fall back to standalone loading text');

// All pages with first-load useRemoteData must use the shared full PageLoader.
// Presentational mobile children without their own requests inherit the parent
// loader; mutation button spinners are action progress, NOT page-load skeletons.
const remoteMissing = [];
const fullPage = [];
for (const name of pages) {
  const src = read('frontend/src/pages/' + name);
  const hasPageLoader = /<PageLoader\b/.test(src);
  if (hasPageLoader) fullPage.push(name);
  if (/useRemoteData\s*\(/.test(src) &&
      /\bisLoading\b/.test(src) && !hasPageLoader) {
    remoteMissing.push(name);
  }
}
assert.deepEqual(remoteMissing, [],
  'Initial remote-data loaders must never be partial/spinners: ' + remoteMissing.join(', '));

const requiredDataPages = [
  'AdminDashboard','AdminEmployees','EmployeeDashboard','EmployeeMobileDashboard',
  'CandidateDashboard','CandidateMobileDashboard','OriginationLoanDashboard',
  'OriginationSaleDashboard','OriginationLoanLeadsList','OriginationSaleLeadsList',
  'OriginationLoanMembersList','OriginationSaleMembersList',
  'OriginationMobileLoanLeadsList','OriginationMobileSaleLeadsList',
  'OriginationMobileLoanMemberList','OriginationMobileSaleMemberList',
  'OriginationLoanApplicationsList','OriginationMobileLoanApplicationsList',
  'BranchOperationsLoansApplicationsList','BranchOperationsMobileLoansApplicationsList',
  'OriginationActivities','OriginationMobileActivities',
  'OriginationLoanViewApplication','OriginationMobileLoanViewApplications',
  'BranchOperationsLoansViewApplication','BranchOperationsMobileLoansViewApplication',
  'OriginationMobileLoanMemberDetails','OriginationMobileSaleMemberDetails',
  'EmployeeMobileCamera','EmployeeMobileMap',
  'EmployeeAssessments','EmployeeAssessmentInstructions','EmployeeAssessmentResult',
  'Login','CandidateActivate'
];
for (const name of requiredDataPages) {
  const src = read('frontend/src/pages/' + name + '.jsx');
  assert.match(src, /<PageLoader\b/, 'Missing approved loader in ' + name);
}

for (const path of [
  'frontend/src/pages/EmployeeAssessments.jsx',
  'frontend/src/pages/EmployeeAssessmentInstructions.jsx',
  'frontend/src/pages/OriginationMobileLoanMemberDetails.jsx',
  'frontend/src/pages/OriginationMobileSaleMemberDetails.jsx',
  'frontend/src/components/MemberDetailsSidebar.jsx',
  'frontend/src/components/ui/DataTable.jsx',
  'frontend/src/components/RouteSkeleton.jsx',
  'frontend/src/pages/AdminDashboard.jsx',
  'frontend/src/pages/CandidateActivate.jsx'
]) {
  const src = read(path);
  assert.doesNotMatch(src, /animate-pulse/,
    'Remove alternate/partial skeleton components: ' + path);
}
assert.match(table, /if \(isLoading\) return <PageLoader/);
assert.match(sidebar, /if \(isLoadingApps && !appsResponse\)/);
assert.match(sidebar, /<PageLoader message="Loading member details\.\.\."/);
assert.match(read('frontend/src/pages/EmployeeMobileCamera.jsx'),
  /<PageLoader message="Starting camera\.\.\."/);
// Camera must stay mounted behind the loading overlay to receive onLoadedMetadata.
assert.match(read('frontend/src/pages/EmployeeMobileCamera.jsx'), /onLoadedMetadata=\{handleVideoLoaded\}/);

// Private data remains fresh and authorized; this is a view change only.
const remote = read('frontend/src/state/remote.js');
assert.match(remote, /gcTime: retention\?\.gcTime \?\? 0/);
const auth = read('frontend/src/contexts/AuthContext.jsx');
assert.match(auth, /discardPrivateQueries\(\)/);
console.log('Unified PageLoader skeleton policy PASS:', {
  modules: pages.length, fullPageUsers: fullPage.length,
  otherModules: pages.length - fullPage.length,
  protectedLazyRoutes: true
});
