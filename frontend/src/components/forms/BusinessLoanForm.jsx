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
  AadhaarField,
  useFormState
} from './index';
import { validateBusinessLoanForm, capitalizeWords } from '../../utils/loanValidations';
import { submitLoanApplication, getLoanApplications } from '../../services/loanServices';
import { Send, Save, Loader2, Download } from 'lucide-react';
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
    marital_status: '',
    own_house: '',
    father_name: '',
    mother_name: '',
    husband_name: '',
    aadhaar_number: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Conditional field visibility logic:
  // Male + Yes = Father and Mother Name only
  // Male + No = Father and Mother Name only
  // Female + No = Father and Mother Name only
  // Female + Yes = Father and Mother and Husband Name
  const showParents = !!(formData.gender && formData.marital_status);
  const showHusband = formData.gender === 'Female' && formData.marital_status === 'Yes';

  // Load saved application / draft JSON data directly from database
  const loadSavedDataFromDB = async (showToast = false) => {
    try {
      setIsLoadingData(true);
      const res = await getLoanApplications();
      if (res && res.applications && res.applications.length > 0) {
        // Find latest business loan entry
        const latest = res.applications.find(app => app.loan_type === 'Business Loan') || res.applications[0];
        if (latest && latest.form_data) {
          const savedData = latest.form_data;
          if (savedData.applicant_name) updateField('applicant_name', capitalizeWords(savedData.applicant_name));
          if (savedData.phone_number) updateField('phone_number', String(savedData.phone_number).replace(/\D/g, '').slice(0, 10));
          if (savedData.age) updateField('age', savedData.age);
          if (savedData.gender) updateField('gender', savedData.gender);
          if (savedData.marital_status) updateField('marital_status', savedData.marital_status);
          if (savedData.own_house) updateField('own_house', savedData.own_house);
          if (savedData.father_name) updateField('father_name', capitalizeWords(savedData.father_name));
          if (savedData.mother_name) updateField('mother_name', capitalizeWords(savedData.mother_name));
          if (savedData.husband_name) updateField('husband_name', capitalizeWords(savedData.husband_name));
          if (savedData.aadhaar_number) updateField('aadhaar_number', String(savedData.aadhaar_number).replace(/\D/g, '').slice(0, 12));

          if (showToast) {
            toast.success(`Loaded latest ${latest.status.toLowerCase()} from database!`);
          }
        }
      } else if (showToast) {
        toast.error('No saved data found in database.');
      }
    } catch (err) {
      console.error('Error loading application data from DB:', err);
      if (showToast) {
        toast.error('Failed to load application data from database.');
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  // Auto-populate when profile data or navigation state resolves or on mount
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

    // Load latest database application data
    loadSavedDataFromDB(false);
  }, [profile, location.state]);

  const handleSaveDraft = async () => {
    try {
      setIsDrafting(true);
      // Save draft directly to DB table public.loan_applications in JSON format
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
        marital_status: '',
        own_house: '',
        father_name: '',
        mother_name: '',
        husband_name: '',
        aadhaar_number: ''
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

        <AadhaarField
          name="aadhaar_number"
          label="Aadhaar Number"
          value={formData.aadhaar_number}
          onChange={(val) => updateField('aadhaar_number', val)}
          required
          placeholder="1234 5678 9012"
          error={errors.aadhaar_number}
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

        <RadioGroup
          name="own_house"
          label="Own House"
          value={formData.own_house}
          onChange={(val) => updateField('own_house', val)}
          required
          direction="horizontal"
          options={[
            { label: 'Yes', value: 'Yes' },
            { label: 'No', value: 'No' }
          ]}
          error={errors.own_house}
        />

        {showParents && (
          <>
            <TextField
              name="father_name"
              label="Father Name"
              value={formData.father_name}
              onChange={(val) => updateField('father_name', capitalizeWords(val))}
              required
              placeholder="Enter father full name"
              error={errors.father_name}
            />

            <TextField
              name="mother_name"
              label="Mother Name"
              value={formData.mother_name}
              onChange={(val) => updateField('mother_name', capitalizeWords(val))}
              required
              placeholder="Enter mother full name"
              error={errors.mother_name}
            />
          </>
        )}

        {showHusband && (
          <TextField
            name="husband_name"
            label="Husband Name"
            value={formData.husband_name}
            onChange={(val) => updateField('husband_name', capitalizeWords(val))}
            required
            placeholder="Enter husband full name"
            error={errors.husband_name}
          />
        )}
      </FormGrid>

      <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => loadSavedDataFromDB(true)}
          disabled={isLoadingData || isDrafting || isSubmitting}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 h-10 px-4 py-2 transition-colors cursor-pointer border border-slate-200 gap-2 disabled:opacity-50"
        >
          {isLoadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Load Saved Data
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isDrafting || isSubmitting || isLoadingData}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 h-10 px-4 py-2 transition-colors cursor-pointer border border-slate-200 gap-2 disabled:opacity-50"
        >
          {isDrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isDrafting || isLoadingData}
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
