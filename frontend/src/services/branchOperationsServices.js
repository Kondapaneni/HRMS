import api from '../api/axios';

/**
 * Fetches branch operations dashboard data.
 * @param {Object} params - { officerId, loanType, timeframe }
 * @returns {Promise<Object>}
 */
export const getBranchOperationsDashboardData = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.officerId && params.officerId !== 'all') {
    queryParams.append('officerId', params.officerId);
  }
  if (params.loanType && params.loanType !== 'All') {
    queryParams.append('loanType', params.loanType);
  }
  if (params.timeframe) {
    queryParams.append('timeframe', params.timeframe);
  }

  const queryString = queryParams.toString();
  const url = queryString ? `/branch-operations/dashboard?${queryString}` : '/branch-operations/dashboard';
  const response = await api.get(url);
  return response.data;
};
