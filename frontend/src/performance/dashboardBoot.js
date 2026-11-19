import api from '../api/axios';
import { employeeQueryKeys, employeeQueryOptions } from '../queries/employeeQueries';
import { isMaintenanceEnabled } from '../components/maintenancePolicy';
import { preloadInitialRoute } from './routeWarmup';

// The initial secure dashboard fetch is shared by desktop, mobile, and the
// auth splash. Keep its result exclusively in the in-memory QueryClient;
// logout clears it and no account's data is persisted to browser storage.
export const employeeDashboardQueryOptions = {
  queryKey: employeeQueryKeys.dashboard,
  staleTime: 30_000,
  queryFn: async ({ client }) => {
    // Share the underlying resource caches with desktop/mobile pages. On a
    // cold landing all nine requests still run concurrently under the splash;
    // on a warm return fetchQuery reuses each fresh canonical resource.
    const resources = [
      ['attendance', employeeQueryOptions.attendanceAll()],
      ['leaves', employeeQueryOptions.leaves()],
      ['performance', employeeQueryOptions.performance()],
      ['profile', employeeQueryOptions.profile()],
      ['payroll', employeeQueryOptions.payroll()],
      ['mapsRateLimit', employeeQueryOptions.mapsRateLimit()],
      ['holidays', employeeQueryOptions.holidays()],
      ['expenses', employeeQueryOptions.expenses()],
      ['birthdays', employeeQueryOptions.birthdays()],
    ];
    const settled = await Promise.allSettled(
      resources.map(([, options]) => client.fetchQuery(options)),
    );
    const values = {};
    const resourceErrors = [];

    settled.forEach((result, index) => {
      const name = resources[index][0];
      if (result.status === 'fulfilled') {
        values[name] = result.value;
        return;
      }

      // Authentication, maintenance and essential dashboard failures must
      // remain real query errors. Never substitute a successful empty array,
      // zero balance or "unlocked" rate limit when an API rejects.
      const httpStatus = result.reason?.response?.status;
      if (httpStatus === 401 || httpStatus === 503
          || ['attendance', 'leaves', 'profile'].includes(name)) {
        throw result.reason;
      }
      // Optional panels stay independent. The failed underlying query remains
      // in error state and its panel is explicitly marked unavailable.
      resourceErrors.push(name);
    });

    return {
      attendance: values.attendance,
      leaves: values.leaves,
      performance: values.performance?.currentMonthSummary ?? null,
      fullProfile: values.profile?.profile ?? null,
      latestPayslip: values.payroll?.[0] ?? null,
      mapsRateLimit: values.mapsRateLimit,
      holidays: values.holidays,
      expenses: values.expenses,
      birthdays: values.birthdays,
      resourceErrors,
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
