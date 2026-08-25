import api from '../api/axios';
import { supabase } from '../lib/supabase';

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
export const updateLeadStatus = async (id, status, loan_type = null) => {
  const payload = { status };
  if (loan_type) payload.loan_type = loan_type;
  const response = await api.put(`/leads/${id}/status`, payload);
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

/**
 * Updates an existing loan application in Branch Operations with audit logging.
 * @param {string|number} appId - Application ID or UUID
 * @param {Object} formData - Updated form data object
 * @param {string} loanType - Loan type ('Personal Loan' or 'Business Loan')
 * @returns {Promise<Object>}
 */
export const updateLoanApplicationDetails = async (appId, formData, loanType) => {
  const payload = {
    loan_type: loanType,
    applicant_name: formData.applicant_name || formData.name || '',
    phone_number: formData.phone_number || formData.phone || '',
    form_data: formData
  };
  const response = await api.put(`/branch-operations/applications/${encodeURIComponent(appId)}`, payload);
  return response.data;
};

/**
 * Fetches dashboard statistics and charts data for branch operations.
 * @param {Object} context - React Query query context
 * @returns {Promise<Object>}
 */
export const getBranchDashboardData = async ({ queryKey } = {}) => {
  const employeeId = queryKey?.[1] || '';
  const url = employeeId && employeeId !== 'all'
    ? `/branch-operations/dashboard?employee_id=${encodeURIComponent(employeeId)}`
    : '/branch-operations/dashboard';
  const response = await api.get(url);
  return response.data;
};

/**
 * Fetches loan applications belonging to the user's branch that have reached Branch Operations stage.
 * @returns {Promise<Object>}
 */
export const getBranchLoanApplications = async () => {
  const response = await api.get('/branch-operations/applications');
  return response.data;
};

/**
 * Updates an existing loan application in Branch Operations with audit logging.
 * @param {string|number} appId - Application ID or UUID
 * @param {Object} formData - Updated form data object
 * @param {string} loanType - Loan type ('Personal Loan' or 'Business Loan')
 * @returns {Promise<Object>}
 */
export const updateBranchLoanApplication = async (appId, formData, loanType) => {
  const payload = {
    loan_type: loanType,
    applicant_name: formData.applicant_name || formData.name || '',
    phone_number: formData.phone_number || formData.phone || '',
    form_data: formData
  };
  const response = await api.put(`/branch-operations/applications/${encodeURIComponent(appId)}`, payload);
  return response.data;
};

/**
 * Fetches all company branches from the Supabase branches table.
 * @returns {Promise<Array>} List of { id, name }
 */
export const getBranches = async () => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('id, name')
      .order('name');
    if (error) {
      console.warn('Could not fetch branches from Supabase:', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn('Error fetching branches:', e);
    return [];
  }
};





