import api from '../api/axios';
import { isMaintenanceEnabled } from '../components/maintenancePolicy';
import { preloadInitialRoute } from './routeWarmup';

// The initial secure dashboard fetch is shared by desktop, mobile, and the
// auth splash. Keep its result exclusively in the in-memory QueryClient;
// logout clears it and no account's data is persisted to browser storage.
export const employeeDashboardQueryOptions = {
  queryKey: ['employee', 'dashboard'],
  staleTime: 30_000,
  queryFn: async () => {
    const [
      attRes, leavesRes, perfRes, profileRes, payslipsRes, mapsRateRes,
      holidaysRes, expensesRes, birthdaysRes,
    ] = await Promise.all([
      api.get('/employee/attendance').catch(() => ({ data: [] })),
      api.get('/employee/leaves').catch(() => ({ data: null })),
      api.get('/employee/performance').catch(() => ({ data: {} })),
      api.get('/employee/profile').catch(() => ({ data: {} })),
      api.get('/employee/payroll').catch(() => ({ data: { payslips: [] } })),
      api.get('/employee/maps-rate-limit-status').catch(() => ({ data: { locked: false } })),
      api.get('/employee/holidays').catch(() => ({ data: [] })),
      api.get('/employee/expenses').catch(() => ({ data: { expenses: [] } })),
      api.get('/employee/birthdays').catch(() => ({ data: { birthdays: [] } })),
    ]);
    return {
      attendance: attRes.data,
      leaves: leavesRes.data,
      performance: perfRes.data?.currentMonthSummary || null,
      fullProfile: profileRes.data?.profile || null,
      latestPayslip: payslipsRes.data?.payslips?.[0] || null,
      mapsRateLimit: mapsRateRes.data,
      holidays: holidaysRes.data || [],
      expenses: expensesRes.data?.expenses || [],
      birthdays: birthdaysRes.data?.birthdays || [],
    };
  },
};

export const adminDashboardQueryOptions = {
  queryKey: ['admin', 'dashboard'],
  staleTime: 30_000,
  queryFn: async ({ signal }) => (await api.get('/admin/dashboard/stats', { signal })).data,
};

/**
 * Only warm the verified account's home dashboard on a landing-page reload or
 * successful login. Wait for the initial authorized query while splash is
 * visible so there is no second full-screen "Loading workspace" transition.
 * No privileged API call is made until /me has verified the account role and
 * the maintenance-status endpoint has confirmed workspaces are available.
 */
export async function prepareAuthenticatedLanding(profile, queryClient, maintenanceMode) {
  if (!profile || profile.forcePasswordChange) return;
  const role = profile.role;
  if (!['admin', 'employee', 'hr', 'manager'].includes(role)) return;

  const home = role === 'admin' ? '/admin' : '/employee';
  const path = typeof window !== 'undefined'
    ? (window.location.pathname.replace(/\/+$/, '') || '/')
    : '/';
  const homeLanding = ['/', '/login', home, `${home}/dashboard`].includes(path);

  // Route modules contain no account data. Preload only the actual route, or
  // the home route that authenticated /login will redirect to.
  await preloadInitialRoute(homeLanding ? home : path);
  if (!homeLanding) return;
  if (role !== 'admin' &&
      (maintenanceMode === null || maintenanceMode === undefined ||
       isMaintenanceEnabled(maintenanceMode))) return;

  // Even admins require a successful /me before warming private data.
  await queryClient.ensureQueryData(
    role === 'admin' ? adminDashboardQueryOptions : employeeDashboardQueryOptions,
  );
}

export const MIN_SPLASH_MS = 3000;

export function waitForMinimumSplash(startedAt) {
  return new Promise(resolve => {
    setTimeout(resolve, Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAt)));
  });
}
