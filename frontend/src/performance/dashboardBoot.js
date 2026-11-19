import api from '../api/axios';
import { isMaintenanceEnabled } from '../components/maintenancePolicy';
import { preloadInitialRoute } from './routeWarmup';

// Desktop and mobile share the request definition, not fetched records.
// Every dashboard mount performs its own authorized, fresh server request.
export const employeeDashboardRequest = {
  scope: ['employee', 'dashboard'],
  load: async () => {
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

export const adminDashboardRequest = {
  scope: ['admin', 'dashboard'],
  load: async ({ signal }) => (await api.get('/admin/dashboard/stats', { signal })).data,
};

/**
 * Only warm the verified account's home dashboard on a landing-page reload or
 * successful login. Wait for route module loading during the verified auth splash.
 * No privileged API call is made until /me has verified the account role and
 * the maintenance-status endpoint has confirmed workspaces are available.
 */
export async function prepareAuthenticatedLanding(profile, maintenanceMode) {
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

  // No shared client cache: the mounted dashboard requests fresh data.

}

export const MIN_SPLASH_MS = 3000;

export function waitForMinimumSplash(startedAt) {
  return new Promise(resolve => {
    setTimeout(resolve, Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAt)));
  });
}
