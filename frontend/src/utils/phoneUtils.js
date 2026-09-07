/**
 * Masks the middle 6 digits of a phone number with 'X'.
 * e.g., '9440230002' -> '94XXXXXX02'
 *
 * @param {string|number} phone
 * @returns {string}
 */
export const maskPhoneNumber = (phone) => {
  if (!phone) return '—';
  const str = String(phone).trim();
  const digits = str.replace(/\D/g, '');

  if (digits.length === 10) {
    return `${digits.slice(0, 2)}XXXXXX${digits.slice(8)}`;
  }

  if (digits.length > 10) {
    const last10 = digits.slice(-10);
    const prefix = digits.slice(0, -10);
    return `${prefix ? `+${prefix} ` : ''}${last10.slice(0, 2)}XXXXXX${last10.slice(8)}`;
  }

  if (str.length >= 4) {
    const maskLen = Math.max(0, str.length - 4);
    return `${str.slice(0, 2)}${'X'.repeat(maskLen)}${str.slice(-2)}`;
  }

  return str;
};

/**
 * Masks address from the second letter up to the last 4 letters with '*'.
 * e.g., 'Hyderabad, 500001' -> 'H************0001'
 *
 * @param {string} address
 * @returns {string}
 */
export const maskAddress = (address) => {
  if (!address) return '-';
  const str = String(address).trim();
  if (!str) return '-';
  if (str.length <= 5) {
    return str.length > 1 ? `${str.charAt(0)}${'*'.repeat(str.length - 1)}` : str;
  }
  const firstLetter = str.slice(0, 1);
  const lastFour = str.slice(-4);
  const middleMask = '*'.repeat(str.length - 5);
  return `${firstLetter}${middleMask}${lastFour}`;
};
