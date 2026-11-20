// Only reviewed, low-risk reference views may retain data between route mounts.
// Never add employee/candidate records, payroll, GPS, attendance, permissions,
// application timelines, customer leads or dashboard/audit activity here.
// All retained data stays in QueryClient memory and is cleared on logout.
const HOLIDAY_CACHE = Object.freeze({
  staleTime: 3 * 60 * 1000,
  gcTime: 5 * 60 * 1000,
});
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function getRemoteRetention(scope) {
  if (!Array.isArray(scope)) return null;
  if (scope.length === 3 && scope[0] === 'admin' &&
      scope[1] === 'holidays' && typeof scope[2] === 'string' &&
      MONTH.test(scope[2])) return HOLIDAY_CACHE;
  if (scope.length === 2 && scope[0] === 'admin' &&
      scope[1] === 'holidays-archive') return HOLIDAY_CACHE;
  if (scope[0] === 'employee' && scope[1] === 'holidays' &&
      (scope.length === 2 || (scope.length === 3 &&
        typeof scope[2] === 'string' && MONTH.test(scope[2])))) {
    return HOLIDAY_CACHE;
  }
  return null;
}
