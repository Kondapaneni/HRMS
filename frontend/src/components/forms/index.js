// Reusable Form Field Component Library - Barrel Export

// Layout Components
export { FieldContainer } from './layout/FieldContainer';
export { FormSection } from './layout/FormSection';
export { FormGrid } from './layout/FormGrid';
export { FormRow } from './layout/FormRow';
export { FormCard } from './layout/FormCard';
export { FormActions } from './layout/FormActions';

// Basic Text Fields
export { TextField } from './fields/TextField';
export { TextareaField } from './fields/TextareaField';
export { EmailField } from './fields/EmailField';
export { PhoneField } from './fields/PhoneField';
export { PasswordField } from './fields/PasswordField';

// Numeric Fields
export { NumberField } from './fields/NumberField';
export { DecimalField } from './fields/DecimalField';
export { CurrencyField } from './fields/CurrencyField';
export { PercentageField } from './fields/PercentageField';

// Date & Time Fields
export { DateField } from './fields/DateField';
export { DateTimeField } from './fields/DateTimeField';
export { TimeField } from './fields/TimeField';
export { MonthField } from './fields/MonthField';

// Selection Fields
export { SelectField } from './fields/SelectField';
export { MultiSelectField } from './fields/MultiSelectField';
export { RadioGroup } from './fields/RadioGroup';
export { CheckboxField } from './fields/CheckboxField';
export { SwitchField } from './fields/SwitchField';

// File Fields
export { FileUploadField } from './fields/FileUploadField';
export { ImageUploadField } from './fields/ImageUploadField';
export { DocumentUploadField } from './fields/DocumentUploadField';

// Display & Structural Fields
export { ReadonlyField } from './fields/ReadonlyField';
export { DisplayField } from './fields/DisplayField';
export { HeadingField } from './fields/HeadingField';
export { DescriptionField } from './fields/DescriptionField';

// Business-Specific Fields
export { PANField } from './fields/PANField';
export { AadhaarField } from './fields/AadhaarField';
export { IFSCField } from './fields/IFSCField';
export { BankAccountField } from './fields/BankAccountField';
export { BankNameField } from './fields/BankNameField';
export { EmployeeIDField } from './fields/EmployeeIDField';
export { PincodeField } from './fields/PincodeField';
export { GSTINField } from './fields/GSTINField';

// Hooks
export { useFormState } from './hooks/useFormState';

// Pre-composed Business Loan Form & Paper View
export { BusinessLoanForm } from './BusinessLoanForm';
export { BusinessLoanPaperView } from './BusinessLoanPaperView';
export { BusinessLoanMobileDetailView } from './BusinessLoanMobileDetailView';

// Validation Utilities
export { validators } from './validation/validators';
export {
  validatePAN,
  validateAadhaar,
  validateIFSC,
  validateGSTIN,
  validatePincode,
  validateBankAccount
} from './validation/businessValidators';

// Formatting & Nested Utilities
export {
  formatCurrencyINR,
  parseCurrencyINR,
  formatPercentage,
  digitsOnly,
  autoUppercase,
  capitalizeWords
} from './utils/formatters';
export { getValueByPath, setValueByPath } from './utils/nestedState';
