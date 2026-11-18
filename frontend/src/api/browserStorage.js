/**
 * SEC-021: remove legacy browser persistence of bearer JWTs and private data.
 * Keep user appearance preferences; never enumerate unrelated app origins.
 */
const localKeys = ['token', 'REACT_QUERY_OFFLINE_CACHE', 'TANSTACK_QUERY_OFFLINE_CACHE'];
const privateSessionKeys = [
  'hrms_admin_chat_history', 'hrms_employee_chat_history',
  'current_loan_lead', 'current_loan_member',
  'current_sale_lead', 'current_sale_member',
];

export function clearLegacySensitiveStorage() {
  if (typeof window === 'undefined') return;
  try {
    for (const key of localKeys) window.localStorage.removeItem(key);
  } catch {
    // Locked-down browser storage must not block the application.
  }
  try {
    for (const key of privateSessionKeys) window.sessionStorage.removeItem(key);
  } catch {
    // Navigation continues without browser-storage access.
  }
}

export function clearPrivateSessionStorage() {
  clearLegacySensitiveStorage();
  if (typeof window !== 'undefined') {
    try { window.sessionStorage.removeItem('active_assessment_in_progress'); } catch { /* denied */ }
  }
}
