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
export const getLeads = async () => {
  const response = await api.get('/leads/list');
  return response.data;
};
