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
 * Submits or saves draft for a loan application to backend DB in JSON format.
 * @param {string} loanType - Type of loan ('Business Loan', 'Personal Loan', etc.)
 * @param {Object} formData - Complete form data object
 * @param {string} status - 'Created' or 'Draft'
 * @returns {Promise<Object>}
 */
export const submitLoanApplication = async (loanType, formData, status = 'Created') => {
  const payload = {
    loan_type: loanType,
    applicant_name: formData.applicant_name || formData.name || '',
    phone_number: formData.phone_number || formData.phone || '',
    status: status,
    form_data: formData
  };
  const response = await api.post('/loans/applications', payload);
  return response.data;
};

/**
 * Fetches created and draft loan applications.
 * @returns {Promise<Object>}
 */
export const getLoanApplications = async () => {
  const response = await api.get('/loans/applications');
  return response.data;
};

/**
 * Deletes a loan application.
 * @param {string|number} appId - Application ID
 * @returns {Promise<Object>}
 */
export const deleteLoanApplication = async (appId) => {
  const response = await api.delete(`/loans/applications/${encodeURIComponent(appId)}`);
  return response.data;
};

/**
 * Saves/updates documents for a loan application.
 * @param {string} appId - Application ID or UUID
 * @param {Object} documents - Map or array of document objects
 */
export const saveLoanDocuments = async (appId, documents) => {
  const response = await api.post(`/loans/applications/${encodeURIComponent(appId)}/documents`, { documents });
  return response.data;
};

/**
 * Deletes a document from a loan application.
 * @param {string} appId - Application ID or UUID
 * @param {string} docKey - Document key
 */
export const deleteLoanDocument = async (appId, docKey) => {
  const response = await api.delete(`/loans/applications/${encodeURIComponent(appId)}/documents/${encodeURIComponent(docKey)}`);
  return response.data;
};

/**
 * Updates the status of a loan application and adds a timeline event.
 * @param {string} appId - Application ID or UUID
 * @param {string} status - New status
 * @param {Object} timelineEvent - Event object to append to timeline array
 * @param {Object} signatureData - Object containing the signature mapping (e.g., { "Origination": url })
 */
export const updateLoanApplicationStatus = async (appId, status, timelineEvent, signatureData) => {
  const payload = { status };
  if (timelineEvent) payload.timelineEvent = timelineEvent;
  if (signatureData) payload.signatureData = signatureData;
  
  const response = await api.patch(`/loans/applications/${encodeURIComponent(appId)}/status`, payload);
  return response.data;
};

