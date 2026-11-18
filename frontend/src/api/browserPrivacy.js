/**
 * SEC-021: Browser session secrets and private TanStack snapshots must never
 * live in Web Storage. Remove pre-migration copies without clearing safe UI
 * preferences (theme) or Android Keystore-backed native credentials.
 */
const legacyLocalKeys = [
  'token',
  'REACT_QUERY_OFFLINE_CACHE',
  'TANSTACK_QUERY_OFFLINE_CACHE',
];
const privateSessionKeys = [
  'hrms_admin_chat_history',
  'hrms_employee_chat_history',
  'current_loan_member',
  'current_sale_member',
  'current_loan_lead',
  'current_sale_lead',
];

export function eraseLegacySensitiveStorage() {
  if (typeof window === 'undefined') return;
  for (const key of legacyLocalKeys) {
    try { window.localStorage.removeItem(key); } catch { /* blocked storage */ }
  }
  for (const key of privateSessionKeys) {
    try { window.sessionStorage.removeItem(key); } catch { /* blocked storage */ }
  }
}

export function browserCsrfToken() {
  if (typeof document === 'undefined') return '';
  const prefix = '__Host-hrms_csrf=';
  const part = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith(prefix));
  const value = part?.slice(prefix.length) || '';
  return /^[0-9a-f]{64}$/.test(value) ? value : '';
}

export function hasBrowserSessionCookie() {
  // Deliberately only the non-sensitive CSRF cookie is observable to JS.
  return Boolean(browserCsrfToken());
}
