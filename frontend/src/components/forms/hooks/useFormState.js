import { useState, useCallback, useRef } from 'react';
import { getValueByPath, setValueByPath } from '../utils/nestedState';

/**
 * Reusable custom hook for managing form state, validation errors, and updates.
 * Designed to perform smoothly with forms containing 100-200+ fields.
 * 
 * @param {Object} initialData Initial form data object
 * @param {Object} validationRules Optional rule schema { fieldName: [validatorFn1, validatorFn2] }
 */
export function useFormState(initialData = {}, validationRules = {}) {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  
  // Keep initial data ref for reset tracking
  const initialDataRef = useRef(initialData);

  /**
   * Get field value by name or dot-separated path (e.g., 'bank.accountNumber')
   */
  const getFieldValue = useCallback((name) => {
    return getValueByPath(formData, name, '');
  }, [formData]);

  /**
   * Update a single form field by name or dot-notation path
   */
  const updateField = useCallback((name, value) => {
    setFormData((prevData) => setValueByPath(prevData, name, value));
    setIsDirty(true);

    // Clear error for this field when user starts editing
    setErrors((prevErrors) => {
      if (prevErrors[name]) {
        const nextErrors = { ...prevErrors };
        delete nextErrors[name];
        return nextErrors;
      }
      return prevErrors;
    });

    setTouched((prevTouched) => {
      if (!prevTouched[name]) {
        return { ...prevTouched, [name]: true };
      }
      return prevTouched;
    });
  }, []);

  /**
   * Set field error manually
   */
  const setFieldError = useCallback((name, error) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  /**
   * Clear error for a specific field
   */
  const clearFieldError = useCallback((name) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  /**
   * Set multiple errors at once
   */
  const setFormErrors = useCallback((newErrors) => {
    setErrors(newErrors || {});
  }, []);

  /**
   * Reset form back to initial state or new data
   */
  const resetForm = useCallback((newData = initialDataRef.current) => {
    setFormData(newData);
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, []);

  /**
   * Validate entire form against provided validation rules or a custom schema map
   * @param {Object} rulesMap Optional override for rules
   * @returns {boolean} isValid
   */
  const validateForm = useCallback((rulesMap = validationRules) => {
    const newErrors = {};
    let isValid = true;

    for (const [fieldName, ruleList] of Object.entries(rulesMap)) {
      const val = getValueByPath(formData, fieldName);
      const rules = Array.isArray(ruleList) ? ruleList : [ruleList];

      for (const ruleFn of rules) {
        if (typeof ruleFn === 'function') {
          const err = ruleFn(val, formData);
          if (err) {
            newErrors[fieldName] = err;
            isValid = false;
            break; // Stop at first validation error for this field
          }
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [formData, validationRules]);

  return {
    formData,
    errors,
    touched,
    isDirty,
    getFieldValue,
    updateField,
    setFieldError,
    clearFieldError,
    setFormErrors,
    resetForm,
    validateForm,
    setFormData
  };
}
