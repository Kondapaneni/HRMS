// Validations for loan modules

/**
 * Validates an Indian phone number.
 * It must be exactly 10 digits and start with 6, 7, 8, or 9.
 * 
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - Returns true if valid, false otherwise
 */
export const validateLeadPhone = (phone) => {
  // Strip out any non-digit characters (optional, depending on how it's formatted in the UI)
  const cleanPhone = phone.replace(/\D/g, '');
  
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(cleanPhone);
};

/**
 * Capitalizes the first letter of every word in a string.
 * Useful for names, addresses, etc.
 * 
 * @param {string} text - The input string
 * @returns {string} - The auto-capitalized string
 */
export const capitalizeWords = (text) => {
  if (!text) return '';
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
};

