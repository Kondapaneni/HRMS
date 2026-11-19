import { queryOptions } from '@tanstack/react-query';
import api from '../api/axios';

// All private results remain in the in-memory QueryClient. AuthContext clears
// that client on sign-out/account changes; do not add persistent query storage.
// Preserve existing keys so successful mutations continue to invalidate them.
export const employeeQueryKeys = {
  dashboard: ['employee', 'dashboard'],
  attendance: month => ['employee', 'attendance', month],
  attendanceAll: ['employee', 'attendance', 'all'],
  leaves: ['employee', 'leaves'],
  payroll: ['employee', 'payroll'],
  expenses: ['employee', 'expenses'],
  profile: ['employee', 'profile'],
  holidays: month => month ? ['employee', 'holidays', month] : ['employee', 'holidays'],
  performance: ['employee', 'performance'],
  trainingVideos: ['employee', 'trainingVideos'],
  assessments: businessDate => ['employeeAssessments', businessDate],
  birthdays: ['employee', 'birthdays'],
  mapsRateLimit: ['employee', 'mapsRateLimit'],
};

// A missing response collection is a server contract error, not an empty list.
// Axios errors (including 401/403/5xx) must reject and be handled as errors.
const requireList = (data, label) => {
  if (!Array.isArray(data)) throw new Error(`Invalid ${label} response`);
  return data;
};

export const employeeQueryOptions = {
  attendance: month => queryOptions({
    queryKey: employeeQueryKeys.attendance(month),
    queryFn: async ({ signal }) =>
      requireList((await api.get('/employee/attendance', { params: { month }, signal })).data, 'attendance'),
    staleTime: 30_000,
  }),
  // The dashboard requests all attendance; a month-filtered response must
  // never overwrite the unfiltered dashboard response.
  attendanceAll: () => queryOptions({
    queryKey: employeeQueryKeys.attendanceAll,
    queryFn: async ({ signal }) =>
      requireList((await api.get('/employee/attendance', { signal })).data, 'attendance'),
    staleTime: 30_000,
  }),
  leaves: () => queryOptions({
    queryKey: employeeQueryKeys.leaves,
    queryFn: async ({ signal }) => (await api.get('/employee/leaves', { signal })).data,
    staleTime: 60_000,
  }),
  payroll: () => queryOptions({
    queryKey: employeeQueryKeys.payroll,
    queryFn: async ({ signal }) =>
      requireList((await api.get('/employee/payroll', { signal })).data?.payslips, 'payroll'),
    staleTime: 5 * 60_000,
  }),
  expenses: () => queryOptions({
    queryKey: employeeQueryKeys.expenses,
    queryFn: async ({ signal }) =>
      requireList((await api.get('/employee/expenses', { signal })).data?.expenses, 'expenses'),
    staleTime: 60_000,
  }),
  profile: () => queryOptions({
    queryKey: employeeQueryKeys.profile,
    queryFn: async ({ signal }) => (await api.get('/employee/profile', { signal })).data,
    staleTime: 2 * 60_000,
  }),
  // Desktop requests a month-filtered list; mobile requests all holidays.
  // Keeping the parameter in the key prevents caching one under the other.
  holidays: (month = null) => queryOptions({
    queryKey: employeeQueryKeys.holidays(month),
    queryFn: async ({ signal }) => (await api.get('/employee/holidays', {
      ...(month ? { params: { month } } : {}),
      signal,
    })).data,
    staleTime: 15 * 60_000,
  }),
  performance: () => queryOptions({
    queryKey: employeeQueryKeys.performance,
    queryFn: async ({ signal }) => (await api.get('/employee/performance', { signal })).data,
    staleTime: 60_000,
  }),
  trainingVideos: () => queryOptions({
    queryKey: employeeQueryKeys.trainingVideos,
    queryFn: async ({ signal }) => (await api.get('/employee/training/videos', { signal })).data,
    staleTime: 5 * 60_000,
  }),
  assessments: businessDate => queryOptions({
    queryKey: employeeQueryKeys.assessments(businessDate),
    queryFn: async ({ signal }) =>
      requireList((await api.get('/employee/assessments', { signal })).data, 'assessments'),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  }),
  birthdays: () => queryOptions({
    queryKey: employeeQueryKeys.birthdays,
    queryFn: async ({ signal }) =>
      requireList((await api.get('/employee/birthdays', { signal })).data?.birthdays, 'birthdays'),
    staleTime: 5 * 60_000,
  }),
  mapsRateLimit: () => queryOptions({
    queryKey: employeeQueryKeys.mapsRateLimit,
    queryFn: async ({ signal }) => (await api.get('/employee/maps-rate-limit-status', { signal })).data,
    staleTime: 4_000,
  }),
};
