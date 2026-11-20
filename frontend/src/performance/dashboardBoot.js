import api from '../api/axios';
import { isMaintenanceEnabled } from '../components/maintenancePolicy';
import { preloadInitialRoute } from './routeWarmup';

// Desktop and mobile share the request definition, not fetched records.
// Every dashboard mount performs its own authorized, fresh server request.
// Attendance, leave status, verified employee profile and lockout information
// are safety-critical for the dashboard's check-in/check-out controls. These
// must finish before the attendance terminal becomes interactive.
export const employeeDashboardRequest = {
  scope: ['employee', 'dashboard'],
  load: async ({ signal }) => {
    const [attRes, leavesRes, profileRes, mapsRateRes] = await Promise.all([
      api.get('/employee/attendance', { signal }).catch(() => ({ data: [] })),
      api.get('/employee/leaves', { signal }).catch(() => ({ data: null })),
      api.get('/employee/profile', { signal }).catch(() => ({ data: {} })),
      api.get('/employee/maps-rate-limit-status', { signal }).catch(() => ({ data: { locked: false } })),
    ]);
    return {
      attendance: attRes.data,
      leaves: leavesRes.data,
      fullProfile: profileRes.data?.profile || null,
      mapsRateLimit: mapsRateRes.data,
    };
  },
};

// Non-critical dashboard cards are independent. A slow payslip, performance,
// birthday, expense or holiday endpoint must not block the attendance terminal.
// Results remain private, fresh per mounted view, and removed on logout.
export const employeeDashboardExtrasRequest = {
  scope: ['employee', 'dashboard', 'extras'],
  load: async ({ signal }) => {
    const [perfRes, payslipsRes, holidaysRes, expensesRes, birthdaysRes] =
      await Promise.all([
        api.get('/employee/performance', { signal }).catch(() => ({ data: {} })),
        api.get('/employee/payroll', { signal }).catch(() => ({ data: { payslips: [] } })),
        api.get('/employee/holidays', { signal }).catch(() => ({ data: [] })),
        api.get('/employee/expenses', { signal }).catch(() => ({ data: { expenses: [] } })),
        api.get('/employee/birthdays', { signal }).catch(() => ({ data: { birthdays: [] } })),
      ]);
    return {
      performance: perfRes.data?.currentMonthSummary || null,
      latestPayslip: payslipsRes.data?.payslips?.[0] || null,
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
