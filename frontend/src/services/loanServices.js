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

/**
 * Updates the status of a loan lead.
 * @param {number} id - Lead ID
 * @param {string} status - New status ('Follow Up', 'Not Interested', 'Converted')
 * @returns {Promise<Object>}
 */
export const updateLeadStatus = async (id, status) => {
  const response = await api.put(`/leads/${id}/status`, { status });
  return response.data;
};

/**
 * Submits a loan application to backend DB in JSON format after validation passes.
 * @param {string} loanType - Type of loan ('Business Loan', 'Personal Loan', etc.)
 * @param {Object} formData - Complete form data object
 * @returns {Promise<Object>}
 */
export const submitLoanApplication = async (loanType, formData) => {
  const payload = {
    loan_type: loanType,
    applicant_name: formData.applicant_name || formData.name || '',
    phone_number: formData.phone_number || formData.phone || '',
    form_data: formData
  };
  const response = await api.post('/loans/applications', payload);
  return response.data;
};

/**
 * Fetches submitted loan applications.
 * @returns {Promise<Object>}
 */
export const getLoanApplications = async () => {
  const response = await api.get('/loans/applications');
  return response.data;
};
