import api from '../api/axios';

/**
 * Creates a new loan lead.
 * @param {Object} leadData - { name, phone, address }
 * @returns {Promise<Object>}
 */
export const createLead = async (leadData) => {
  const response = await api.post('/leads', leadData);
  return response.data;
};

/**
 * Fetches dashboard statistics and charts data for loan leads.
 * @returns {Promise<Object>}
 */
export const getDashboardData = async () => {
  const response = await api.get('/leads/dashboard');
  return response.data;
};

/**
 * Fetches all loan leads.
 * @returns {Promise<Object>}
 */
export const getLeads = async ({ queryKey }) => {
  const search = queryKey[3] || '';
  const url = search ? `/leads/list?search=${encodeURIComponent(search)}` : '/leads/list';
  const response = await api.get(url);
  return response.data;
};
