
// Only the requested/likely module chunks are fetched, never every route.
// These dynamic imports reuse Vite's existing code-split module URLs.
const modules = {
  '/admin': () => import('../pages/AdminDashboard'),
  '/admin/employees': () => import('../pages/AdminEmployees'),
  '/admin/directory': () => import('../pages/AdminDirectory'),
  '/admin/attendance': () => import('../pages/AdminAttendance'),
  '/admin/leaves': () => import('../pages/AdminLeaves'),
  '/admin/payroll': () => import('../pages/AdminPayroll'),
  '/admin/reports': () => import('../pages/AdminReports'),
  '/admin/recruitment': () => import('../pages/AdminRecruitment'),
  '/admin/assets': () => import('../pages/AdminAssets'),
  '/admin/expenses': () => import('../pages/AdminExpenses'),
  '/admin/performance': () => import('../pages/AdminPerformance'),
  '/admin/settings': () => import('../pages/AdminSettings'),
  '/admin/feature-access': () => import('../pages/AdminFeatureAccess'),
  '/admin/audit-logs': () => import('../pages/AdminAuditLogs'),
  '/employee': () => import('../pages/EmployeeDashboard'),
  '/employee/attendance': () => import('../pages/EmployeeAttendance'),
  '/employee/leaves': () => import('../pages/EmployeeLeaves'),
  '/employee/payroll': () => import('../pages/EmployeePayroll'),
  '/employee/profile': () => import('../pages/EmployeeProfile'),
  '/employee/expenses': () => import('../pages/EmployeeExpenses'),
  '/employee/assessments': () => import('../pages/EmployeeAssessments'),
  '/employee/loans/origination': () => import('../pages/OriginationLoanDashboard'),
  '/employee/loans/origination/leads': () => import('../pages/OriginationLoanLeadsList'),
  '/employee/loans/origination/members': () => import('../pages/OriginationLoanMembersList'),
  '/employee/sales/origination': () => import('../pages/OriginationSaleDashboard'),
  '/employee/sales/origination/leads': () => import('../pages/OriginationSaleLeadsList'),
  '/employee/branch-operations': () => import('../pages/BranchOperationsDashboard'),
  '/employee/branch-operations/leads': () => import('../pages/BranchOperationsLeads'),
  '/candidate/dashboard': () => import('../pages/CandidateDashboard'),
  '/candidate/jobs': () => import('../pages/CandidateJobs'),
  '/candidate/applications': () => import('../pages/CandidateApplications'),
  '/candidate/profile': () => import('../pages/CandidateProfile'),
};
const loading = new Map();

const layoutModules = [
  ['/admin', () => import('../components/AdminLayout')],
  ['/employee/loans', () => import('../components/OriginationLoansLayout')],
  ['/employee/sales', () => import('../components/OriginationSalesLayout')],
  ['/employee/branch-operations', () => import('../components/BranchOperationsLayout')],
  ['/employee', () => import('../components/EmployeeLayout')],
  ['/candidate', () => import('../components/CandidateLayout')],
];
const preloadingLayouts = new Map();

// Only imports public JavaScript code for the current deep link: never private
// API data, user identity, auth claims, or browser-persistent query responses.
export function preloadInitialRoute(pathname) {
  const path = typeof pathname === 'string' ? pathname : '';
  const match = layoutModules.find(([prefix]) => path === prefix || path.startsWith(prefix + '/'));
  if (!match) return Promise.resolve();
  const [key, loadLayout] = match;
  if (!preloadingLayouts.has(key)) {
    preloadingLayouts.set(key, loadLayout().catch(() => preloadingLayouts.delete(key)));
  }
  return Promise.all([preloadingLayouts.get(key), preloadRouteModule(path)]);
}

export function preloadRouteModule(path) {
  const loader = modules[path];
  if (!loader) return Promise.resolve();
  if (!loading.has(path)) {
    loading.set(path, loader().catch(() => {
      loading.delete(path);
      // Optional background prefetch must never become an unhandled rejection.
    }));
  }
  return loading.get(path);
}

// Preload route *code only*. No private API prefetch or data retention.
// Protected API requests start after verified auth when the view mounts.
export function warmRoute(path, _unused, role) {
  if (!role) return Promise.resolve();
  return preloadRouteModule(path);
}
