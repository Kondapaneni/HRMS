/**
 * Display-only employee identifier. SEC-019 deliberately stores eight numeric
 * digits, while the HRMS UI presents them with an EMP- prefix.
 * Never pass this formatted value to API requests, searches, or SQL writes.
 */
export function formatEmployeeId(value, fallback = 'Not set') {
  if (value === undefined || value === null) return fallback;
  const code = String(value).trim();
  if (!code) return fallback;
  return /^\d{8}$/.test(code) ? `EMP-${code}` : code;
}
