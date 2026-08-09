import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FormGrid,
  TextField,
  PhoneField,
  NumberField,
  SelectField,
  RadioGroup,
  useFormState
} from './index';
import { validateBusinessLoanForm, capitalizeWords } from '../../utils/loanValidations';
import { submitLoanApplication } from '../../services/loanServices';
import { Send, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function BusinessLoanForm() {
  const { profile } = useAuth();
  const location = useLocation();

  // Extract default values from React Router state (passed quietly without query parameters) or user profile from DB
  const initialName = 
    location.state?.name || 
    location.state?.applicant_name || 
    profile?.full_name || 
    profile?.name || 
    '';

  const initialPhone = 
    location.state?.phone || 
    location.state?.phone_number || 
    profile?.phone || 
    profile?.phone_number || 
    profile?.mobile || 
    '';

  const { formData, errors, updateField, setFormErrors, resetForm } = useFormState({
    applicant_name: capitalizeWords(initialName),
    phone_number: initialPhone ? String(initialPhone).replace(/\D/g, '').slice(0, 10) : '',
    age: '',
    gender: '',
    marital_status: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);

  // Auto-populate when profile data or navigation state resolves
  useEffect(() => {
    const nameFromSource = 
      location.state?.name || 
      location.state?.applicant_name || 
      profile?.full_name || 
      profile?.name || 
      '';

    const phoneFromSource = 
      location.state?.phone || 
      location.state?.phone_number || 
      profile?.phone || 
      profile?.phone_number || 
      profile?.mobile || 
      '';

    if (nameFromSource && !formData.applicant_name) {
      updateField('applicant_name', capitalizeWords(nameFromSource));
    }
    if (phoneFromSource && !formData.phone_number) {
      updateField('phone_number', String(phoneFromSource).replace(/\D/g, '').slice(0, 10));
    }
  }, [profile, location.state]);

  const handleSaveDraft = async () => {
    try {
      setIsDrafting(true);
      // Save draft directly to DB table public.loan_applications in JSON format (No Local Storage)
      await submitLoanApplication('Business Loan', formData, 'Draft');
      toast.success('Business Loan draft saved to database!');
    } catch (err) {
      console.error('Error saving draft to database:', err);
      toast.error(err.response?.data?.error || 'Failed to save draft to database.');
    } finally {
      setIsDrafting(false);
    }
  };

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
      // Submit full form data to public.loan_applications in JSON format as Submitted
      await submitLoanApplication('Business Loan', formData, 'Submitted');
      toast.success('Business Loan Application Submitted Successfully!');
      resetForm({
        applicant_name: '',
        phone_number: '',
        age: '',
        gender: '',
        marital_status: ''
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

        <RadioGroup
          name="marital_status"
          label="Marital Status"
          value={formData.marital_status}
          onChange={(val) => updateField('marital_status', val)}
          required
          direction="horizontal"
          options={[
            { label: 'Yes', value: 'Yes' },
            { label: 'No', value: 'No' }
          ]}
          error={errors.marital_status}
        />
      </FormGrid>

      <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isDrafting || isSubmitting}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 h-10 px-4 py-2 transition-colors cursor-pointer border border-slate-200 gap-2 disabled:opacity-50"
        >
          {isDrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isDrafting}
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
