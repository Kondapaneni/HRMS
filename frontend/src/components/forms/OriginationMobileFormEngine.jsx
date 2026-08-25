import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import {
  TextField,
  PhoneField,
  NumberField,
  RadioGroup,
  AadhaarField,
  useFormState
} from './index';
import { 
  validatePersonalLoanForm, 
  validateBusinessLoanForm, 
  capitalizeWords, 
  capitalizeText 
} from '../../utils/loanValidations';
import { 
  submitLoanApplication, 
  getLoanApplications, 
  updateLoanApplicationDetails 
} from '../../services/loanServices';
import { 
  Send, 
  Save, 
  Loader2, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  User,
  MapPin,
  Briefcase,
  Users,
  ShieldCheck,
  Copy,
  Check,
  Building2,
  Phone,
  Home,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export function OriginationMobileFormEngine({ loanType = 'Personal Loan', isEditMode = false, application: propApplication, onSaved }) {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeStep, setActiveStep] = useState(1);
  const [activeGuarantorTab, setActiveGuarantorTab] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [loadedAppId, setLoadedAppId] = useState(null);

  // Extract initial values from router state or user profile
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

  const { formData, errors, updateField, setFormErrors } = useFormState({
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
    employment: loanType === 'Business Loan' ? 'Business' : 'Job',
    job_name: '',
    job_address: '',
    job_income_per_month: '',
    business_name: '',
    business_address: '',
    business_income_per_month: '',
    has_co_applicant: 'No',
    co_applicant_name: '',
    co_relation_with_applicant: '',
    co_phone_number: '',
    co_aadhaar_number: '',
    co_age: '',
    co_gender: '',
    co_marital_status: '',
    co_father_name: '',
    co_mother_name: '',
    co_husband_name: '',
    co_own_house: '',
    co_current_address: '',
    co_current_street: '',
    co_current_city: '',
    co_current_state: '',
    co_current_postal_code: '',
    co_permanent_address: '',
    co_permanent_street: '',
    co_permanent_city: '',
    co_permanent_state: '',
    co_permanent_postal_code: '',
    co_employment: '',
    co_job_name: '',
    co_job_address: '',
    co_job_income_per_month: '',
    co_business_name: '',
    co_business_address: '',
    co_business_income_per_month: '',
    guarantor_1_name: '', guarantor_1_phone_number: '', guarantor_1_aadhaar_number: '', guarantor_1_age: '', guarantor_1_gender: '', guarantor_1_marital_status: '', guarantor_1_father_name: '', guarantor_1_mother_name: '', guarantor_1_husband_name: '', guarantor_1_own_house: '', guarantor_1_current_address: '', guarantor_1_current_street: '', guarantor_1_current_city: '', guarantor_1_current_state: '', guarantor_1_current_postal_code: '', guarantor_1_permanent_address: '', guarantor_1_permanent_street: '', guarantor_1_permanent_city: '', guarantor_1_permanent_state: '', guarantor_1_permanent_postal_code: '', guarantor_1_employment: '', guarantor_1_job_name: '', guarantor_1_job_address: '', guarantor_1_job_income_per_month: '', guarantor_1_business_name: '', guarantor_1_business_address: '', guarantor_1_business_income_per_month: '',
    guarantor_2_name: '', guarantor_2_phone_number: '', guarantor_2_aadhaar_number: '', guarantor_2_age: '', guarantor_2_gender: '', guarantor_2_marital_status: '', guarantor_2_father_name: '', guarantor_2_mother_name: '', guarantor_2_husband_name: '', guarantor_2_own_house: '', guarantor_2_current_address: '', guarantor_2_current_street: '', guarantor_2_current_city: '', guarantor_2_current_state: '', guarantor_2_current_postal_code: '', guarantor_2_permanent_address: '', guarantor_2_permanent_street: '', guarantor_2_permanent_city: '', guarantor_2_permanent_state: '', guarantor_2_permanent_postal_code: '', guarantor_2_employment: '', guarantor_2_job_name: '', guarantor_2_job_address: '', guarantor_2_job_income_per_month: '', guarantor_2_business_name: '', guarantor_2_business_address: '', guarantor_2_business_income_per_month: '',
    guarantor_3_name: '', guarantor_3_phone_number: '', guarantor_3_aadhaar_number: '', guarantor_3_age: '', guarantor_3_gender: '', guarantor_3_marital_status: '', guarantor_3_father_name: '', guarantor_3_mother_name: '', guarantor_3_husband_name: '', guarantor_3_own_house: '', guarantor_3_current_address: '', guarantor_3_current_street: '', guarantor_3_current_city: '', guarantor_3_current_state: '', guarantor_3_current_postal_code: '', guarantor_3_permanent_address: '', guarantor_3_permanent_street: '', guarantor_3_permanent_city: '', guarantor_3_permanent_state: '', guarantor_3_permanent_postal_code: '', guarantor_3_employment: '', guarantor_3_job_name: '', guarantor_3_job_address: '', guarantor_3_job_income_per_month: '', guarantor_3_business_name: '', guarantor_3_business_address: '', guarantor_3_business_income_per_month: ''
  });

  // Populate data when editing an application
  useEffect(() => {
    const appToLoad = propApplication || location.state?.application;
    if (appToLoad) {
      setLoadedAppId(appToLoad.application_id || appToLoad.id);
      const savedData = appToLoad.form_data || appToLoad;
      Object.keys(savedData).forEach((key) => {
        if (savedData[key] !== undefined && savedData[key] !== null) {
          updateField(key, savedData[key]);
        }
      });
    }
  }, [propApplication, location.state?.application]);

  // Conditional visibility flags
  const showParents = !!(formData.gender && formData.marital_status);
  const showHusband = formData.gender === 'Female' && formData.marital_status === 'Yes';
  const showCoParents = !!(formData.co_gender && formData.co_marital_status);
  const showCoHusband = formData.co_gender === 'Female' && formData.co_marital_status === 'Yes';

  const steps = [
    { id: 1, title: 'Applicant KYC', icon: User, desc: 'Identity & Demographics' },
    { id: 2, title: 'Addresses', icon: MapPin, desc: 'Current & Permanent' },
    { id: 3, title: 'Income & Work', icon: Briefcase, desc: 'Employment Profile' },
    { id: 4, title: 'Co-Applicant', icon: Users, desc: 'Co-Borrower Details' },
    { id: 5, title: 'Guarantors', icon: ShieldCheck, desc: '3 Guarantor Profiles' },
  ];

  // Copy current address to permanent address
  const handleCopyAddress = () => {
    updateField('permanent_address', formData.current_address);
    updateField('permanent_street', formData.current_street);
    updateField('permanent_city', formData.current_city);
    updateField('permanent_state', formData.current_state);
    updateField('permanent_postal_code', formData.current_postal_code);
    toast.success('Current address copied to permanent address!');
  };

  const handleCopyCoAddress = () => {
    updateField('co_permanent_address', formData.co_current_address);
    updateField('co_permanent_street', formData.co_current_street);
    updateField('co_permanent_city', formData.co_current_city);
    updateField('co_permanent_state', formData.co_current_state);
    updateField('co_permanent_postal_code', formData.co_current_postal_code);
    toast.success('Co-applicant address copied!');
  };

  const handleCopyGuarantorAddress = (idx) => {
    const pfx = `guarantor_${idx}_`;
    updateField(`${pfx}permanent_address`, formData[`${pfx}current_address`]);
    updateField(`${pfx}permanent_street`, formData[`${pfx}current_street`]);
    updateField(`${pfx}permanent_city`, formData[`${pfx}current_city`]);
    updateField(`${pfx}permanent_state`, formData[`${pfx}current_state`]);
    updateField(`${pfx}permanent_postal_code`, formData[`${pfx}current_postal_code`]);
    toast.success(`Guarantor ${idx} address copied!`);
  };

  const validateCurrentForm = () => {
    return loanType === 'Business Loan' 
      ? validateBusinessLoanForm(formData) 
      : validatePersonalLoanForm(formData);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const { isValid, errors: validationErrors } = validateCurrentForm();

    if (!isValid) {
      setFormErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      toast.error(firstError || 'Please complete all required fields.');

      // Auto jump to the error step
      const errKeys = Object.keys(validationErrors);
      if (errKeys.some(k => ['applicant_name', 'phone_number', 'aadhaar_number', 'age', 'gender', 'marital_status', 'father_name', 'mother_name', 'husband_name', 'own_house'].includes(k))) {
        setActiveStep(1);
      } else if (errKeys.some(k => k.startsWith('current_') || k.startsWith('permanent_'))) {
        setActiveStep(2);
      } else if (errKeys.some(k => ['employment', 'job_name', 'job_address', 'job_income_per_month', 'business_name', 'business_address', 'business_income_per_month'].includes(k))) {
        setActiveStep(3);
      } else if (errKeys.some(k => k.startsWith('co_') || k === 'has_co_applicant')) {
        setActiveStep(4);
      } else if (errKeys.some(k => k.startsWith('guarantor_'))) {
        setActiveStep(5);
        if (errKeys.some(k => k.startsWith('guarantor_1_'))) setActiveGuarantorTab(1);
        else if (errKeys.some(k => k.startsWith('guarantor_2_'))) setActiveGuarantorTab(2);
        else if (errKeys.some(k => k.startsWith('guarantor_3_'))) setActiveGuarantorTab(3);
      }
      return;
    }

    try {
      setIsSubmitting(true);
      const existingId = loadedAppId || propApplication?.application_id || propApplication?.id;

      if (existingId) {
        await updateLoanApplicationDetails(existingId, formData, loanType, 'Created');
        toast.success(`${loanType} Application Updated Successfully!`);
        if (onSaved) onSaved();
      } else {
        await submitLoanApplication(loanType, formData, 'Created');
        toast.success(`${loanType} Application Created Successfully!`);
      }

      queryClient.invalidateQueries({ queryKey: ['origination', 'applications', 'list'] });
      setTimeout(() => {
        navigate('/employee/loans/origination/applications');
      }, 800);
    } catch (err) {
      console.error('Error submitting form:', err);
      toast.error(err.response?.data?.error || 'Failed to submit loan application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.applicant_name?.trim() || !formData.phone_number?.trim()) {
      toast.error('Applicant Name & Phone Number are required to save a draft.');
      setActiveStep(1);
      return;
    }

    try {
      setIsDrafting(true);
      const existingId = loadedAppId || propApplication?.application_id || propApplication?.id;

      if (existingId) {
        await updateLoanApplicationDetails(existingId, formData, loanType, 'Draft');
        toast.success('Draft Saved Successfully!');
      } else {
        await submitLoanApplication(loanType, formData, 'Draft');
        toast.success('Draft Application Created!');
      }

      queryClient.invalidateQueries({ queryKey: ['origination', 'applications', 'list'] });
    } catch (err) {
      console.error('Error saving draft:', err);
      toast.error(err.response?.data?.error || 'Failed to save draft.');
    } finally {
      setIsDrafting(false);
    }
  };

  // Render individual Guarantor Sub-form (Guarantor 1, 2, 3)
  const renderGuarantorForm = (idx) => {
    const pfx = `guarantor_${idx}_`;
    const labelPfx = `Guarantor ${idx}`;
    const gGender = formData[`${pfx}gender`];
    const gMarital = formData[`${pfx}marital_status`];
    const gEmp = formData[`${pfx}employment`];
    const showGParents = !!(gGender && gMarital);
    const showGHusband = gGender === 'Female' && gMarital === 'Yes';

    return (
      <div key={idx} className="space-y-4 pt-1">
        {/* Personal Details */}
        <div className="space-y-3.5">
          <TextField
            name={`${pfx}name`}
            label={`${labelPfx} Full Name`}
            value={formData[`${pfx}name`]}
            onChange={(val) => updateField(`${pfx}name`, capitalizeWords(val))}
            required
            placeholder="Enter full name"
            error={errors[`${pfx}name`]}
          />

          <PhoneField
            name={`${pfx}phone_number`}
            label="Phone Number"
            value={formData[`${pfx}phone_number`]}
            onChange={(val) => updateField(`${pfx}phone_number`, val)}
            required
            placeholder="10-digit mobile number"
            error={errors[`${pfx}phone_number`]}
          />

          <AadhaarField
            name={`${pfx}aadhaar_number`}
            label="Aadhaar Number"
            value={formData[`${pfx}aadhaar_number`]}
            onChange={(val) => updateField(`${pfx}aadhaar_number`, val)}
            required
            placeholder="12-digit Aadhaar number"
            error={errors[`${pfx}aadhaar_number`]}
          />

          <NumberField
            name={`${pfx}age`}
            label="Age (Years)"
            value={formData[`${pfx}age`]}
            onChange={(val) => updateField(`${pfx}age`, val)}
            required
            placeholder="e.g. 35"
            error={errors[`${pfx}age`]}
          />

          <RadioGroup
            name={`${pfx}gender`}
            label="Gender"
            value={formData[`${pfx}gender`]}
            onChange={(val) => updateField(`${pfx}gender`, val)}
            required
            options={[
              { label: 'Male', value: 'Male' },
              { label: 'Female', value: 'Female' }
            ]}
            error={errors[`${pfx}gender`]}
          />

          <RadioGroup
            name={`${pfx}marital_status`}
            label="Married Status"
            value={formData[`${pfx}marital_status`]}
            onChange={(val) => updateField(`${pfx}marital_status`, val)}
            required
            options={[
              { label: 'Married', value: 'Yes' },
              { label: 'Unmarried / Single', value: 'No' }
            ]}
            error={errors[`${pfx}marital_status`]}
          />

          {showGParents && (
            <>
              <TextField
                name={`${pfx}father_name`}
                label="Father's Full Name"
                value={formData[`${pfx}father_name`]}
                onChange={(val) => updateField(`${pfx}father_name`, capitalizeWords(val))}
                required
                placeholder="Enter father's name"
                error={errors[`${pfx}father_name`]}
              />

              <TextField
                name={`${pfx}mother_name`}
                label="Mother's Full Name"
                value={formData[`${pfx}mother_name`]}
                onChange={(val) => updateField(`${pfx}mother_name`, capitalizeWords(val))}
                required
                placeholder="Enter mother's name"
                error={errors[`${pfx}mother_name`]}
              />
            </>
          )}

          {showGHusband && (
            <TextField
              name={`${pfx}husband_name`}
              label="Husband's Full Name"
              value={formData[`${pfx}husband_name`]}
              onChange={(val) => updateField(`${pfx}husband_name`, capitalizeWords(val))}
              required
              placeholder="Enter husband's name"
              error={errors[`${pfx}husband_name`]}
            />
          )}

          <RadioGroup
            name={`${pfx}own_house`}
            label="Residential House Ownership"
            value={formData[`${pfx}own_house`]}
            onChange={(val) => updateField(`${pfx}own_house`, val)}
            required
            options={[
              { label: 'Own House', value: 'Yes' },
              { label: 'Rented House', value: 'No' }
            ]}
            error={errors[`${pfx}own_house`]}
          />
        </div>

        {/* Address Details */}
        <div className="space-y-3.5 pt-3 border-t border-[#f1f3f4]">
          <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#1a73e8]" /> Current Residence
          </h4>

          <TextField
            name={`${pfx}current_address`}
            label="House / Flat / Door No."
            value={formData[`${pfx}current_address`]}
            onChange={(val) => updateField(`${pfx}current_address`, capitalizeText(val))}
            required
            placeholder="Door / Plot / Flat No."
            error={errors[`${pfx}current_address`]}
          />

          <TextField
            name={`${pfx}current_street`}
            label="Street / Locality / Area"
            value={formData[`${pfx}current_street`]}
            onChange={(val) => updateField(`${pfx}current_street`, capitalizeWords(val))}
            required
            placeholder="Enter street & locality"
            error={errors[`${pfx}current_street`]}
          />

          <TextField
            name={`${pfx}current_city`}
            label="City / Town / Village"
            value={formData[`${pfx}current_city`]}
            onChange={(val) => updateField(`${pfx}current_city`, capitalizeWords(val))}
            required
            placeholder="Enter city"
            error={errors[`${pfx}current_city`]}
          />

          <TextField
            name={`${pfx}current_state`}
            label="State"
            value={formData[`${pfx}current_state`]}
            onChange={(val) => updateField(`${pfx}current_state`, capitalizeWords(val))}
            required
            placeholder="Enter state"
            error={errors[`${pfx}current_state`]}
          />

          <NumberField
            name={`${pfx}current_postal_code`}
            label="Pincode"
            value={formData[`${pfx}current_postal_code`]}
            onChange={(val) => updateField(`${pfx}current_postal_code`, val)}
            required
            placeholder="6-digit pincode"
            error={errors[`${pfx}current_postal_code`]}
          />
        </div>

        {/* Permanent Address */}
        <div className="space-y-3.5 pt-3 border-t border-[#f1f3f4]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#1a73e8]" /> Permanent Residence
            </h4>
            <button
              type="button"
              onClick={() => handleCopyGuarantorAddress(idx)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-1 rounded-full cursor-pointer hover:bg-[#d2e3fc]"
            >
              <Copy size={11} /> Same as Current
            </button>
          </div>

          <TextField
            name={`${pfx}permanent_address`}
            label="Permanent House / Flat No."
            value={formData[`${pfx}permanent_address`]}
            onChange={(val) => updateField(`${pfx}permanent_address`, capitalizeText(val))}
            required
            placeholder="Door / Plot / Flat No."
            error={errors[`${pfx}permanent_address`]}
          />

          <TextField
            name={`${pfx}permanent_street`}
            label="Permanent Street / Locality"
            value={formData[`${pfx}permanent_street`]}
            onChange={(val) => updateField(`${pfx}permanent_street`, capitalizeWords(val))}
            required
            placeholder="Enter street & locality"
            error={errors[`${pfx}permanent_street`]}
          />

          <TextField
            name={`${pfx}permanent_city`}
            label="Permanent City"
            value={formData[`${pfx}permanent_city`]}
            onChange={(val) => updateField(`${pfx}permanent_city`, capitalizeWords(val))}
            required
            placeholder="Enter city"
            error={errors[`${pfx}permanent_city`]}
          />

          <TextField
            name={`${pfx}permanent_state`}
            label="Permanent State"
            value={formData[`${pfx}permanent_state`]}
            onChange={(val) => updateField(`${pfx}permanent_state`, capitalizeWords(val))}
            required
            placeholder="Enter state"
            error={errors[`${pfx}permanent_state`]}
          />

          <NumberField
            name={`${pfx}permanent_postal_code`}
            label="Permanent Pincode"
            value={formData[`${pfx}permanent_postal_code`]}
            onChange={(val) => updateField(`${pfx}permanent_postal_code`, val)}
            required
            placeholder="6-digit pincode"
            error={errors[`${pfx}permanent_postal_code`]}
          />
        </div>

        {/* Employment Details */}
        <div className="space-y-3.5 pt-3 border-t border-[#f1f3f4]">
          <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-[#1a73e8]" /> Employment & Income
          </h4>

          <RadioGroup
            name={`${pfx}employment`}
            label="Employment Classification"
            value={formData[`${pfx}employment`]}
            onChange={(val) => updateField(`${pfx}employment`, val)}
            required
            options={[
              { label: 'Salaried / Job', value: 'Job' },
              { label: 'Self-Employed / Business', value: 'Business' }
            ]}
            error={errors[`${pfx}employment`]}
          />

          {gEmp === 'Job' && (
            <>
              <TextField
                name={`${pfx}job_name`}
                label="Company / Employer Name"
                value={formData[`${pfx}job_name`]}
                onChange={(val) => updateField(`${pfx}job_name`, capitalizeWords(val))}
                required
                placeholder="Enter workplace name"
                error={errors[`${pfx}job_name`]}
              />

              <TextField
                name={`${pfx}job_address`}
                label="Workplace Address"
                value={formData[`${pfx}job_address`]}
                onChange={(val) => updateField(`${pfx}job_address`, capitalizeText(val))}
                required
                placeholder="Enter workplace address"
                error={errors[`${pfx}job_address`]}
              />

              <NumberField
                name={`${pfx}job_income_per_month`}
                label="Monthly Net Income (₹)"
                value={formData[`${pfx}job_income_per_month`]}
                onChange={(val) => updateField(`${pfx}job_income_per_month`, val)}
                required
                placeholder="e.g. 45000"
                error={errors[`${pfx}job_income_per_month`]}
              />
            </>
          )}

          {gEmp === 'Business' && (
            <>
              <TextField
                name={`${pfx}business_name`}
                label="Business Enterprise Name"
                value={formData[`${pfx}business_name`]}
                onChange={(val) => updateField(`${pfx}business_name`, capitalizeWords(val))}
                required
                placeholder="Enter business name"
                error={errors[`${pfx}business_name`]}
              />

              <TextField
                name={`${pfx}business_address`}
                label="Business Address"
                value={formData[`${pfx}business_address`]}
                onChange={(val) => updateField(`${pfx}business_address`, capitalizeText(val))}
                required
                placeholder="Enter business address"
                error={errors[`${pfx}business_address`]}
              />

              <NumberField
                name={`${pfx}business_income_per_month`}
                label="Monthly Business Income (₹)"
                value={formData[`${pfx}business_income_per_month`]}
                onChange={(val) => updateField(`${pfx}business_income_per_month`, val)}
                required
                placeholder="e.g. 75000"
                error={errors[`${pfx}business_income_per_month`]}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  const progressPercent = Math.round((activeStep / 5) * 100);

  return (
    <div className="space-y-4 pb-24 w-full">

      {/* 1. Mobile Stepper Header & Progress Tracker */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-4 shadow-xs space-y-3">
        {/* Progress Header */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1a73e8] animate-pulse" />
            <span className="font-bold text-[#1f1f1f]">
              Step {activeStep} of 5: <span className="text-[#1a73e8]">{steps[activeStep - 1]?.title}</span>
            </span>
          </div>
          <span className="font-bold text-[11px] text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded-full border border-[#d2e3fc]">
            {progressPercent}% Complete
          </span>
        </div>

        {/* Progress Bar Line */}
        <div className="w-full bg-[#f1f3f4] h-2 rounded-full overflow-hidden">
          <div 
            className="bg-[#1a73e8] h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Horizontal Swipable Step Chips */}
        <div className="flex overflow-x-auto gap-2 pt-1 pb-0.5 hide-scrollbar">
          {steps.map((s) => {
            const isCurrent = activeStep === s.id;
            const isCompleted = activeStep > s.id;
            const Icon = s.icon;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStep(s.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                  isCurrent
                    ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-xs'
                    : isCompleted
                    ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                    : 'bg-[#f8fafd] text-[#5f6368] border-[#e0e3e7] hover:bg-[#f1f3f4]'
                }`}
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCurrent ? 'bg-white/20 text-white' : isCompleted ? 'bg-[#137333] text-white' : 'bg-white text-[#5f6368]'
                }`}>
                  {isCompleted ? <Check size={10} strokeWidth={3} /> : s.id}
                </div>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Step Form Card */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* STEP 1: APPLICANT PERSONAL DETAILS */}
        {activeStep === 1 && (
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#f1f3f4]">
              <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">1. Applicant Profile</h3>
                <p className="text-[10px] text-[#5f6368]">Primary borrower KYC &amp; identity details</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <TextField
                name="applicant_name"
                label="Applicant Full Name"
                value={formData.applicant_name}
                onChange={(val) => updateField('applicant_name', capitalizeWords(val))}
                required
                placeholder="Enter full legal name"
                error={errors.applicant_name}
              />

              <PhoneField
                name="phone_number"
                label="Primary Contact Number"
                value={formData.phone_number}
                onChange={(val) => updateField('phone_number', val)}
                required
                placeholder="10-digit mobile number"
                error={errors.phone_number}
              />

              <AadhaarField
                name="aadhaar_number"
                label="Aadhaar Card Number"
                value={formData.aadhaar_number}
                onChange={(val) => updateField('aadhaar_number', val)}
                required
                placeholder="12-digit Aadhaar number"
                error={errors.aadhaar_number}
              />

              <NumberField
                name="age"
                label="Age (Years)"
                value={formData.age}
                onChange={(val) => updateField('age', val)}
                required
                placeholder="e.g. 32"
                error={errors.age}
              />

              <RadioGroup
                name="gender"
                label="Gender"
                value={formData.gender}
                onChange={(val) => updateField('gender', val)}
                required
                options={[
                  { label: 'Male', value: 'Male' },
                  { label: 'Female', value: 'Female' }
                ]}
                error={errors.gender}
              />

              <RadioGroup
                name="marital_status"
                label="Marital Status"
                value={formData.marital_status}
                onChange={(val) => updateField('marital_status', val)}
                required
                options={[
                  { label: 'Married', value: 'Yes' },
                  { label: 'Unmarried / Single', value: 'No' }
                ]}
                error={errors.marital_status}
              />

              {showParents && (
                <>
                  <TextField
                    name="father_name"
                    label="Father's Full Name"
                    value={formData.father_name}
                    onChange={(val) => updateField('father_name', capitalizeWords(val))}
                    required
                    placeholder="Enter father's name"
                    error={errors.father_name}
                  />

                  <TextField
                    name="mother_name"
                    label="Mother's Full Name"
                    value={formData.mother_name}
                    onChange={(val) => updateField('mother_name', capitalizeWords(val))}
                    required
                    placeholder="Enter mother's name"
                    error={errors.mother_name}
                  />
                </>
              )}

              {showHusband && (
                <TextField
                  name="husband_name"
                  label="Husband's Full Name"
                  value={formData.husband_name}
                  onChange={(val) => updateField('husband_name', capitalizeWords(val))}
                  required
                  placeholder="Enter husband's name"
                  error={errors.husband_name}
                />
              )}

              <RadioGroup
                name="own_house"
                label="Residential Property Status"
                value={formData.own_house}
                onChange={(val) => updateField('own_house', val)}
                required
                options={[
                  { label: 'Own House', value: 'Yes' },
                  { label: 'Rented House', value: 'No' }
                ]}
                error={errors.own_house}
              />
            </div>
          </div>
        )}

        {/* STEP 2: ADDRESSES */}
        {activeStep === 2 && (
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-5">
            {/* Current Address */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 pb-3 border-b border-[#f1f3f4]">
                <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Current Residential Address</h3>
                  <p className="text-[10px] text-[#5f6368]">Present residence location</p>
                </div>
              </div>

              <TextField
                name="current_address"
                label="House / Flat / Door No."
                value={formData.current_address}
                onChange={(val) => updateField('current_address', capitalizeText(val))}
                required
                placeholder="Door / Flat / Plot No."
                error={errors.current_address}
              />

              <TextField
                name="current_street"
                label="Street / Area / Locality"
                value={formData.current_street}
                onChange={(val) => updateField('current_street', capitalizeWords(val))}
                required
                placeholder="Street name & landmark"
                error={errors.current_street}
              />

              <TextField
                name="current_city"
                label="City / Town"
                value={formData.current_city}
                onChange={(val) => updateField('current_city', capitalizeWords(val))}
                required
                placeholder="City name"
                error={errors.current_city}
              />

              <TextField
                name="current_state"
                label="State"
                value={formData.current_state}
                onChange={(val) => updateField('current_state', capitalizeWords(val))}
                required
                placeholder="State name"
                error={errors.current_state}
              />

              <NumberField
                name="current_postal_code"
                label="Pincode"
                value={formData.current_postal_code}
                onChange={(val) => updateField('current_postal_code', val)}
                required
                placeholder="6-digit postal code"
                error={errors.current_postal_code}
              />
            </div>

            {/* Permanent Address */}
            <div className="space-y-3.5 pt-3 border-t border-[#e0e3e7]">
              <div className="flex items-center justify-between pb-2 border-b border-[#f1f3f4]">
                <div>
                  <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Permanent Address</h3>
                  <p className="text-[10px] text-[#5f6368]">Official domicile residence</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-1 rounded-full cursor-pointer hover:bg-[#d2e3fc]"
                >
                  <Copy size={11} /> Same as Current
                </button>
              </div>

              <TextField
                name="permanent_address"
                label="Permanent House / Flat No."
                value={formData.permanent_address}
                onChange={(val) => updateField('permanent_address', capitalizeText(val))}
                required
                placeholder="Door / Flat / Plot No."
                error={errors.permanent_address}
              />

              <TextField
                name="permanent_street"
                label="Permanent Street / Locality"
                value={formData.permanent_street}
                onChange={(val) => updateField('permanent_street', capitalizeWords(val))}
                required
                placeholder="Street name & landmark"
                error={errors.permanent_street}
              />

              <TextField
                name="permanent_city"
                label="Permanent City"
                value={formData.permanent_city}
                onChange={(val) => updateField('permanent_city', capitalizeWords(val))}
                required
                placeholder="City name"
                error={errors.permanent_city}
              />

              <TextField
                name="permanent_state"
                label="Permanent State"
                value={formData.permanent_state}
                onChange={(val) => updateField('permanent_state', capitalizeWords(val))}
                required
                placeholder="State name"
                error={errors.permanent_state}
              />

              <NumberField
                name="permanent_postal_code"
                label="Permanent Pincode"
                value={formData.permanent_postal_code}
                onChange={(val) => updateField('permanent_postal_code', val)}
                required
                placeholder="6-digit postal code"
                error={errors.permanent_postal_code}
              />
            </div>
          </div>
        )}

        {/* STEP 3: EMPLOYMENT & INCOME */}
        {activeStep === 3 && (
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#f1f3f4]">
              <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">3. Employment &amp; Income Profile</h3>
                <p className="text-[10px] text-[#5f6368]">Income source and monthly cashflow verification</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <RadioGroup
                name="employment"
                label="Primary Income Source"
                value={formData.employment}
                onChange={(val) => updateField('employment', val)}
                required
                options={[
                  { label: 'Salaried / Job', value: 'Job' },
                  { label: 'Self-Employed / Business', value: 'Business' }
                ]}
                error={errors.employment}
              />

              {formData.employment === 'Job' && (
                <>
                  <TextField
                    name="job_name"
                    label="Company / Employer Name"
                    value={formData.job_name}
                    onChange={(val) => updateField('job_name', capitalizeWords(val))}
                    required
                    placeholder="Enter workplace name"
                    error={errors.job_name}
                  />

                  <TextField
                    name="job_address"
                    label="Workplace Address"
                    value={formData.job_address}
                    onChange={(val) => updateField('job_address', capitalizeText(val))}
                    required
                    placeholder="Workplace street, area, city"
                    error={errors.job_address}
                  />

                  <NumberField
                    name="job_income_per_month"
                    label="Monthly Net Salary (₹)"
                    value={formData.job_income_per_month}
                    onChange={(val) => updateField('job_income_per_month', val)}
                    required
                    placeholder="e.g. 50000"
                    error={errors.job_income_per_month}
                  />
                </>
              )}

              {formData.employment === 'Business' && (
                <>
                  <TextField
                    name="business_name"
                    label="Business Enterprise Name"
                    value={formData.business_name}
                    onChange={(val) => updateField('business_name', capitalizeWords(val))}
                    required
                    placeholder="Enter business / store name"
                    error={errors.business_name}
                  />

                  <TextField
                    name="business_address"
                    label="Business Location Address"
                    value={formData.business_address}
                    onChange={(val) => updateField('business_address', capitalizeText(val))}
                    required
                    placeholder="Business premises location"
                    error={errors.business_address}
                  />

                  <NumberField
                    name="business_income_per_month"
                    label="Monthly Net Business Income (₹)"
                    value={formData.business_income_per_month}
                    onChange={(val) => updateField('business_income_per_month', val)}
                    required
                    placeholder="e.g. 85000"
                    error={errors.business_income_per_month}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: CO-APPLICANT */}
        {activeStep === 4 && (
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#f1f3f4]">
              <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">4. Co-Applicant Details</h3>
                <p className="text-[10px] text-[#5f6368]">Optional joint co-borrower evaluation</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <RadioGroup
                name="has_co_applicant"
                label="Add a Co-Applicant to this Loan?"
                value={formData.has_co_applicant}
                onChange={(val) => updateField('has_co_applicant', val)}
                required
                options={[
                  { label: 'Yes, Add Co-Applicant', value: 'Yes' },
                  { label: 'No Co-Applicant', value: 'No' }
                ]}
                error={errors.has_co_applicant}
              />

              {formData.has_co_applicant === 'Yes' && (
                <div className="space-y-3.5 pt-2 border-t border-[#f1f3f4]">
                  <TextField
                    name="co_applicant_name"
                    label="Co-Applicant Full Name"
                    value={formData.co_applicant_name}
                    onChange={(val) => updateField('co_applicant_name', capitalizeWords(val))}
                    required
                    placeholder="Enter co-applicant full name"
                    error={errors.co_applicant_name}
                  />

                  <TextField
                    name="co_relation_with_applicant"
                    label="Relationship with Applicant"
                    value={formData.co_relation_with_applicant}
                    onChange={(val) => updateField('co_relation_with_applicant', capitalizeWords(val))}
                    required
                    placeholder="e.g. Spouse, Brother, Father"
                    error={errors.co_relation_with_applicant}
                  />

                  <PhoneField
                    name="co_phone_number"
                    label="Co-Applicant Phone"
                    value={formData.co_phone_number}
                    onChange={(val) => updateField('co_phone_number', val)}
                    required
                    placeholder="10-digit mobile number"
                    error={errors.co_phone_number}
                  />

                  <AadhaarField
                    name="co_aadhaar_number"
                    label="Co-Applicant Aadhaar Number"
                    value={formData.co_aadhaar_number}
                    onChange={(val) => updateField('co_aadhaar_number', val)}
                    required
                    placeholder="12-digit Aadhaar number"
                    error={errors.co_aadhaar_number}
                  />

                  <NumberField
                    name="co_age"
                    label="Co-Applicant Age (Years)"
                    value={formData.co_age}
                    onChange={(val) => updateField('co_age', val)}
                    required
                    placeholder="e.g. 29"
                    error={errors.co_age}
                  />

                  <RadioGroup
                    name="co_gender"
                    label="Co-Applicant Gender"
                    value={formData.co_gender}
                    onChange={(val) => updateField('co_gender', val)}
                    required
                    options={[
                      { label: 'Male', value: 'Male' },
                      { label: 'Female', value: 'Female' }
                    ]}
                    error={errors.co_gender}
                  />

                  <RadioGroup
                    name="co_marital_status"
                    label="Co-Applicant Marital Status"
                    value={formData.co_marital_status}
                    onChange={(val) => updateField('co_marital_status', val)}
                    required
                    options={[
                      { label: 'Married', value: 'Yes' },
                      { label: 'Unmarried / Single', value: 'No' }
                    ]}
                    error={errors.co_marital_status}
                  />

                  {showCoParents && (
                    <>
                      <TextField
                        name="co_father_name"
                        label="Co-Applicant Father's Name"
                        value={formData.co_father_name}
                        onChange={(val) => updateField('co_father_name', capitalizeWords(val))}
                        required
                        placeholder="Enter father's name"
                        error={errors.co_father_name}
                      />

                      <TextField
                        name="co_mother_name"
                        label="Co-Applicant Mother's Name"
                        value={formData.co_mother_name}
                        onChange={(val) => updateField('co_mother_name', capitalizeWords(val))}
                        required
                        placeholder="Enter mother's name"
                        error={errors.co_mother_name}
                      />
                    </>
                  )}

                  {showCoHusband && (
                    <TextField
                      name="co_husband_name"
                      label="Co-Applicant Husband's Name"
                      value={formData.co_husband_name}
                      onChange={(val) => updateField('co_husband_name', capitalizeWords(val))}
                      required
                      placeholder="Enter husband's name"
                      error={errors.co_husband_name}
                    />
                  )}

                  <RadioGroup
                    name="co_own_house"
                    label="Co-Applicant Property Status"
                    value={formData.co_own_house}
                    onChange={(val) => updateField('co_own_house', val)}
                    required
                    options={[
                      { label: 'Own House', value: 'Yes' },
                      { label: 'Rented House', value: 'No' }
                    ]}
                    error={errors.co_own_house}
                  />

                  {/* Co-Applicant Address */}
                  <div className="pt-3 border-t border-[#f1f3f4] space-y-3">
                    <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#1a73e8]" /> Co-Applicant Address
                    </h4>

                    <TextField
                      name="co_current_address"
                      label="House / Flat / Door No."
                      value={formData.co_current_address}
                      onChange={(val) => updateField('co_current_address', capitalizeText(val))}
                      required
                      placeholder="Door / Flat / Plot No."
                      error={errors.co_current_address}
                    />

                    <TextField
                      name="co_current_street"
                      label="Street / Locality"
                      value={formData.co_current_street}
                      onChange={(val) => updateField('co_current_street', capitalizeWords(val))}
                      required
                      placeholder="Street name"
                      error={errors.co_current_street}
                    />

                    <TextField
                      name="co_current_city"
                      label="City"
                      value={formData.co_current_city}
                      onChange={(val) => updateField('co_current_city', capitalizeWords(val))}
                      required
                      placeholder="City name"
                      error={errors.co_current_city}
                    />

                    <TextField
                      name="co_current_state"
                      label="State"
                      value={formData.co_current_state}
                      onChange={(val) => updateField('co_current_state', capitalizeWords(val))}
                      required
                      placeholder="State name"
                      error={errors.co_current_state}
                    />

                    <NumberField
                      name="co_current_postal_code"
                      label="Pincode"
                      value={formData.co_current_postal_code}
                      onChange={(val) => updateField('co_current_postal_code', val)}
                      required
                      placeholder="6-digit pincode"
                      error={errors.co_current_postal_code}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: GUARANTORS (1, 2, 3) */}
        {activeStep === 5 && (
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#f1f3f4]">
              <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">5. Guarantor Verification (3 Required)</h3>
                <p className="text-[10px] text-[#5f6368]">Fill verified profiles for all 3 guarantors</p>
              </div>
            </div>

            {/* Guarantor Sub Tabs Bar */}
            <div className="flex items-center justify-between gap-1.5 p-1 bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl">
              {[1, 2, 3].map((idx) => {
                const isActive = activeGuarantorTab === idx;
                const isGuarantorFilled = Boolean(
                  formData[`guarantor_${idx}_name`] && 
                  formData[`guarantor_${idx}_phone_number`]
                );

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveGuarantorTab(idx)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'bg-[#1a73e8] text-white shadow-xs'
                        : isGuarantorFilled
                        ? 'bg-white text-[#137333] border border-[#ceead6]'
                        : 'text-[#5f6368] hover:text-[#1f1f1f]'
                    }`}
                  >
                    <span>Guarantor {idx}</span>
                    {isGuarantorFilled && !isActive && <Check size={12} className="text-[#137333]" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>

            {/* Active Guarantor Form */}
            <div>
              {renderGuarantorForm(activeGuarantorTab)}
            </div>
          </div>
        )}

      </form>

      {/* 3. Action Controls Card in Document Flow */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-3.5 shadow-xs flex items-center justify-between gap-2">
        {/* Previous / Back Step */}
        {activeStep > 1 ? (
          <button
            type="button"
            onClick={() => {
              if (activeStep === 5 && activeGuarantorTab > 1) {
                setActiveGuarantorTab(activeGuarantorTab - 1);
              } else {
                setActiveStep(activeStep - 1);
              }
            }}
            className="inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] transition-all cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
          >
            <ArrowLeft size={13} className="text-[#5f6368]" />
            <span>Back</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/employee/loans/origination/applications')}
            className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-full text-xs font-semibold bg-white text-[#5f6368] hover:bg-[#f1f3f4] border border-[#dadce0] transition-all cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
          >
            Cancel
          </button>
        )}

        {/* Action Buttons Group (Draft + Continue / Submit) */}
        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          {/* Save Draft Available on ALL Steps */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isDrafting || isSubmitting}
            className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] shadow-2xs transition-all cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
          >
            {isDrafting ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} className="text-[#5f6368]" />}
            <span>Draft</span>
          </button>

          {/* Steps 1 to 4: Continue Button */}
          {activeStep < 5 && (
            <button
              type="button"
              onClick={() => setActiveStep(activeStep + 1)}
              className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Continue</span>
              <ArrowRight size={13} />
            </button>
          )}

          {/* Step 5: Next Guarantor Tab Button */}
          {activeStep === 5 && activeGuarantorTab < 3 && (
            <button
              type="button"
              onClick={() => setActiveGuarantorTab(activeGuarantorTab + 1)}
              className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Guarantor {activeGuarantorTab + 1}</span>
              <ArrowRight size={13} />
            </button>
          )}

          {/* Step 5: Final Submit */}
          {activeStep === 5 && activeGuarantorTab === 3 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isDrafting}
              className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>{isEditMode ? 'Update' : 'Submit Loan'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

export default OriginationMobileFormEngine;
