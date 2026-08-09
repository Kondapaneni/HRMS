/**
 * Business-specific validation functions for HRMS & Indian Financial Domain.
 */

/**
 * Validate Indian PAN (Permanent Account Number)
 * Format: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. ABCDE1234F)
 * @param {string} value 
 * @returns {string|null} Error message or null
 */
export const validatePAN = (value) => {
  if (!value) return null;
  const clean = String(value).trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(clean)) {
    return 'Invalid PAN number format (e.g. ABCDE1234F).';
  }
  return null;
};

/**
 * Validate Indian Aadhaar Number
 * Format: 12 digits
 * @param {string} value 
 * @returns {string|null} Error message or null
 */
export const validateAadhaar = (value) => {
  if (!value) return null;
  const clean = String(value).replace(/\D/g, '');
  if (clean.length !== 12) {
    return 'Aadhaar number must be exactly 12 digits.';
  }
  if (/^(\d)\1{11}$/.test(clean)) {
    return 'Invalid Aadhaar number (cannot be 12 identical digits).';
  }
  return null;
};

/**
 * Validate Indian IFSC Code
 * Format: 4 uppercase letters, 0, 6 alphanumeric characters (e.g. SBIN0001234)
 * @param {string} value 
 * @returns {string|null} Error message or null
 */
export const validateIFSC = (value) => {
  if (!value) return null;
  const clean = String(value).trim().toUpperCase();
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(clean)) {
    return 'Invalid IFSC Code (e.g. SBIN0001234, 5th character must be 0).';
  }
  return null;
};

/**
 * Validate Indian GSTIN (GST Identification Number)
 * Format: 15 characters (e.g. 22AAAAA0000A1Z5)
 * @param {string} value 
 * @returns {string|null} Error message or null
 */
export const validateGSTIN = (value) => {
  if (!value) return null;
  const clean = String(value).trim().toUpperCase();
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(clean)) {
    return 'Invalid GSTIN format (15 characters, e.g. 22AAAAA0000A1Z5).';
  }
  return null;
};

/**
 * Validate Indian Pincode
 * Format: 6 digits, cannot start with 0
 * @param {string} value 
 * @returns {string|null} Error message or null
 */
export const validatePincode = (value) => {
  if (!value) return null;
  const clean = String(value).replace(/\D/g, '');
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  if (!pincodeRegex.test(clean)) {
    return 'Invalid Indian pincode (6 digits, cannot start with 0).';
  }
  return null;
};

/**
 * Validate Indian Bank Account Number
 * Format: 9 to 18 digits numeric
 * @param {string} value 
 * @returns {string|null} Error message or null
 */
export const validateBankAccount = (value) => {
  if (!value) return null;
  const clean = String(value).replace(/\D/g, '');
  if (clean.length < 9 || clean.length > 18) {
    return 'Bank account number must be between 9 and 18 digits.';
  }
  return null;
};
