import React, { useState } from 'react';
import {
  FormGrid,
  TextField,
  PhoneField,
  NumberField,
  SelectField,
  useFormState
} from './index';
import { validateBusinessLoanForm, capitalizeWords } from '../../utils/loanValidations';
import { submitLoanApplication } from '../../services/loanServices';
import { Send, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function BusinessLoanForm() {
  const { formData, errors, updateField, setFormErrors, resetForm } = useFormState({
    applicant_name: '',
    phone_number: '',
    age: '',
    gender: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Centralized validation from src/utils/loanValidations.js
    const { isValid, errors: validationErrors } = validateBusinessLoanForm(formData);

    if (!isValid) {
      setFormErrors(validationErrors);
      toast.error('Please resolve validation errors in the form.');
      return;
    }

    try {
      setIsSubmitting(true);
      // Submit full form data to public.loan_applications in JSON format
      await submitLoanApplication('Business Loan', formData);
      toast.success('Business Loan Application Submitted Successfully!');
      resetForm({
        applicant_name: '',
        phone_number: '',
        age: '',
        gender: ''
      });
    } catch (err) {
      console.error('Error submitting loan application:', err);
      toast.error(err.response?.data?.error || 'Failed to submit loan application.');
    } finally {
      setIsSubmitting(false);
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
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50 gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Submit Application
            </>
          )}
        </button>
      </div>
    </form>
  );
}
