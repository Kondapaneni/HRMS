import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [activeGuarantorTab, setActiveGuarantorTab] = useState(1);

  // Conditional field visibility logic:
  // Male + Yes = Father and Mother Name only
  // Male + No = Father and Mother Name only
  // Female + No = Father and Mother Name only
  // Female + Yes = Father and Mother and Husband Name
  const showParents = !!(formData.gender && formData.marital_status);
  const showHusband = formData.gender === 'Female' && formData.marital_status === 'Yes';

  const showCoParents = !!(formData.co_gender && formData.co_marital_status);
  const showCoHusband = formData.co_gender === 'Female' && formData.co_marital_status === 'Yes';

  // Automatically clear hidden conditional fields when their visibility toggles off
  useEffect(() => {
    if (!showParents) {
      if (formData.father_name) updateField('father_name', '');
      if (formData.mother_name) updateField('mother_name', '');
    }
    if (!showHusband) {
      if (formData.husband_name) updateField('husband_name', '');
    }
    if (formData.employment !== 'Job') {
      if (formData.job_name) updateField('job_name', '');
      if (formData.job_address) updateField('job_address', '');
      if (formData.job_income_per_month) updateField('job_income_per_month', '');
    }
    if (formData.employment !== 'Business') {
      if (formData.business_name) updateField('business_name', '');
      if (formData.business_address) updateField('business_address', '');
      if (formData.business_income_per_month) updateField('business_income_per_month', '');
    }

    // Co-Applicant auto-clear logic
    if (formData.has_co_applicant !== 'Yes') {
      const coKeys = [
        'co_applicant_name', 'co_relation_with_applicant', 'co_phone_number', 'co_aadhaar_number',
        'co_age', 'co_gender', 'co_marital_status', 'co_father_name', 'co_mother_name', 'co_husband_name',
        'co_own_house', 'co_current_address', 'co_current_street', 'co_current_city', 'co_current_state',
        'co_current_postal_code', 'co_permanent_address', 'co_permanent_street', 'co_permanent_city',
        'co_permanent_state', 'co_permanent_postal_code', 'co_employment', 'co_job_name', 'co_job_address',
        'co_job_income_per_month', 'co_business_name', 'co_business_address', 'co_business_income_per_month'
      ];
      coKeys.forEach(k => {
        if (formData[k]) updateField(k, '');
      });
    } else {
      if (!showCoParents) {
        if (formData.co_father_name) updateField('co_father_name', '');
        if (formData.co_mother_name) updateField('co_mother_name', '');
      }
      if (!showCoHusband) {
        if (formData.co_husband_name) updateField('co_husband_name', '');
      }
      if (formData.co_employment !== 'Job') {
        if (formData.co_job_name) updateField('co_job_name', '');
        if (formData.co_job_address) updateField('co_job_address', '');
        if (formData.co_job_income_per_month) updateField('co_job_income_per_month', '');
      }
      if (formData.co_employment !== 'Business') {
        if (formData.co_business_name) updateField('co_business_name', '');
        if (formData.co_business_address) updateField('co_business_address', '');
        if (formData.co_business_income_per_month) updateField('co_business_income_per_month', '');
      }
    }

    // Guarantor 1, 2, 3 auto-clear logic
    [1, 2, 3].forEach((idx) => {
      const pfx = `guarantor_${idx}_`;
      const gGender = formData[`${pfx}gender`];
      const gMarital = formData[`${pfx}marital_status`];
      const gEmp = formData[`${pfx}employment`];

      const showGParents = !!(gGender && gMarital);
      const showGHusband = gGender === 'Female' && gMarital === 'Yes';

      if (!showGParents) {
        if (formData[`${pfx}father_name`]) updateField(`${pfx}father_name`, '');
        if (formData[`${pfx}mother_name`]) updateField(`${pfx}mother_name`, '');
      }
      if (!showGHusband) {
        if (formData[`${pfx}husband_name`]) updateField(`${pfx}husband_name`, '');
      }
      if (gEmp !== 'Job') {
        if (formData[`${pfx}job_name`]) updateField(`${pfx}job_name`, '');
        if (formData[`${pfx}job_address`]) updateField(`${pfx}job_address`, '');
        if (formData[`${pfx}job_income_per_month`]) updateField(`${pfx}job_income_per_month`, '');
      }
      if (gEmp !== 'Business') {
        if (formData[`${pfx}business_name`]) updateField(`${pfx}business_name`, '');
        if (formData[`${pfx}business_address`]) updateField(`${pfx}business_address`, '');
        if (formData[`${pfx}business_income_per_month`]) updateField(`${pfx}business_income_per_month`, '');
      }
    });
  }, [
    formData.gender, formData.marital_status, formData.employment, showParents, showHusband,
    formData.has_co_applicant, formData.co_gender, formData.co_marital_status, formData.co_employment,
    showCoParents, showCoHusband,
    formData.guarantor_1_gender, formData.guarantor_1_marital_status, formData.guarantor_1_employment,
    formData.guarantor_2_gender, formData.guarantor_2_marital_status, formData.guarantor_2_employment,
    formData.guarantor_3_gender, formData.guarantor_3_marital_status, formData.guarantor_3_employment
  ]);

  // Load saved application / draft JSON data directly from database
  const loadSavedDataFromDB = async (showToast = false) => {
    try {
      setIsLoadingData(true);
      const res = await getLoanApplications();
      const passingLeadId = location.state?.lead_id || location.state?.id || formData.lead_id;

      if (res && res.applications && res.applications.length > 0) {
        // Find existing application specifically matching the passing lead_id
        const existingApp = res.applications.find(app => 
          app.loan_type === 'Business Loan' && 
          passingLeadId && 
          String(app.lead_id) === String(passingLeadId) &&
          (app.status === 'Draft' || app.status === 'Submitted')
        );

        if (existingApp && existingApp.status === 'Submitted') {
          setIsAlreadySubmitted(true);
        }

        if (existingApp && existingApp.form_data) {
          const savedData = existingApp.form_data;
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
          if (savedData.has_co_applicant) updateField('has_co_applicant', savedData.has_co_applicant);
          if (savedData.co_applicant_name) updateField('co_applicant_name', capitalizeWords(savedData.co_applicant_name));
          if (savedData.co_relation_with_applicant) updateField('co_relation_with_applicant', capitalizeWords(savedData.co_relation_with_applicant));
          if (savedData.co_phone_number) updateField('co_phone_number', String(savedData.co_phone_number).replace(/\D/g, '').slice(0, 10));
          if (savedData.co_aadhaar_number) updateField('co_aadhaar_number', String(savedData.co_aadhaar_number).replace(/\D/g, '').slice(0, 12));
          if (savedData.co_age) updateField('co_age', savedData.co_age);
          if (savedData.co_gender) updateField('co_gender', savedData.co_gender);
          if (savedData.co_marital_status) updateField('co_marital_status', savedData.co_marital_status);
          if (savedData.co_father_name) updateField('co_father_name', capitalizeWords(savedData.co_father_name));
          if (savedData.co_mother_name) updateField('co_mother_name', capitalizeWords(savedData.co_mother_name));
          if (savedData.co_husband_name) updateField('co_husband_name', capitalizeWords(savedData.co_husband_name));
          if (savedData.co_own_house) updateField('co_own_house', savedData.co_own_house);
          if (savedData.co_current_address) updateField('co_current_address', capitalizeText(savedData.co_current_address));
          if (savedData.co_current_street) updateField('co_current_street', capitalizeWords(savedData.co_current_street));
          if (savedData.co_current_city) updateField('co_current_city', capitalizeWords(savedData.co_current_city));
          if (savedData.co_current_state) updateField('co_current_state', capitalizeWords(savedData.co_current_state));
          if (savedData.co_current_postal_code) updateField('co_current_postal_code', String(savedData.co_current_postal_code).replace(/\D/g, '').slice(0, 6));
          if (savedData.co_permanent_address) updateField('co_permanent_address', capitalizeText(savedData.co_permanent_address));
          if (savedData.co_permanent_street) updateField('co_permanent_street', capitalizeWords(savedData.co_permanent_street));
          if (savedData.co_permanent_city) updateField('co_permanent_city', capitalizeWords(savedData.co_permanent_city));
          if (savedData.co_permanent_state) updateField('co_permanent_state', capitalizeWords(savedData.co_permanent_state));
          if (savedData.co_permanent_postal_code) updateField('co_permanent_postal_code', String(savedData.co_permanent_postal_code).replace(/\D/g, '').slice(0, 6));
          if (savedData.co_employment) updateField('co_employment', savedData.co_employment);
          if (savedData.co_job_name) updateField('co_job_name', capitalizeWords(savedData.co_job_name));
          if (savedData.co_job_address) updateField('co_job_address', capitalizeText(savedData.co_job_address));
          if (savedData.co_job_income_per_month) updateField('co_job_income_per_month', String(savedData.co_job_income_per_month).replace(/\D/g, ''));
          if (savedData.co_business_name) updateField('co_business_name', capitalizeWords(savedData.co_business_name));
          if (savedData.co_business_address) updateField('co_business_address', capitalizeText(savedData.co_business_address));
          if (savedData.co_business_income_per_month) updateField('co_business_income_per_month', String(savedData.co_business_income_per_month).replace(/\D/g, ''));

          // Restore Guarantors 1, 2, 3
          [1, 2, 3].forEach(idx => {
            const pfx = `guarantor_${idx}_`;
            const keys = [
              'name', 'phone_number', 'aadhaar_number', 'age', 'gender', 'marital_status',
              'father_name', 'mother_name', 'husband_name', 'own_house', 'current_address',
              'current_street', 'current_city', 'current_state', 'current_postal_code',
              'permanent_address', 'permanent_street', 'permanent_city', 'permanent_state',
              'permanent_postal_code', 'employment', 'job_name', 'job_address',
              'job_income_per_month', 'business_name', 'business_address', 'business_income_per_month'
            ];
            keys.forEach(k => {
              const fullKey = `${pfx}${k}`;
              if (savedData[fullKey]) {
                if (k.includes('name') || k.includes('street') || k.includes('city') || k.includes('state')) {
                  updateField(fullKey, capitalizeWords(savedData[fullKey]));
                } else if (k.includes('address')) {
                  updateField(fullKey, capitalizeText(savedData[fullKey]));
                } else {
                  updateField(fullKey, savedData[fullKey]);
                }
              }
            });
          });

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

  const getCleanFormData = () => {
    const cleaned = {};
    Object.keys(formData).forEach(key => {
      const val = formData[key];
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        cleaned[key] = val;
      }
    });
    return cleaned;
  };

  const handleSaveDraft = async () => {
    try {
      setIsDrafting(true);
      const cleanData = getCleanFormData();
      // Save draft directly to DB table public.loan_applications in JSON format
      await submitLoanApplication('Business Loan', cleanData, 'Draft');
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
      const cleanData = getCleanFormData();
      // Submit full form data to public.loan_applications in JSON format as Submitted
      await submitLoanApplication('Business Loan', cleanData, 'Submitted');
      toast.success('Business Loan Application Submitted Successfully!');
      setTimeout(() => {
        navigate('/employee/loans/origination/members');
      }, 1000);
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
        guarantor_3_name: '', guarantor_3_phone_number: '', guarantor_3_aadhaar_number: '', guarantor_3_age: '', guarantor_3_gender: '', guarantor_3_marital_status: '', guarantor_3_father_name: '', guarantor_3_mother_name: '', guarantor_3_husband_name: '', guarantor_3_own_house: '', guarantor_3_current_address: '', guarantor_3_current_street: '', guarantor_3_current_city: '', guarantor_3_current_state: '', guarantor_3_current_postal_code: '', guarantor_3_permanent_address: '', guarantor_3_permanent_street: '', guarantor_3_permanent_city: '', guarantor_3_permanent_state: '', guarantor_3_permanent_postal_code: '', guarantor_3_employment: '', guarantor_3_job_name: '', guarantor_3_job_address: '', guarantor_3_job_income_per_month: '', guarantor_3_business_name: '', guarantor_3_business_address: '', guarantor_3_business_income_per_month: '',
        lead_id: formData.lead_id
      });
    } catch (err) {
      console.error('Error submitting loan application:', err);
      toast.error(err.response?.data?.error || 'Failed to submit loan application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderGuarantorForm = (idx) => {
    const pfx = `guarantor_${idx}_`;
    const labelPfx = `Guarantor ${idx}`;

    const gGender = formData[`${pfx}gender`];
    const gMarital = formData[`${pfx}marital_status`];
    const gEmp = formData[`${pfx}employment`];

    const showGParents = !!(gGender && gMarital);
    const showGHusband = gGender === 'Female' && gMarital === 'Yes';

    return (
      <div key={idx} className="space-y-6">
        {/* Personal Details */}
        <div>
          <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            {labelPfx} Personal Details
          </h4>
          <FormGrid columns={3} gap={6}>
            <TextField
              name={`${pfx}name`}
              label={`${labelPfx} Name`}
              value={formData[`${pfx}name`]}
              onChange={(val) => updateField(`${pfx}name`, capitalizeWords(val))}
              required
              placeholder={`Enter ${labelPfx.toLowerCase()} full name`}
              error={errors[`${pfx}name`]}
            />

            <PhoneField
              name={`${pfx}phone_number`}
              label="Phone Number"
              value={formData[`${pfx}phone_number`]}
              onChange={(val) => updateField(`${pfx}phone_number`, val)}
              required
              placeholder="Enter 10-digit mobile number"
              error={errors[`${pfx}phone_number`]}
            />

            <AadhaarField
              name={`${pfx}aadhaar_number`}
              label="Aadhaar Number"
              value={formData[`${pfx}aadhaar_number`]}
              onChange={(val) => updateField(`${pfx}aadhaar_number`, val)}
              required
              placeholder="1234 5678 9012"
              error={errors[`${pfx}aadhaar_number`]}
            />

            <NumberField
              name={`${pfx}age`}
              label="Age"
              value={formData[`${pfx}age`]}
              onChange={(val) => updateField(`${pfx}age`, val)}
              required
              min={18}
              max={60}
              maxLength={2}
              placeholder="e.g. 35"
              error={errors[`${pfx}age`]}
            />

            <SelectField
              name={`${pfx}gender`}
              label="Gender"
              value={formData[`${pfx}gender`]}
              onChange={(val) => updateField(`${pfx}gender`, val)}
              required
              placeholder="Select gender"
              options={[
                { label: 'Male', value: 'Male' },
                { label: 'Female', value: 'Female' },
                { label: 'Other', value: 'Other' }
              ]}
              error={errors[`${pfx}gender`]}
            />

            <RadioGroup
              name={`${pfx}marital_status`}
              label="Marital Status"
              value={formData[`${pfx}marital_status`]}
              onChange={(val) => updateField(`${pfx}marital_status`, val)}
              required
              direction="horizontal"
              options={[
                { label: 'Yes', value: 'Yes' },
                { label: 'No', value: 'No' }
              ]}
              error={errors[`${pfx}marital_status`]}
            />

            {showGParents && (
              <>
                <TextField
                  name={`${pfx}father_name`}
                  label="Father Name"
                  value={formData[`${pfx}father_name`]}
                  onChange={(val) => updateField(`${pfx}father_name`, capitalizeWords(val))}
                  required
                  placeholder="Enter father full name"
                  error={errors[`${pfx}father_name`]}
                />

                <TextField
                  name={`${pfx}mother_name`}
                  label="Mother Name"
                  value={formData[`${pfx}mother_name`]}
                  onChange={(val) => updateField(`${pfx}mother_name`, capitalizeWords(val))}
                  required
                  placeholder="Enter mother full name"
                  error={errors[`${pfx}mother_name`]}
                />
              </>
            )}

            {showGHusband && (
              <TextField
                name={`${pfx}husband_name`}
                label="Husband Name"
                value={formData[`${pfx}husband_name`]}
                onChange={(val) => updateField(`${pfx}husband_name`, capitalizeWords(val))}
                required
                placeholder="Enter husband full name"
                error={errors[`${pfx}husband_name`]}
              />
            )}

            <RadioGroup
              name={`${pfx}own_house`}
              label="Own House"
              value={formData[`${pfx}own_house`]}
              onChange={(val) => updateField(`${pfx}own_house`, val)}
              required
              direction="horizontal"
              options={[
                { label: 'Yes', value: 'Yes' },
                { label: 'No', value: 'No' }
              ]}
              error={errors[`${pfx}own_house`]}
            />
          </FormGrid>
        </div>

        {/* Current Address */}
        <div className="pt-6 border-t border-slate-200">
          <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            {labelPfx} Current Address
          </h4>
          <FormGrid columns={3} gap={6}>
            <div className="col-span-1 sm:col-span-2 md:col-span-3">
              <TextField
                name={`${pfx}current_address`}
                label="Current Address"
                value={formData[`${pfx}current_address`]}
                onChange={(val) => updateField(`${pfx}current_address`, capitalizeText(val))}
                required
                placeholder={`Enter ${labelPfx.toLowerCase()} current address`}
                error={errors[`${pfx}current_address`]}
              />
            </div>

            <TextField
              name={`${pfx}current_street`}
              label="Street"
              value={formData[`${pfx}current_street`]}
              onChange={(val) => updateField(`${pfx}current_street`, capitalizeWords(val))}
              required
              placeholder="Enter street (only text)"
              error={errors[`${pfx}current_street`]}
            />

            <TextField
              name={`${pfx}current_city`}
              label="City"
              value={formData[`${pfx}current_city`]}
              onChange={(val) => updateField(`${pfx}current_city`, capitalizeWords(val))}
              required
              placeholder="Enter city (only text)"
              error={errors[`${pfx}current_city`]}
            />

            <TextField
              name={`${pfx}current_state`}
              label="State"
              value={formData[`${pfx}current_state`]}
              onChange={(val) => updateField(`${pfx}current_state`, capitalizeWords(val))}
              required
              placeholder="Enter state (only text)"
              error={errors[`${pfx}current_state`]}
            />

            <TextField
              name={`${pfx}current_postal_code`}
              label="Postal Code"
              value={formData[`${pfx}current_postal_code`]}
              onChange={(val) => updateField(`${pfx}current_postal_code`, val.replace(/\D/g, '').slice(0, 6))}
              required
              placeholder="Enter 6-digit postal code"
              error={errors[`${pfx}current_postal_code`]}
            />
          </FormGrid>
        </div>

        {/* Permanent Address */}
        <div className="pt-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
              {labelPfx} Permanent Address
            </h4>
            <button
              type="button"
              onClick={() => {
                updateField(`${pfx}permanent_address`, capitalizeText(formData[`${pfx}current_address`] || ''));
                updateField(`${pfx}permanent_street`, capitalizeWords(formData[`${pfx}current_street`] || ''));
                updateField(`${pfx}permanent_city`, capitalizeWords(formData[`${pfx}current_city`] || ''));
                updateField(`${pfx}permanent_state`, capitalizeWords(formData[`${pfx}current_state`] || ''));
                updateField(`${pfx}permanent_postal_code`, formData[`${pfx}current_postal_code`] || '');
                toast.success(`Copied ${labelPfx} Current Address to Permanent Address`);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer text-left sm:text-right"
            >
              Same as {labelPfx} Current Address
            </button>
          </div>

          <FormGrid columns={3} gap={6}>
            <div className="col-span-1 sm:col-span-2 md:col-span-3">
              <TextField
                name={`${pfx}permanent_address`}
                label="Permanent Address"
                value={formData[`${pfx}permanent_address`]}
                onChange={(val) => updateField(`${pfx}permanent_address`, capitalizeText(val))}
                required
                placeholder={`Enter ${labelPfx.toLowerCase()} permanent address`}
                error={errors[`${pfx}permanent_address`]}
              />
            </div>

            <TextField
              name={`${pfx}permanent_street`}
              label="Street"
              value={formData[`${pfx}permanent_street`]}
              onChange={(val) => updateField(`${pfx}permanent_street`, capitalizeWords(val))}
              required
              placeholder="Enter street (only text)"
              error={errors[`${pfx}permanent_street`]}
            />

            <TextField
              name={`${pfx}permanent_city`}
              label="City"
              value={formData[`${pfx}permanent_city`]}
              onChange={(val) => updateField(`${pfx}permanent_city`, capitalizeWords(val))}
              required
              placeholder="Enter city (only text)"
              error={errors[`${pfx}permanent_city`]}
            />

            <TextField
              name={`${pfx}permanent_state`}
              label="State"
              value={formData[`${pfx}permanent_state`]}
              onChange={(val) => updateField(`${pfx}permanent_state`, capitalizeWords(val))}
              required
              placeholder="Enter state (only text)"
              error={errors[`${pfx}permanent_state`]}
            />

            <TextField
              name={`${pfx}permanent_postal_code`}
              label="Postal Code"
              value={formData[`${pfx}permanent_postal_code`]}
              onChange={(val) => updateField(`${pfx}permanent_postal_code`, val.replace(/\D/g, '').slice(0, 6))}
              required
              placeholder="Enter 6-digit postal code"
              error={errors[`${pfx}permanent_postal_code`]}
            />
          </FormGrid>
        </div>

        {/* Employment Details */}
        <div className="pt-6 border-t border-slate-200">
          <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            {labelPfx} Employment Details
          </h4>
          <div className="mb-4">
            <RadioGroup
              name={`${pfx}employment`}
              label="Employment"
              value={formData[`${pfx}employment`]}
              onChange={(val) => updateField(`${pfx}employment`, val)}
              required
              direction="horizontal"
              options={[
                { label: 'Job', value: 'Job' },
                { label: 'Business', value: 'Business' }
              ]}
              error={errors[`${pfx}employment`]}
            />
          </div>

          {gEmp === 'Job' && (
            <FormGrid columns={3} gap={6}>
              <TextField
                name={`${pfx}job_name`}
                label="Job Name"
                value={formData[`${pfx}job_name`]}
                onChange={(val) => updateField(`${pfx}job_name`, capitalizeWords(val))}
                required
                placeholder="Enter job / employer name (only text)"
                error={errors[`${pfx}job_name`]}
              />

              <TextField
                name={`${pfx}job_address`}
                label="Job Address"
                value={formData[`${pfx}job_address`]}
                onChange={(val) => updateField(`${pfx}job_address`, capitalizeText(val))}
                required
                placeholder="Enter workplace address"
                error={errors[`${pfx}job_address`]}
              />

              <NumberField
                name={`${pfx}job_income_per_month`}
                label="Job Income Per Month"
                value={formData[`${pfx}job_income_per_month`]}
                onChange={(val) => updateField(`${pfx}job_income_per_month`, val)}
                required
                placeholder="e.g. 45000"
                error={errors[`${pfx}job_income_per_month`]}
              />
            </FormGrid>
          )}

          {gEmp === 'Business' && (
            <FormGrid columns={3} gap={6}>
              <TextField
                name={`${pfx}business_name`}
                label="Business Name"
                value={formData[`${pfx}business_name`]}
                onChange={(val) => updateField(`${pfx}business_name`, capitalizeWords(val))}
                required
                placeholder="Enter business name (only text)"
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
                label="Business Income Per Month"
                value={formData[`${pfx}business_income_per_month`]}
                onChange={(val) => updateField(`${pfx}business_income_per_month`, val)}
                required
                placeholder="e.g. 75000"
                error={errors[`${pfx}business_income_per_month`]}
              />
            </FormGrid>
          )}
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isAlreadySubmitted && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center gap-2 mb-6 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>This loan application has already been submitted for this lead and is locked against further editing.</span>
        </div>
      )}
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
          <div className="col-span-1 sm:col-span-2 md:col-span-3">
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
          <div className="col-span-1 sm:col-span-2 md:col-span-3">
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

      {/* Co-Applicant Section */}
      <div className="pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            Co-Applicant Details
          </h3>
        </div>

        <div className="mb-6">
          <RadioGroup
            name="has_co_applicant"
            label="Do you want to add a Co-Applicant?"
            value={formData.has_co_applicant}
            onChange={(val) => updateField('has_co_applicant', val)}
            required
            direction="horizontal"
            options={[
              { label: 'Yes', value: 'Yes' },
              { label: 'No', value: 'No' }
            ]}
            error={errors.has_co_applicant}
          />
        </div>

        {formData.has_co_applicant === 'Yes' && (
          <div className="space-y-6 pt-4 border-t border-slate-200">
            {/* Co-Applicant Personal Details */}
            <div>
              <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                Co-Applicant Personal Details
              </h4>
              <FormGrid columns={3} gap={6}>
                <TextField
                  name="co_applicant_name"
                  label="Co-Applicant Name"
                  value={formData.co_applicant_name}
                  onChange={(val) => updateField('co_applicant_name', capitalizeWords(val))}
                  required
                  placeholder="Enter co-applicant full name"
                  error={errors.co_applicant_name}
                />

                <TextField
                  name="co_relation_with_applicant"
                  label="Relation with Applicant"
                  value={formData.co_relation_with_applicant}
                  onChange={(val) => updateField('co_relation_with_applicant', capitalizeWords(val))}
                  required
                  placeholder="e.g. Spouse, Father, Partner"
                  error={errors.co_relation_with_applicant}
                />

                <PhoneField
                  name="co_phone_number"
                  label="Phone Number"
                  value={formData.co_phone_number}
                  onChange={(val) => updateField('co_phone_number', val)}
                  required
                  placeholder="Enter 10-digit mobile number"
                  error={errors.co_phone_number}
                />

                <AadhaarField
                  name="co_aadhaar_number"
                  label="Aadhaar Number"
                  value={formData.co_aadhaar_number}
                  onChange={(val) => updateField('co_aadhaar_number', val)}
                  required
                  placeholder="1234 5678 9012"
                  error={errors.co_aadhaar_number}
                />

                <NumberField
                  name="co_age"
                  label="Age"
                  value={formData.co_age}
                  onChange={(val) => updateField('co_age', val)}
                  required
                  min={18}
                  max={60}
                  maxLength={2}
                  placeholder="e.g. 35"
                  error={errors.co_age}
                />

                <SelectField
                  name="co_gender"
                  label="Gender"
                  value={formData.co_gender}
                  onChange={(val) => updateField('co_gender', val)}
                  required
                  placeholder="Select gender"
                  options={[
                    { label: 'Male', value: 'Male' },
                    { label: 'Female', value: 'Female' },
                    { label: 'Other', value: 'Other' }
                  ]}
                  error={errors.co_gender}
                />

                <RadioGroup
                  name="co_marital_status"
                  label="Marital Status"
                  value={formData.co_marital_status}
                  onChange={(val) => updateField('co_marital_status', val)}
                  required
                  direction="horizontal"
                  options={[
                    { label: 'Yes', value: 'Yes' },
                    { label: 'No', value: 'No' }
                  ]}
                  error={errors.co_marital_status}
                />

                {showCoParents && (
                  <>
                    <TextField
                      name="co_father_name"
                      label="Father Name"
                      value={formData.co_father_name}
                      onChange={(val) => updateField('co_father_name', capitalizeWords(val))}
                      required
                      placeholder="Enter father full name"
                      error={errors.co_father_name}
                    />

                    <TextField
                      name="co_mother_name"
                      label="Mother Name"
                      value={formData.co_mother_name}
                      onChange={(val) => updateField('co_mother_name', capitalizeWords(val))}
                      required
                      placeholder="Enter mother full name"
                      error={errors.co_mother_name}
                    />
                  </>
                )}

                {showCoHusband && (
                  <TextField
                    name="co_husband_name"
                    label="Husband Name"
                    value={formData.co_husband_name}
                    onChange={(val) => updateField('co_husband_name', capitalizeWords(val))}
                    required
                    placeholder="Enter husband full name"
                    error={errors.co_husband_name}
                  />
                )}

                <RadioGroup
                  name="co_own_house"
                  label="Own House"
                  value={formData.co_own_house}
                  onChange={(val) => updateField('co_own_house', val)}
                  required
                  direction="horizontal"
                  options={[
                    { label: 'Yes', value: 'Yes' },
                    { label: 'No', value: 'No' }
                  ]}
                  error={errors.co_own_house}
                />
              </FormGrid>
            </div>

            {/* Co-Applicant Current Address */}
            <div className="pt-6 border-t border-slate-200">
              <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                Co-Applicant Current Address
              </h4>
              <FormGrid columns={3} gap={6}>
                <div className="col-span-1 sm:col-span-2 md:col-span-3">
                  <TextField
                    name="co_current_address"
                    label="Current Address"
                    value={formData.co_current_address}
                    onChange={(val) => updateField('co_current_address', capitalizeText(val))}
                    required
                    placeholder="Enter co-applicant current address"
                    error={errors.co_current_address}
                  />
                </div>

                <TextField
                  name="co_current_street"
                  label="Street"
                  value={formData.co_current_street}
                  onChange={(val) => updateField('co_current_street', capitalizeWords(val))}
                  required
                  placeholder="Enter street (only text)"
                  error={errors.co_current_street}
                />

                <TextField
                  name="co_current_city"
                  label="City"
                  value={formData.co_current_city}
                  onChange={(val) => updateField('co_current_city', capitalizeWords(val))}
                  required
                  placeholder="Enter city (only text)"
                  error={errors.co_current_city}
                />

                <TextField
                  name="co_current_state"
                  label="State"
                  value={formData.co_current_state}
                  onChange={(val) => updateField('co_current_state', capitalizeWords(val))}
                  required
                  placeholder="Enter state (only text)"
                  error={errors.co_current_state}
                />

                <TextField
                  name="co_current_postal_code"
                  label="Postal Code"
                  value={formData.co_current_postal_code}
                  onChange={(val) => updateField('co_current_postal_code', val.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="Enter 6-digit postal code"
                  error={errors.co_current_postal_code}
                />
              </FormGrid>
            </div>

            {/* Co-Applicant Permanent Address */}
            <div className="pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  Co-Applicant Permanent Address
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    updateField('co_permanent_address', capitalizeText(formData.co_current_address || ''));
                    updateField('co_permanent_street', capitalizeWords(formData.co_current_street || ''));
                    updateField('co_permanent_city', capitalizeWords(formData.co_current_city || ''));
                    updateField('co_permanent_state', capitalizeWords(formData.co_current_state || ''));
                    updateField('co_permanent_postal_code', formData.co_current_postal_code || '');
                    toast.success('Copied Co-Applicant Current Address to Permanent Address');
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Same as Co-Applicant Current Address
                </button>
              </div>

              <FormGrid columns={3} gap={6}>
                <div className="col-span-1 sm:col-span-2 md:col-span-3">
                  <TextField
                    name="co_permanent_address"
                    label="Permanent Address"
                    value={formData.co_permanent_address}
                    onChange={(val) => updateField('co_permanent_address', capitalizeText(val))}
                    required
                    placeholder="Enter co-applicant permanent address"
                    error={errors.co_permanent_address}
                  />
                </div>

                <TextField
                  name="co_permanent_street"
                  label="Street"
                  value={formData.co_permanent_street}
                  onChange={(val) => updateField('co_permanent_street', capitalizeWords(val))}
                  required
                  placeholder="Enter street (only text)"
                  error={errors.co_permanent_street}
                />

                <TextField
                  name="co_permanent_city"
                  label="City"
                  value={formData.co_permanent_city}
                  onChange={(val) => updateField('co_permanent_city', capitalizeWords(val))}
                  required
                  placeholder="Enter city (only text)"
                  error={errors.co_permanent_city}
                />

                <TextField
                  name="co_permanent_state"
                  label="State"
                  value={formData.co_permanent_state}
                  onChange={(val) => updateField('co_permanent_state', capitalizeWords(val))}
                  required
                  placeholder="Enter state (only text)"
                  error={errors.co_permanent_state}
                />

                <TextField
                  name="co_permanent_postal_code"
                  label="Postal Code"
                  value={formData.co_permanent_postal_code}
                  onChange={(val) => updateField('co_permanent_postal_code', val.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="Enter 6-digit postal code"
                  error={errors.co_permanent_postal_code}
                />
              </FormGrid>
            </div>

            {/* Co-Applicant Employment Details */}
            <div className="pt-6 border-t border-slate-200">
              <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                Co-Applicant Employment Details
              </h4>
              <div className="mb-4">
                <RadioGroup
                  name="co_employment"
                  label="Employment"
                  value={formData.co_employment}
                  onChange={(val) => updateField('co_employment', val)}
                  required
                  direction="horizontal"
                  options={[
                    { label: 'Job', value: 'Job' },
                    { label: 'Business', value: 'Business' }
                  ]}
                  error={errors.co_employment}
                />
              </div>

              {formData.co_employment === 'Job' && (
                <FormGrid columns={3} gap={6}>
                  <TextField
                    name="co_job_name"
                    label="Job Name"
                    value={formData.co_job_name}
                    onChange={(val) => updateField('co_job_name', capitalizeWords(val))}
                    required
                    placeholder="Enter job / employer name (only text)"
                    error={errors.co_job_name}
                  />

                  <TextField
                    name="co_job_address"
                    label="Job Address"
                    value={formData.co_job_address}
                    onChange={(val) => updateField('co_job_address', capitalizeText(val))}
                    required
                    placeholder="Enter workplace address"
                    error={errors.co_job_address}
                  />

                  <NumberField
                    name="co_job_income_per_month"
                    label="Job Income Per Month"
                    value={formData.co_job_income_per_month}
                    onChange={(val) => updateField('co_job_income_per_month', val)}
                    required
                    placeholder="e.g. 45000"
                    error={errors.co_job_income_per_month}
                  />
                </FormGrid>
              )}

              {formData.co_employment === 'Business' && (
                <FormGrid columns={3} gap={6}>
                  <TextField
                    name="co_business_name"
                    label="Business Name"
                    value={formData.co_business_name}
                    onChange={(val) => updateField('co_business_name', capitalizeWords(val))}
                    required
                    placeholder="Enter business name (only text)"
                    error={errors.co_business_name}
                  />

                  <TextField
                    name="co_business_address"
                    label="Business Address"
                    value={formData.co_business_address}
                    onChange={(val) => updateField('co_business_address', capitalizeText(val))}
                    required
                    placeholder="Enter business address"
                    error={errors.co_business_address}
                  />

                  <NumberField
                    name="co_business_income_per_month"
                    label="Business Income Per Month"
                    value={formData.co_business_income_per_month}
                    onChange={(val) => updateField('co_business_income_per_month', val)}
                    required
                    placeholder="e.g. 75000"
                    error={errors.co_business_income_per_month}
                  />
                </FormGrid>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Guarantor Section */}
      <div className="pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              Guarantor Details <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">3 Required</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Business loan requires details for exactly 3 guarantors.</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto justify-between">
            {[1, 2, 3].map((gIdx) => (
              <button
                key={gIdx}
                type="button"
                onClick={() => setActiveGuarantorTab(gIdx)}
                className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${
                  activeGuarantorTab === gIdx
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Guarantor {gIdx}
              </button>
            ))}
          </div>
        </div>

        {renderGuarantorForm(activeGuarantorTab)}
      </div>

      <div className="pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => loadSavedDataFromDB(true)}
          disabled={isLoadingData || isDrafting || isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl text-sm font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 h-11 sm:h-10 px-4 py-2 transition-colors cursor-pointer border border-slate-200 gap-2 disabled:opacity-50"
        >
          {isLoadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Load Saved Data
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isDrafting || isSubmitting || isLoadingData || isAlreadySubmitted}
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 h-11 sm:h-10 px-4 py-2 transition-colors cursor-pointer border border-slate-200 gap-2 disabled:opacity-50"
        >
          {isDrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isDrafting || isLoadingData || isAlreadySubmitted}
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-11 sm:h-10 px-4 py-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50 gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> {isAlreadySubmitted ? 'Application Submitted' : 'Submit Application'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
