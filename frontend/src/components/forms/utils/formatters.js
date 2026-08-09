/**
 * Utility functions for formatting and normalizing input values in HRMS forms.
 */

/**
 * Format a numeric value into Indian Rupee currency format (e.g. 500000 -> ₹ 5,00,000)
 * @param {number|string} value
 * @returns {string} Formatted currency string
 */
export const formatCurrencyINR = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return '';
  
  // Indian numbering format (1,00,00,000)
  const parts = num.toString().split('.');
  let lastThree = parts[0].slice(-3);
  const otherNumbers = parts[0].slice(0, -3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const formattedDec = parts.length > 1 ? '.' + parts[1].slice(0, 2) : '';
  
  return `₹ ${formattedInt}${formattedDec}`;
};

/**
 * Extract raw numeric value from a currency/formatted string
 * @param {string|number} value
 * @returns {number|null}
 */
export const parseCurrencyINR = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  const clean = String(value).replace(/[^0-9.-]+/g, '');
  if (clean === '' || clean === '-') return null;
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Format a number as percentage string
 * @param {number|string} value 
 * @param {number} decimals 
 * @returns {string}
 */
export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '';
  return `${num.toFixed(decimals)} %`;
};

/**
 * Clean non-digits from string (useful for Aadhaar, Pincode, Phone)
 * @param {string} str 
 * @returns {string}
 */
export const digitsOnly = (str) => {
  if (!str) return '';
  return String(str).replace(/\D/g, '');
};

/**
 * Auto-uppercase string (useful for PAN, IFSC, GSTIN)
 * @param {string} str 
 * @returns {string}
 */
export const autoUppercase = (str) => {
  if (!str) return '';
  return String(str).toUpperCase();
};

/**
 * Capitalize first letter of each word
 * @param {string} str 
 * @returns {string}
 */
export const capitalizeWords = (str) => {
  if (!str) return '';
  return String(str).replace(/\b\w/g, (char) => char.toUpperCase());
};
