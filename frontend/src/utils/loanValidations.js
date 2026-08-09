// Centralized Validation Rules for HRMS Loan Module & All Loan Types

/**
 * Validates an Indian phone number.
 * Must be exactly 10 digits and start with 6, 7, 8, or 9.
 */
export const validateLeadPhone = (phone) => {
  if (!phone) return false;
  const cleanPhone = String(phone).replace(/\D/g, '');
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(cleanPhone);
};

/**
 * Strips all numbers and special characters (leaving only letters and spaces),
 * and capitalizes the first letter of every word.
 */
export const sanitizeAndCapitalizeName = (text) => {
  if (!text) return '';
  const lettersOnly = String(text).replace(/[^a-zA-Z\s]/g, '');
  return lettersOnly.replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Alias for capitalizeWords - ensures name inputs are text-only & Title Cased.
 */
export const capitalizeWords = (text) => {
  return sanitizeAndCapitalizeName(text);
};

/**
 * Capitalizes the first letter of every word without stripping numbers or special characters.
 */
export const capitalizeText = (text) => {
  if (!text) return '';
  return String(text).replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Validate Required Field
 */
export const validateRequired = (value, fieldName = 'This field') => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return `${fieldName} is required.`;
  }
  if (Array.isArray(value) && value.length === 0) {
    return `Please select at least one ${fieldName.toLowerCase()}.`;
  }
  return null;
};

/**
 * Validate Applicant / Lead Full Name (Text only, no numbers or special chars)
 */
export const validateApplicantName = (name) => {
  const reqErr = validateRequired(name, 'Name');
  if (reqErr) return reqErr;
  const clean = String(name).trim();
  if (clean.length < 2) {
    return 'Name must be at least 2 letters.';
  }
  if (!/^[a-zA-Z\s]+$/.test(clean)) {
    return 'Name can only contain letters and spaces (no numbers or special characters).';
  }
  return null;
};

/**
 * Validate Relative Full Name (Father, Mother, Husband) - Text only, Title Cased
 */
export const validateRelativeName = (name, relativeType = 'Relative') => {
  const reqErr = validateRequired(name, `${relativeType} Name`);
  if (reqErr) return reqErr;
  const clean = String(name).trim();
  if (clean.length < 2) {
    return `${relativeType} Name must be at least 2 letters.`;
  }
  if (!/^[a-zA-Z\s]+$/.test(clean)) {
    return `${relativeType} Name can only contain letters and spaces.`;
  }
  return null;
};

/**
 * Validate Applicant Age (Minimum 18, Maximum 60)
 */
export const validateAge = (age) => {
  const reqErr = validateRequired(age, 'Age');
  if (reqErr) return reqErr;
  const num = Number(age);
  if (isNaN(num)) {
    return 'Please enter a valid age.';
  }
  if (num < 18) {
    return 'Applicant must be at least 18 years old.';
  }
  if (num > 60) {
    return 'Applicant age cannot exceed 60 years.';
  }
  return null;
};

/**
 * Validate Gender Selection
 */
export const validateGender = (gender) => {
  const reqErr = validateRequired(gender, 'Gender');
  if (reqErr) return reqErr;
  const validGenders = ['Male', 'Female', 'Other'];
  if (!validGenders.includes(String(gender))) {
    return 'Please select a valid gender option.';
  }
  return null;
};

/**
 * Validate Marital Status Selection ('Yes' or 'No')
 */
export const validateMaritalStatus = (status) => {
  const reqErr = validateRequired(status, 'Marital Status');
  if (reqErr) return reqErr;
  const validOptions = ['Yes', 'No'];
  if (!validOptions.includes(String(status))) {
    return 'Please select Marital Status (Yes or No).';
  }
  return null;
};

/**
 * Validate Own House Selection ('Yes' or 'No')
 */
export const validateOwnHouse = (status) => {
  const reqErr = validateRequired(status, 'Own House');
  if (reqErr) return reqErr;
  const validOptions = ['Yes', 'No'];
  if (!validOptions.includes(String(status))) {
    return 'Please select Own House (Yes or No).';
  }
  return null;
};

/**
 * Validate Indian PAN (Permanent Account Number)
 */
export const validatePAN = (value) => {
  if (!value) return null;
  const clean = String(value).trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(clean)) {
    return 'Invalid PAN format (e.g. ABCDE1234F).';
  }
  return null;
};

/**
 * Validate Indian Aadhaar Number
 */
export const validateAadhaar = (value) => {
  const reqErr = validateRequired(value, 'Aadhaar Number');
  if (reqErr) return reqErr;
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
 * Validate Indian GSTIN
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
 * Validate Bank Account Number
 */
export const validateBankAccount = (value) => {
  if (!value) return null;
  const clean = String(value).replace(/\D/g, '');
  if (clean.length < 9 || clean.length > 18) {
    return 'Bank account number must be between 9 and 18 digits.';
  }
  return null;
};

/**
 * Validate Loan Amount
 */
export const validateLoanAmount = (amount, min = 5000, max = 100000000) => {
  const reqErr = validateRequired(amount, 'Loan Amount');
  if (reqErr) return reqErr;
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    return 'Please enter a valid loan amount.';
  }
  if (num < min) {
    return `Loan amount must be at least ₹${min.toLocaleString('en-IN')}.`;
  }
  if (num > max) {
    return `Loan amount cannot exceed ₹${max.toLocaleString('en-IN')}.`;
  }
  return null;
};

// ==========================================
// FORM-LEVEL LOAN TYPE VALIDATION FUNCTIONS
// ==========================================

/**
 * Validate Business Loan Form Data
 */
export const validateBusinessLoanForm = (formData = {}) => {
  const errors = {};

  const nameErr = validateApplicantName(formData.applicant_name);
  if (nameErr) errors.applicant_name = nameErr;

  if (!formData.phone_number) {
    errors.phone_number = 'Phone Number is required.';
  } else if (!validateLeadPhone(formData.phone_number)) {
    errors.phone_number = 'Please enter a valid 10-digit Indian mobile number (starting with 6-9).';
  }

  const ageErr = validateAge(formData.age);
  if (ageErr) errors.age = ageErr;

  const genderErr = validateGender(formData.gender);
  if (genderErr) errors.gender = genderErr;

  const maritalErr = validateMaritalStatus(formData.marital_status);
  if (maritalErr) errors.marital_status = maritalErr;

  const ownHouseErr = validateOwnHouse(formData.own_house);
  if (ownHouseErr) errors.own_house = ownHouseErr;

  const aadhaarErr = validateAadhaar(formData.aadhaar_number);
  if (aadhaarErr) errors.aadhaar_number = aadhaarErr;

  // Conditional Logic:
  // Male + Yes = Father and Mother Name only
  // Male + No = Father and Mother Name only
  // Female + No = Father and Mother Name only
  // Female + Yes = Father and Mother and Husband Name
  const showParents = !!(formData.gender && formData.marital_status);
  const showHusband = formData.gender === 'Female' && formData.marital_status === 'Yes';

  if (showParents) {
    const fatherErr = validateRelativeName(formData.father_name, 'Father');
    if (fatherErr) errors.father_name = fatherErr;

    const motherErr = validateRelativeName(formData.mother_name, 'Mother');
    if (motherErr) errors.mother_name = motherErr;
  }

  if (showHusband) {
    const husbandErr = validateRelativeName(formData.husband_name, 'Husband');
    if (husbandErr) errors.husband_name = husbandErr;
  }

  if (formData.gstin) {
    const gstinErr = validateGSTIN(formData.gstin);
    if (gstinErr) errors.gstin = gstinErr;
  }

  if (formData.pan_number) {
    const panErr = validatePAN(formData.pan_number);
    if (panErr) errors.pan_number = panErr;
  }

  // Current Address Validation
  const curAddrErr = validateAddressText(formData.current_address, 'Current Address');
  if (curAddrErr) errors.current_address = curAddrErr;

  const curStreetErr = validateTextOnlyField(formData.current_street, 'Current Street');
  if (curStreetErr) errors.current_street = curStreetErr;

  const curCityErr = validateTextOnlyField(formData.current_city, 'Current City');
  if (curCityErr) errors.current_city = curCityErr;

  const curStateErr = validateTextOnlyField(formData.current_state, 'Current State');
  if (curStateErr) errors.current_state = curStateErr;

  const curPinErr = validatePostalCode(formData.current_postal_code, 'Current Postal Code');
  if (curPinErr) errors.current_postal_code = curPinErr;

  // Permanent Address Validation
  const permAddrErr = validateAddressText(formData.permanent_address, 'Permanent Address');
  if (permAddrErr) errors.permanent_address = permAddrErr;

  const permStreetErr = validateTextOnlyField(formData.permanent_street, 'Permanent Street');
  if (permStreetErr) errors.permanent_street = permStreetErr;

  const permCityErr = validateTextOnlyField(formData.permanent_city, 'Permanent City');
  if (permCityErr) errors.permanent_city = permCityErr;

  const permStateErr = validateTextOnlyField(formData.permanent_state, 'Permanent State');
  if (permStateErr) errors.permanent_state = permStateErr;

  const permPinErr = validatePostalCode(formData.permanent_postal_code, 'Permanent Postal Code');
  if (permPinErr) errors.permanent_postal_code = permPinErr;

  // Employment Validation
  const empErr = validateRequired(formData.employment, 'Employment');
  if (empErr) {
    errors.employment = empErr;
  } else if (formData.employment === 'Job') {
    const jobNameErr = validateTextOnlyField(formData.job_name, 'Job Name');
    if (jobNameErr) errors.job_name = jobNameErr;

    const jobAddrErr = validateAddressText(formData.job_address, 'Job Address');
    if (jobAddrErr) errors.job_address = jobAddrErr;

    const jobIncomeErr = validateRequired(formData.job_income_per_month, 'Job Income Per Month');
    if (jobIncomeErr) {
      errors.job_income_per_month = jobIncomeErr;
    } else if (Number(formData.job_income_per_month) <= 0) {
      errors.job_income_per_month = 'Job Income must be greater than 0.';
    }
  } else if (formData.employment === 'Business') {
    const bizNameErr = validateTextOnlyField(formData.business_name, 'Business Name');
    if (bizNameErr) errors.business_name = bizNameErr;

    const bizAddrErr = validateAddressText(formData.business_address, 'Business Address');
    if (bizAddrErr) errors.business_address = bizAddrErr;

    const bizIncomeErr = validateRequired(formData.business_income_per_month, 'Business Income Per Month');
    if (bizIncomeErr) {
      errors.business_income_per_month = bizIncomeErr;
    } else if (Number(formData.business_income_per_month) <= 0) {
      errors.business_income_per_month = 'Business Income must be greater than 0.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate Home Loan Form Data
 */
export const validateHomeLoanForm = (formData = {}) => {
  const errors = {};

  const nameErr = validateApplicantName(formData.applicant_name);
  if (nameErr) errors.applicant_name = nameErr;

  if (!formData.phone_number || !validateLeadPhone(formData.phone_number)) {
    errors.phone_number = 'Please enter a valid 10-digit mobile number.';
  }

  const ageErr = validateAge(formData.age);
  if (ageErr) errors.age = ageErr;

  const amountErr = validateLoanAmount(formData.requested_amount);
  if (amountErr) errors.requested_amount = amountErr;

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate Personal Loan Form Data
 */
export const validatePersonalLoanForm = (formData = {}) => {
  const errors = {};

  const nameErr = validateApplicantName(formData.applicant_name);
  if (nameErr) errors.applicant_name = nameErr;

  if (!formData.phone_number || !validateLeadPhone(formData.phone_number)) {
    errors.phone_number = 'Please enter a valid 10-digit mobile number.';
  }

  const ageErr = validateAge(formData.age);
  if (ageErr) errors.age = ageErr;

  const amountErr = validateLoanAmount(formData.requested_amount);
  if (amountErr) errors.requested_amount = amountErr;

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate Vehicle Loan Form Data
 */
export const validateVehicleLoanForm = (formData = {}) => {
  const errors = {};

  const nameErr = validateApplicantName(formData.applicant_name);
  if (nameErr) errors.applicant_name = nameErr;

  if (!formData.phone_number || !validateLeadPhone(formData.phone_number)) {
    errors.phone_number = 'Please enter a valid 10-digit mobile number.';
  }

  const ageErr = validateAge(formData.age);
  if (ageErr) errors.age = ageErr;

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate Education Loan Form Data
 */
export const validateEducationLoanForm = (formData = {}) => {
  const errors = {};

  const nameErr = validateApplicantName(formData.applicant_name);
  if (nameErr) errors.applicant_name = nameErr;

  if (!formData.phone_number || !validateLeadPhone(formData.phone_number)) {
    errors.phone_number = 'Please enter a valid 10-digit mobile number.';
  }

  const ageErr = validateAge(formData.age);
  if (ageErr) errors.age = ageErr;

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate Add Lead Form Data
 */
export const validateAddLeadForm = (formData = {}) => {
  const errors = {};

  const nameErr = validateApplicantName(formData.name);
  if (nameErr) errors.name = nameErr;

  if (!formData.phone || !validateLeadPhone(formData.phone)) {
    errors.phone = 'Please enter a valid 10-digit Indian phone number (starting with 6-9).';
  }

  if (!formData.address || String(formData.address).trim() === '') {
    errors.address = 'Please enter lead address.';
  }

  if (!formData.loan_type) {
    errors.loan_type = 'Please select a loan type.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Central schema accessor for form validation by loan type key.
 */
export const getLoanFormValidator = (loanType = 'business') => {
  switch (loanType.toLowerCase()) {
    case 'business':
    case 'business loan':
      return validateBusinessLoanForm;
    case 'home':
    case 'home loan':
      return validateHomeLoanForm;
    case 'personal':
    case 'personal loan':
      return validatePersonalLoanForm;
    case 'vehicle':
    case 'vehicle loan':
      return validateVehicleLoanForm;
    case 'education':
    case 'education loan':
      return validateEducationLoanForm;
    case 'lead':
    case 'add lead':
      return validateAddLeadForm;
    default:
      return validateBusinessLoanForm;
  }
};
