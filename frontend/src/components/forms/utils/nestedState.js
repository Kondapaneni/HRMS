/**
 * Utilities for getting and setting nested values using dot notation paths.
 * E.g., 'bank.accountNumber', 'address.city'
 */

/**
 * Get value from an object using a dot-separated path string.
 * @param {Object} obj - Source object
 * @param {string} path - E.g. 'bank.accountNumber'
 * @param {any} defaultValue
 * @returns {any}
 */
export const getValueByPath = (obj, path, defaultValue = undefined) => {
  if (!obj || !path) return defaultValue;
  if (!path.includes('.')) {
    return obj[path] !== undefined ? obj[path] : defaultValue;
  }
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = current[key];
  }
  return current !== undefined ? current : defaultValue;
};

/**
 * Set a nested property on an object immutably using a dot-separated path string.
 * @param {Object} obj - Source object
 * @param {string} path - E.g. 'bank.accountNumber'
 * @param {any} value - Value to set
 * @returns {Object} New object with updated value
 */
export const setValueByPath = (obj = {}, path, value) => {
  if (!path) return obj;
  if (!path.includes('.')) {
    return { ...obj, [path]: value };
  }
  const keys = path.split('.');
  const result = { ...obj };
  let current = result;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = current[key] && typeof current[key] === 'object' ? { ...current[key] } : {};
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return result;
};
