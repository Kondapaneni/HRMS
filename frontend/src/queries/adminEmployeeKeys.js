/**
 * Admin employee-list results depend on the searched term and row limit.
 * The backend defaults to 50 rows when `limit` is omitted. Keep the
 * no-limit request and explicit limit=100 requests in separate cache entries.
 *
 * All list keys retain ['admin', 'employees'] as a prefix so existing
 * invalidations after employee mutations continue to cover every list.
 */
export const adminEmployeeKeys = {
  all: ['admin', 'employees'],
  list: ({ search = '', limit = 50 } = {}) => [
    'admin',
    'employees',
    { search, limit },
  ],
};
