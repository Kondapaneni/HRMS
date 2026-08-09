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
import { validateBusinessLoanForm, capitalizeWords, capitalizeText } from '../../utils/loanValidations';
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

  const initialLeadId = location.state?.lead_id || location.state?.id || '';

  const { formData, errors, updateField, setFormErrors, resetForm } = useFormState({
    applicant_name: capitalizeWords(initialName),
    phone_number: initialPhone ? String(initialPhone).replace(/\D/g, '').slice(0, 10) : '',
    lead_id: initialLeadId,
    age: '',
    gender: '',
    marital_status: '',
    own_house: '',
    father_name: '',
    mother_name: '',
    husband_name: '',
    aadhaar_number: '',
    current_address: '',
    current_street: '',
    current_city: '',
    current_state: '',
    current_postal_code: '',
    permanent_address: '',
    permanent_street: '',
    permanent_city: '',
    permanent_state: '',
    permanent_postal_code: '',
    employment: '',
    job_name: '',
    job_address: '',
    job_income_per_month: '',
    business_name: '',
    business_address: '',
    business_income_per_month: ''
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
      const passingLeadId = location.state?.lead_id || location.state?.id || formData.lead_id;

      if (res && res.applications && res.applications.length > 0) {
        // Find draft application specifically matching the passing lead_id and status Draft
        const draftApp = res.applications.find(app => 
          app.loan_type === 'Business Loan' && 
          app.status === 'Draft' && 
          passingLeadId && 
          String(app.lead_id) === String(passingLeadId)
        );

        if (draftApp && draftApp.form_data) {
          const savedData = draftApp.form_data;
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
          if (savedData.current_address) updateField('current_address', capitalizeText(savedData.current_address));
          if (savedData.current_street) updateField('current_street', capitalizeWords(savedData.current_street));
          if (savedData.current_city) updateField('current_city', capitalizeWords(savedData.current_city));
          if (savedData.current_state) updateField('current_state', capitalizeWords(savedData.current_state));
          if (savedData.current_postal_code) updateField('current_postal_code', String(savedData.current_postal_code).replace(/\D/g, '').slice(0, 6));
          if (savedData.permanent_address) updateField('permanent_address', capitalizeText(savedData.permanent_address));
          if (savedData.permanent_street) updateField('permanent_street', capitalizeWords(savedData.permanent_street));
          if (savedData.permanent_city) updateField('permanent_city', capitalizeWords(savedData.permanent_city));
          if (savedData.permanent_state) updateField('permanent_state', capitalizeWords(savedData.permanent_state));
          if (savedData.permanent_postal_code) updateField('permanent_postal_code', String(savedData.permanent_postal_code).replace(/\D/g, '').slice(0, 6));
          if (savedData.employment) updateField('employment', savedData.employment);
          if (savedData.job_name) updateField('job_name', capitalizeWords(savedData.job_name));
          if (savedData.job_address) updateField('job_address', capitalizeText(savedData.job_address));
          if (savedData.job_income_per_month) updateField('job_income_per_month', String(savedData.job_income_per_month).replace(/\D/g, ''));
          if (savedData.business_name) updateField('business_name', capitalizeWords(savedData.business_name));
          if (savedData.business_address) updateField('business_address', capitalizeText(savedData.business_address));
          if (savedData.business_income_per_month) updateField('business_income_per_month', String(savedData.business_income_per_month).replace(/\D/g, ''));

          if (showToast) {
            toast.success('Loaded saved draft for this lead!');
          }
        } else if (showToast) {
          toast.error('No saved draft found for this lead.');
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

    const leadIdFromSource = location.state?.lead_id || location.state?.id || '';

    if (nameFromSource && !formData.applicant_name) {
      updateField('applicant_name', capitalizeWords(nameFromSource));
    }
    if (phoneFromSource && !formData.phone_number) {
      updateField('phone_number', String(phoneFromSource).replace(/\D/g, '').slice(0, 10));
    }
    if (leadIdFromSource && !formData.lead_id) {
      updateField('lead_id', leadIdFromSource);
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
        aadhaar_number: '',
        current_address: '',
        current_street: '',
        current_city: '',
        current_state: '',
        current_postal_code: '',
        permanent_address: '',
        permanent_street: '',
        permanent_city: '',
        permanent_state: '',
        permanent_postal_code: '',
        employment: '',
        job_name: '',
        job_address: '',
        job_income_per_month: '',
        business_name: '',
        business_address: '',
        business_income_per_month: '',
        lead_id: formData.lead_id
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
      {/* Personal Details Section */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          Personal Details
        </h3>
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
      </FormGrid>
      </div>

      {/* Current Address Section */}
      <div className="pt-6 border-t border-slate-200">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          Current Address
        </h3>
        <FormGrid columns={3} gap={6}>
          <div className="col-span-3">
            <TextField
              name="current_address"
              label="Current Address"
              value={formData.current_address}
              onChange={(val) => updateField('current_address', capitalizeText(val))}
              required
              placeholder="Enter current address (accepts letters, numbers, special characters)"
              error={errors.current_address}
            />
          </div>

          <TextField
            name="current_street"
            label="Street"
            value={formData.current_street}
            onChange={(val) => updateField('current_street', capitalizeWords(val))}
            required
            placeholder="Enter street name (only text)"
            error={errors.current_street}
          />

          <TextField
            name="current_city"
            label="City"
            value={formData.current_city}
            onChange={(val) => updateField('current_city', capitalizeWords(val))}
            required
            placeholder="Enter city (only text)"
            error={errors.current_city}
          />

          <TextField
            name="current_state"
            label="State"
            value={formData.current_state}
            onChange={(val) => updateField('current_state', capitalizeWords(val))}
            required
            placeholder="Enter state (only text)"
            error={errors.current_state}
          />

          <TextField
            name="current_postal_code"
            label="Postal Code"
            value={formData.current_postal_code}
            onChange={(val) => updateField('current_postal_code', val.replace(/\D/g, '').slice(0, 6))}
            required
            placeholder="Enter 6-digit postal code"
            error={errors.current_postal_code}
          />
        </FormGrid>
      </div>

      {/* Permanent Address Section */}
      <div className="pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            Permanent Address
          </h3>
          <button
            type="button"
            onClick={() => {
              updateField('permanent_address', capitalizeText(formData.current_address || ''));
              updateField('permanent_street', capitalizeWords(formData.current_street || ''));
              updateField('permanent_city', capitalizeWords(formData.current_city || ''));
              updateField('permanent_state', capitalizeWords(formData.current_state || ''));
              updateField('permanent_postal_code', formData.current_postal_code || '');
              toast.success('Copied Current Address to Permanent Address');
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            Same as Current Address
          </button>
        </div>

        <FormGrid columns={3} gap={6}>
          <div className="col-span-3">
            <TextField
              name="permanent_address"
              label="Permanent Address"
              value={formData.permanent_address}
              onChange={(val) => updateField('permanent_address', capitalizeText(val))}
              required
              placeholder="Enter permanent address (accepts letters, numbers, special characters)"
              error={errors.permanent_address}
            />
          </div>

          <TextField
            name="permanent_street"
            label="Street"
            value={formData.permanent_street}
            onChange={(val) => updateField('permanent_street', capitalizeWords(val))}
            required
            placeholder="Enter street name (only text)"
            error={errors.permanent_street}
          />

          <TextField
            name="permanent_city"
            label="City"
            value={formData.permanent_city}
            onChange={(val) => updateField('permanent_city', capitalizeWords(val))}
            required
            placeholder="Enter city (only text)"
            error={errors.permanent_city}
          />

          <TextField
            name="permanent_state"
            label="State"
            value={formData.permanent_state}
            onChange={(val) => updateField('permanent_state', capitalizeWords(val))}
            required
            placeholder="Enter state (only text)"
            error={errors.permanent_state}
          />

          <TextField
            name="permanent_postal_code"
            label="Postal Code"
            value={formData.permanent_postal_code}
            onChange={(val) => updateField('permanent_postal_code', val.replace(/\D/g, '').slice(0, 6))}
            required
            placeholder="Enter 6-digit postal code"
            error={errors.permanent_postal_code}
          />
        </FormGrid>
      </div>

      {/* Employment Details Section */}
      <div className="pt-6 border-t border-slate-200">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          Employment Details
        </h3>
        <div className="mb-6">
          <RadioGroup
            name="employment"
            label="Employment"
            value={formData.employment}
            onChange={(val) => updateField('employment', val)}
            required
            direction="horizontal"
            options={[
              { label: 'Job', value: 'Job' },
              { label: 'Business', value: 'Business' }
            ]}
            error={errors.employment}
          />
        </div>

        {formData.employment === 'Job' && (
          <FormGrid columns={3} gap={6}>
            <TextField
              name="job_name"
              label="Job Name"
              value={formData.job_name}
              onChange={(val) => updateField('job_name', capitalizeWords(val))}
              required
              placeholder="Enter job / employer name (only text)"
              error={errors.job_name}
            />

            <TextField
              name="job_address"
              label="Job Address"
              value={formData.job_address}
              onChange={(val) => updateField('job_address', capitalizeText(val))}
              required
              placeholder="Enter workplace address"
              error={errors.job_address}
            />

            <NumberField
              name="job_income_per_month"
              label="Job Income Per Month"
              value={formData.job_income_per_month}
              onChange={(val) => updateField('job_income_per_month', val)}
              required
              placeholder="e.g. 45000"
              error={errors.job_income_per_month}
            />
          </FormGrid>
        )}

        {formData.employment === 'Business' && (
          <FormGrid columns={3} gap={6}>
            <TextField
              name="business_name"
              label="Business Name"
              value={formData.business_name}
              onChange={(val) => updateField('business_name', capitalizeWords(val))}
              required
              placeholder="Enter business name (only text)"
              error={errors.business_name}
            />

            <TextField
              name="business_address"
              label="Business Address"
              value={formData.business_address}
              onChange={(val) => updateField('business_address', capitalizeText(val))}
              required
              placeholder="Enter business address"
              error={errors.business_address}
            />

            <NumberField
              name="business_income_per_month"
              label="Business Income Per Month"
              value={formData.business_income_per_month}
              onChange={(val) => updateField('business_income_per_month', val)}
              required
              placeholder="e.g. 75000"
              error={errors.business_income_per_month}
            />
          </FormGrid>
        )}
      </div>

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
