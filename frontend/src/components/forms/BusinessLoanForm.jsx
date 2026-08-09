import React from 'react';
import {
  FormGrid,
  TextField,
  PhoneField,
  NumberField,
  SelectField,
  useFormState
} from './index';
import { validateBusinessLoanForm, capitalizeWords } from '../../utils/loanValidations';
import { Send, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export function BusinessLoanForm() {
  const { formData, errors, updateField, setFormErrors } = useFormState({
    applicant_name: '',
    phone_number: '',
    age: '',
    gender: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Centralized validation from src/utils/loanValidations.js
    const { isValid, errors: validationErrors } = validateBusinessLoanForm(formData);

    if (isValid) {
      toast.success('Business Loan Application Submitted Successfully!');
    } else {
      setFormErrors(validationErrors);
      toast.error('Please resolve validation errors in the form.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormGrid columns={3} gap={6}>
        <TextField
          name="applicant_name"
          label="Applicant Name"
          value={formData.applicant_name}
          onChange={(val) => updateField('applicant_name', capitalizeWords(val))}
          required
          placeholder="Enter applicant full name"
          error={errors.applicant_name}
        />

        <PhoneField
          name="phone_number"
          label="Phone Number"
          value={formData.phone_number}
          onChange={(val) => updateField('phone_number', val)}
          required
          placeholder="Enter 10-digit mobile number"
          error={errors.phone_number}
        />

        <NumberField
          name="age"
          label="Age"
          value={formData.age}
          onChange={(val) => updateField('age', val)}
          required
          min={18}
          max={60}
          maxLength={2}
          placeholder="e.g. 35"
          error={errors.age}
        />

        <SelectField
          name="gender"
          label="Gender"
          value={formData.gender}
          onChange={(val) => updateField('gender', val)}
          required
          placeholder="Select gender"
          options={[
            { label: 'Male', value: 'Male' },
            { label: 'Female', value: 'Female' },
            { label: 'Other', value: 'Other' }
          ]}
          error={errors.gender}
        />
      </FormGrid>

      <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => toast.success('Business loan draft saved!')}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 h-10 px-4 py-2 transition-colors cursor-pointer border border-slate-200 gap-2"
        >
          <Save className="h-4 w-4" /> Save Draft
        </button>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors cursor-pointer shadow-sm gap-2"
        >
          <Send className="h-4 w-4" /> Submit Application
        </button>
      </div>
    </form>
  );
}
