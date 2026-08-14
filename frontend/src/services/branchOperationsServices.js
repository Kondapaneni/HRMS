import api from '../api/axios';

/**
 * Fetches dashboard statistics and charts data for branch operations.
 * @param {Object} context - React Query query context
 * @returns {Promise<Object>}
 */
export const getBranchDashboardData = async ({ queryKey }) => {
  const employeeId = queryKey?.[1] || '';
  const url = employeeId && employeeId !== 'all'
    ? `/branch-operations/dashboard?employee_id=${encodeURIComponent(employeeId)}`
    : '/branch-operations/dashboard';
  const response = await api.get(url);
  return response.data;
};
