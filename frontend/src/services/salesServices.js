import api from '../api/axios';

/**
 * Fetches real sales dashboard metrics, trends, and recent leads.
 * @returns {Promise<Object>}
 */
export const getSalesDashboardData = async ({ signal } = {}) => {
  const response = await api.get('/sales/dashboard', { signal });
  return response.data;
};

/**
 * Fetches all sales leads with optional search and filter.
 * @param {Object} params - { search, status }
 * @returns {Promise<Object>}
 */
export const getSalesLeads = async (params = {}) => {
  const { search = '', status = '', signal } = params;
  const query = new URLSearchParams();
  if (search) query.append('search', search);
  if (status && status !== 'all') query.append('status', status);

  const url = `/sales/leads${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await api.get(url, { signal });
  return response.data;
};

/**
 * Creates a new real sales lead.
 * @param {Object} leadData - { name, company_name, phone, email, product_interest, deal_value, status, notes }
 * @returns {Promise<Object>}
 */
export const createSalesLead = async (leadData) => {
  const response = await api.post('/sales/leads', leadData);
  return response.data;
};

/**
 * Updates a sales lead's status and optional product type / deal value.
 * @param {string} id - Lead UUID
 * @param {string} status - 'New' | 'Follow Up' | 'Converted' | 'Not Interested'
 * @param {string} product_type - Selected product type
 * @returns {Promise<Object>}
 */
export const updateSalesLeadStatus = async (id, status, product_type = null) => {
  const payload = { status };
  if (product_type) payload.product_type = product_type;
  const response = await api.put(`/sales/leads/${id}/status`, payload);
  return response.data;
};
