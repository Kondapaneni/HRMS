import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
import { submitLoanApplication, getLoanApplications, deleteLoanApplication, updateLoanApplicationDetails } from '../../services/loanServices';
import { 
  Send, 
  Save, 
  Loader2, 
  Download, 
  CheckCircle2, 
  Lock, 
  ArrowLeft, 
  ArrowRight,
  Trash2,
  User,
  MapPin,
  Building2,
  Users,
  ShieldCheck,
  Check,
  Layers,
  Sparkles,
  AlertCircle,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

export function BusinessLoanForm({ isEditMode: propEditMode, application: propApplication, onSaved }) {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active step in the stepper navigation (1 to 5)
  const [activeStep, setActiveStep] = useState(1);
  const [viewAllSections, setViewAllSections] = useState(false);

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
    employment: 'Business',
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [loadedAppId, setLoadedAppId] = useState(null);
  const [activeGuarantorTab, setActiveGuarantorTab] = useState(1);

  // Conditional field visibility logic:
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

  // Helper to populate all form fields from a saved application form_data object
  const populateFromData = (savedData) => {
    if (!savedData) return;
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
    updateField('employment', savedData.employment || 'Business');
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
  };

  const isEditMode = propEditMode || location.state?.mode === 'edit' || location.state?.isEdit;
  const targetAppId = propApplication?.id || propApplication?.application_id || location.state?.application?.id || location.state?.application?.application_id || location.state?.id || loadedAppId;

  // Load saved application / draft JSON data directly from database if needed
  const loadSavedDataFromDB = async () => {
    try {
      setIsLoadingData(true);
      const res = await getLoanApplications();
      const passingId = propApplication?.id || location.state?.application?.id || location.state?.id || location.state?.lead_id || formData.lead_id;

      if (res && res.applications && res.applications.length > 0) {
        // Find existing application matching the target ID or lead_id
        const existingApp = res.applications.find(app => {
          if (passingId) {
            return String(app.id) === String(passingId) || 
                   String(app.application_id) === String(passingId) || 
                   String(app.lead_id) === String(passingId);
          }
          return app.loan_type === 'Business Loan' && (app.status === 'Draft' || app.status === 'Created');
        });

        if (existingApp) {
          if (existingApp.status === 'Created' && !isEditMode) {
            setIsAlreadySubmitted(true);
          }
          setLoadedAppId(existingApp.id || existingApp.application_id);
          if (existingApp.form_data) {
            populateFromData(existingApp.form_data);
          } else {
            populateFromData(existingApp);
          }
        }
      }
    } catch (err) {
      console.error('Error loading application data from DB:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Auto-populate when profile data or navigation state resolves or on mount
  useEffect(() => {
    const directData = propApplication?.form_data || location.state?.application?.form_data || location.state?.form_data || propApplication || location.state?.application;
    
    if (directData && (directData.applicant_name || directData.phone_number || directData.business_name || directData.current_address || directData.form_data)) {
      const dataToPopulate = directData.form_data || directData;
      populateFromData(dataToPopulate);
      const idToSet = propApplication?.id || location.state?.application?.id || location.state?.id || directData.id || directData.application_id;
      if (idToSet) {
        setLoadedAppId(idToSet);
      }
    } else {
      loadSavedDataFromDB();
    }
  }, [propApplication, location.state]);

  // Copy current address to permanent address
  const handleCopyCurrentToPermanent = () => {
    updateField('permanent_address', formData.current_address);
    updateField('permanent_street', formData.current_street);
    updateField('permanent_city', formData.current_city);
    updateField('permanent_state', formData.current_state);
    updateField('permanent_postal_code', formData.current_postal_code);
    toast.success('Copied current address to permanent address');
  };

  // Helper to extract sanitized form data
  const getCleanFormData = () => {
    const cleanData = { ...formData };
    if (!showParents) {
      delete cleanData.father_name;
      delete cleanData.mother_name;
    }
    if (!showHusband) {
      delete cleanData.husband_name;
    }
    if (cleanData.employment !== 'Job') {
      delete cleanData.job_name;
      delete cleanData.job_address;
      delete cleanData.job_income_per_month;
    }
    if (cleanData.employment !== 'Business') {
      delete cleanData.business_name;
      delete cleanData.business_address;
      delete cleanData.business_income_per_month;
    }

    if (cleanData.has_co_applicant !== 'Yes') {
      const coKeys = [
        'co_applicant_name', 'co_relation_with_applicant', 'co_phone_number', 'co_aadhaar_number',
        'co_age', 'co_gender', 'co_marital_status', 'co_father_name', 'co_mother_name', 'co_husband_name',
        'co_own_house', 'co_current_address', 'co_current_street', 'co_current_city', 'co_current_state',
        'co_current_postal_code', 'co_permanent_address', 'co_permanent_street', 'co_permanent_city',
        'co_permanent_state', 'co_permanent_postal_code', 'co_employment', 'co_job_name', 'co_job_address',
        'co_job_income_per_month', 'co_business_name', 'co_business_address', 'co_business_income_per_month'
      ];
      coKeys.forEach(k => delete cleanData[k]);
    } else {
      if (!showCoParents) {
        delete cleanData.co_father_name;
        delete cleanData.co_mother_name;
      }
      if (!showCoHusband) {
        delete cleanData.co_husband_name;
      }
      if (cleanData.co_employment !== 'Job') {
        delete cleanData.co_job_name;
        delete cleanData.co_job_address;
        delete cleanData.co_job_income_per_month;
      }
      if (cleanData.co_employment !== 'Business') {
        delete cleanData.co_business_name;
        delete cleanData.co_business_address;
        delete cleanData.co_business_income_per_month;
      }
    }

    [1, 2, 3].forEach(idx => {
      const pfx = `guarantor_${idx}_`;
      const gGender = cleanData[`${pfx}gender`];
      const gMarital = cleanData[`${pfx}marital_status`];
      const gEmp = cleanData[`${pfx}employment`];

      const showGParents = !!(gGender && gMarital);
      const showGHusband = gGender === 'Female' && gMarital === 'Yes';

      if (!showGParents) {
        delete cleanData[`${pfx}father_name`];
        delete cleanData[`${pfx}mother_name`];
      }
      if (!showGHusband) {
        delete cleanData[`${pfx}husband_name`];
      }
      if (gEmp !== 'Job') {
        delete cleanData[`${pfx}job_name`];
        delete cleanData[`${pfx}job_address`];
        delete cleanData[`${pfx}job_income_per_month`];
      }
      if (gEmp !== 'Business') {
        delete cleanData[`${pfx}business_name`];
        delete cleanData[`${pfx}business_address`];
        delete cleanData[`${pfx}business_income_per_month`];
      }
    });

    return cleanData;
  };

  // Check section completion
  const stepStatus = useMemo(() => {
    const isStep1Done = Boolean(formData.applicant_name && formData.phone_number && formData.age && formData.gender && formData.marital_status && formData.own_house);
    const isStep2Done = Boolean(formData.current_address && formData.current_city && formData.current_state && formData.current_postal_code && formData.permanent_address && formData.permanent_city && formData.permanent_state && formData.permanent_postal_code);
    const isStep3Done = Boolean(formData.employment && ((formData.employment === 'Business' && formData.business_name && formData.business_address && formData.business_income_per_month) || (formData.employment === 'Job' && formData.job_name && formData.job_address && formData.job_income_per_month)));
    const isStep4Done = formData.has_co_applicant === 'No' ? true : Boolean(formData.co_applicant_name && formData.co_phone_number && formData.co_relation_with_applicant);
    const isStep5Done = Boolean(formData.guarantor_1_name && formData.guarantor_1_phone_number && formData.guarantor_2_name && formData.guarantor_2_phone_number && formData.guarantor_3_name && formData.guarantor_3_phone_number);

    return { isStep1Done, isStep2Done, isStep3Done, isStep4Done, isStep5Done };
  }, [formData]);

  // Stepper Tabs Definition
  const steps = [
    { id: 1, title: 'Applicant Details', icon: User, isDone: stepStatus.isStep1Done },
    { id: 2, title: 'Residential Addresses', icon: MapPin, isDone: stepStatus.isStep2Done },
    { id: 3, title: 'Business & Income', icon: Building2, isDone: stepStatus.isStep3Done },
    { id: 4, title: 'Co-Applicant', icon: Users, isDone: stepStatus.isStep4Done },
    { id: 5, title: 'Guarantors (1 - 3)', icon: ShieldCheck, isDone: stepStatus.isStep5Done },
  ];

  // Save as Draft
  const handleSaveDraft = async () => {
    try {
      setIsDrafting(true);
      const cleanData = getCleanFormData();
      const existingId = targetAppId || loadedAppId;
      if (existingId) {
        await updateLoanApplicationDetails(existingId, cleanData, 'Business Loan', 'Draft');
        toast.success('Business Loan Application draft updated!');
      } else {
        const res = await submitLoanApplication('Business Loan', cleanData, 'Draft');
        if (res?.application?.id) {
          setLoadedAppId(res.application.id);
        }
        toast.success('Business Loan Application saved as draft!');
      }
      queryClient.invalidateQueries(['origination', 'applications', 'list']);
    } catch (err) {
      console.error('Error saving draft:', err);
      toast.error(err.response?.data?.error || 'Failed to save draft.');
    } finally {
      setIsDrafting(false);
    }
  };

  // Final Form Submission
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (isReadOnly && !isEditMode) {
      toast.error('This application is in read-only mode.');
      return;
    }

    const { isValid, errors: validationErrors } = validateBusinessLoanForm(formData);

    if (!isValid) {
      setFormErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      toast.error(firstError || 'Please complete all required fields correctly.');
      
      // Auto-navigate to first error step
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
      const cleanData = getCleanFormData();
      const existingId = targetAppId || loadedAppId;

      if (existingId) {
        await updateLoanApplicationDetails(existingId, cleanData, 'Business Loan', 'Created');
        toast.success('Business Loan Application Submitted Successfully!');
        if (onSaved) onSaved();
      } else {
        await submitLoanApplication('Business Loan', cleanData, 'Created');
        toast.success('Business Loan Application Created Successfully!');
      }

      queryClient.invalidateQueries(['origination', 'applications', 'list']);
      setTimeout(() => {
        navigate('/employee/loans/origination/applications');
      }, 1000);
    } catch (err) {
      console.error('Error submitting loan application:', err);
      toast.error(err.response?.data?.error || 'Failed to submit loan application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnly = Boolean(location.state?.readOnly || location.state?.isReadOnly || isAlreadySubmitted);

  // Hide "Save Draft" when the application is already submitted (status = Created)
  const appStatus = propApplication?.status || location.state?.application?.status || '';
  const isCreatedApp = appStatus.toLowerCase() === 'created' || appStatus.toLowerCase() === 'under_review' || appStatus.toLowerCase() === 'approved';

  // Render individual Guarantor Sub-form
  const renderGuarantorForm = (idx) => {
    const pfx = `guarantor_${idx}_`;
    const labelPfx = `Guarantor ${idx}`;

    const gGender = formData[`${pfx}gender`];
    const gMarital = formData[`${pfx}marital_status`];
    const gEmp = formData[`${pfx}employment`];

    const showGParents = !!(gGender && gMarital);
    const showGHusband = gGender === 'Female' && gMarital === 'Yes';

    return (
      <div key={idx} className="space-y-6 pt-1">
        {/* Personal Details */}
        <div>
          <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#1a73e8]" /> {labelPfx} Personal Information
          </h4>
          <FormGrid columns={3} gap={5}>
            <TextField
              name={`${pfx}name`}
              label={`${labelPfx} Full Name`}
              value={formData[`${pfx}name`]}
              onChange={(val) => updateField(`${pfx}name`, capitalizeWords(val))}
              required
              placeholder={`Enter full name`}
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
        <div className="pt-5 border-t border-[#e0e3e7]">
          <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#1a73e8]" /> Current Address
          </h4>
          <FormGrid columns={3} gap={5}>
            <div className="col-span-1 sm:col-span-2 md:col-span-3">
              <TextField
                name={`${pfx}current_address`}
                label="Current Address"
                value={formData[`${pfx}current_address`]}
                onChange={(val) => updateField(`${pfx}current_address`, capitalizeText(val))}
                required
                placeholder="Enter complete current residential address"
                error={errors[`${pfx}current_address`]}
              />
            </div>

            <TextField
              name={`${pfx}current_street`}
              label="Street"
              value={formData[`${pfx}current_street`]}
              onChange={(val) => updateField(`${pfx}current_street`, capitalizeWords(val))}
              required
              placeholder="Enter street name"
              error={errors[`${pfx}current_street`]}
            />

            <TextField
              name={`${pfx}current_city`}
              label="City"
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
        <div className="pt-5 border-t border-[#e0e3e7]">
          <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#137333]" /> Permanent Address
          </h4>
          <FormGrid columns={3} gap={5}>
            <div className="col-span-1 sm:col-span-2 md:col-span-3">
              <TextField
                name={`${pfx}permanent_address`}
                label="Permanent Address"
                value={formData[`${pfx}permanent_address`]}
                onChange={(val) => updateField(`${pfx}permanent_address`, capitalizeText(val))}
                required
                placeholder="Enter permanent address"
                error={errors[`${pfx}permanent_address`]}
              />
            </div>

            <TextField
              name={`${pfx}permanent_street`}
              label="Street"
              value={formData[`${pfx}permanent_street`]}
              onChange={(val) => updateField(`${pfx}permanent_street`, capitalizeWords(val))}
              required
              placeholder="Enter street name"
              error={errors[`${pfx}permanent_street`]}
            />

            <TextField
              name={`${pfx}permanent_city`}
              label="City"
              value={formData[`${pfx}permanent_city`]}
              onChange={(val) => updateField(`${pfx}permanent_city`, capitalizeWords(val))}
              required
              placeholder="Enter city"
              error={errors[`${pfx}permanent_city`]}
            />

            <TextField
              name={`${pfx}permanent_state`}
              label="State"
              value={formData[`${pfx}permanent_state`]}
              onChange={(val) => updateField(`${pfx}permanent_state`, capitalizeWords(val))}
              required
              placeholder="Enter state"
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

        {/* Employment & Income */}
        <div className="pt-5 border-t border-[#e0e3e7]">
          <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#8430ce]" /> Employment & Income
          </h4>
          <div className="mb-4">
            <RadioGroup
              name={`${pfx}employment`}
              label="Employment Type"
              value={formData[`${pfx}employment`]}
              onChange={(val) => updateField(`${pfx}employment`, val)}
              required
              direction="horizontal"
              options={[
                { label: 'Business', value: 'Business' },
                { label: 'Job / Salaried', value: 'Job' }
              ]}
              error={errors[`${pfx}employment`]}
            />
          </div>

          {gEmp === 'Job' && (
            <FormGrid columns={3} gap={5}>
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
            </FormGrid>
          )}

          {gEmp === 'Business' && (
            <FormGrid columns={3} gap={5}>
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
            </FormGrid>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stepper Navigation Header */}
      <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1a73e8]" />
            <span className="text-xs font-semibold text-[#1f1f1f]">
              Section {activeStep} of 5: <span className="text-[#1a73e8]">{steps[activeStep - 1]?.title}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewAllSections(!viewAllSections)}
              className="px-3 py-1 text-xs font-semibold text-[#5f6368] hover:text-[#1f1f1f] bg-[#f8fafd] hover:bg-[#f1f3f4] border border-[#dadce0] rounded-full transition-all cursor-pointer"
            >
              {viewAllSections ? 'Step by Step Mode' : 'View All Sections'}
            </button>
          </div>
        </div>

        {/* Stepper Tabs Bar */}
        <div className="flex overflow-x-auto gap-2 pb-1 hide-scrollbar sm:grid sm:grid-cols-3 lg:grid-cols-5">
          {steps.map((step) => {
            const isActive = activeStep === step.id && !viewAllSections;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  setActiveStep(step.id);
                  setViewAllSections(false);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer shrink-0 sm:shrink min-w-[130px] sm:min-w-0 ${
                  isActive
                    ? 'bg-[#e8f0fe] border-[#1a73e8] text-[#1a73e8] shadow-2xs font-semibold'
                    : 'bg-[#f8fafd] border-[#dadce0] text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4]'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isActive
                    ? 'bg-[#1a73e8] text-white'
                    : 'bg-white border border-[#dadce0] text-[#5f6368]'
                }`}>
                  {step.id}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold truncate leading-tight">
                    {step.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: APPLICANT PERSONAL DETAILS */}
        {(viewAllSections || activeStep === 1) && (
          <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs p-6 space-y-5">
            <div className="border-b border-[#e0e3e7] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1f1f1f]">1. Applicant Personal Information</h3>
                  <p className="text-[11px] text-[#5f6368]">Primary borrower KYC identity and demographic profile</p>
                </div>
              </div>
              <span className="text-[10.5px] font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full border border-[#d2e3fc]">
                Required Section
              </span>
            </div>

            <FormGrid columns={3} gap={5}>
              <TextField
                name="applicant_name"
                label="Applicant Full Name"
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
        )}

        {/* SECTION 2: RESIDENTIAL ADDRESSES */}
        {(viewAllSections || activeStep === 2) && (
          <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs p-6 space-y-6">
            <div className="border-b border-[#e0e3e7] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1f1f1f]">2. Residential Addresses</h3>
                  <p className="text-[11px] text-[#5f6368]">Current staying and permanent address verification</p>
                </div>
              </div>
            </div>

            {/* Current Address */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#1a73e8]" /> Current Residential Address
              </h4>
              <FormGrid columns={3} gap={5}>
                <div className="col-span-1 sm:col-span-2 md:col-span-3">
                  <TextField
                    name="current_address"
                    label="Current Address"
                    value={formData.current_address}
                    onChange={(val) => updateField('current_address', capitalizeText(val))}
                    required
                    placeholder="Enter complete current residential address"
                    error={errors.current_address}
                  />
                </div>

                <TextField
                  name="current_street"
                  label="Street"
                  value={formData.current_street}
                  onChange={(val) => updateField('current_street', capitalizeWords(val))}
                  required
                  placeholder="Enter street name"
                  error={errors.current_street}
                />

                <TextField
                  name="current_city"
                  label="City"
                  value={formData.current_city}
                  onChange={(val) => updateField('current_city', capitalizeWords(val))}
                  required
                  placeholder="Enter city"
                  error={errors.current_city}
                />

                <TextField
                  name="current_state"
                  label="State"
                  value={formData.current_state}
                  onChange={(val) => updateField('current_state', capitalizeWords(val))}
                  required
                  placeholder="Enter state"
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

            {/* Permanent Address */}
            <div className="space-y-4 pt-5 border-t border-[#e0e3e7]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#137333]" /> Permanent Address
                </h4>

                <button
                  type="button"
                  onClick={handleCopyCurrentToPermanent}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1a73e8] hover:text-[#1557b0] bg-[#e8f0fe] hover:bg-[#d2e3fc] px-3 py-1 rounded-full transition-colors cursor-pointer"
                >
                  <Copy size={12} />
                  <span>Same as Current Address</span>
                </button>
              </div>

              <FormGrid columns={3} gap={5}>
                <div className="col-span-1 sm:col-span-2 md:col-span-3">
                  <TextField
                    name="permanent_address"
                    label="Permanent Address"
                    value={formData.permanent_address}
                    onChange={(val) => updateField('permanent_address', capitalizeText(val))}
                    required
                    placeholder="Enter complete permanent residential address"
                    error={errors.permanent_address}
                  />
                </div>

                <TextField
                  name="permanent_street"
                  label="Street"
                  value={formData.permanent_street}
                  onChange={(val) => updateField('permanent_street', capitalizeWords(val))}
                  required
                  placeholder="Enter street name"
                  error={errors.permanent_street}
                />

                <TextField
                  name="permanent_city"
                  label="City"
                  value={formData.permanent_city}
                  onChange={(val) => updateField('permanent_city', capitalizeWords(val))}
                  required
                  placeholder="Enter city"
                  error={errors.permanent_city}
                />

                <TextField
                  name="permanent_state"
                  label="State"
                  value={formData.permanent_state}
                  onChange={(val) => updateField('permanent_state', capitalizeWords(val))}
                  required
                  placeholder="Enter state"
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

          </div>
        )}

        {/* SECTION 3: EMPLOYMENT & BUSINESS INCOME */}
        {(viewAllSections || activeStep === 3) && (
          <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs p-6 space-y-5">
            <div className="border-b border-[#e0e3e7] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1f1f1f]">3. Business Enterprise & Income Profile</h3>
                  <p className="text-[11px] text-[#5f6368]">Enterprise operations, physical establishment, and monthly financials</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <RadioGroup
                name="employment"
                label="Employment"
                value={formData.employment || 'Business'}
                onChange={(val) => {
                  if (val !== 'Job') {
                    updateField('employment', val);
                  }
                }}
                required
                direction="horizontal"
                options={[
                  { label: 'Job', value: 'Job', disabled: true },
                  { label: 'Business', value: 'Business' }
                ]}
                error={errors.employment}
              />
            </div>

            {formData.employment === 'Job' && (
              <FormGrid columns={3} gap={5}>
                <TextField
                  name="job_name"
                  label="Company / Employer Name"
                  value={formData.job_name}
                  onChange={(val) => updateField('job_name', capitalizeWords(val))}
                  required
                  placeholder="Enter company name"
                  error={errors.job_name}
                />

                <TextField
                  name="job_address"
                  label="Workplace Address"
                  value={formData.job_address}
                  onChange={(val) => updateField('job_address', capitalizeText(val))}
                  required
                  placeholder="Enter workplace address"
                  error={errors.job_address}
                />

                <NumberField
                  name="job_income_per_month"
                  label="Monthly Net Income (₹)"
                  value={formData.job_income_per_month}
                  onChange={(val) => updateField('job_income_per_month', val)}
                  required
                  placeholder="e.g. 45000"
                  error={errors.job_income_per_month}
                />
              </FormGrid>
            )}

            {formData.employment === 'Business' && (
              <FormGrid columns={3} gap={5}>
                <TextField
                  name="business_name"
                  label="Business Enterprise Name"
                  value={formData.business_name}
                  onChange={(val) => updateField('business_name', capitalizeWords(val))}
                  required
                  placeholder="Enter registered business name"
                  error={errors.business_name}
                />

                <TextField
                  name="business_address"
                  label="Business Establishment Address"
                  value={formData.business_address}
                  onChange={(val) => updateField('business_address', capitalizeText(val))}
                  required
                  placeholder="Enter business location address"
                  error={errors.business_address}
                />

                <NumberField
                  name="business_income_per_month"
                  label="Monthly Business Income (₹)"
                  value={formData.business_income_per_month}
                  onChange={(val) => updateField('business_income_per_month', val)}
                  required
                  placeholder="e.g. 75000"
                  error={errors.business_income_per_month}
                />
              </FormGrid>
            )}

          </div>
        )}

        {/* SECTION 4: CO-APPLICANT PROFILE */}
        {(viewAllSections || activeStep === 4) && (
          <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs p-6 space-y-5">
            <div className="border-b border-[#e0e3e7] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1f1f1f]">4. Co-Applicant Information</h3>
                  <p className="text-[11px] text-[#5f6368]">Add joint borrower or co-applicant to strengthen eligibility</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <RadioGroup
                  name="has_co_applicant"
                  label=""
                  value={formData.has_co_applicant}
                  onChange={(val) => updateField('has_co_applicant', val)}
                  direction="horizontal"
                  options={[
                    { label: 'No Co-Applicant', value: 'No' },
                    { label: 'Yes, Add Co-Applicant', value: 'Yes' }
                  ]}
                  error={errors.has_co_applicant}
                />
              </div>
            </div>

            {formData.has_co_applicant === 'Yes' ? (
              <div className="space-y-6 pt-2">
                <div>
                  <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#1a73e8]" /> Co-Applicant Personal Details
                  </h4>
                  <FormGrid columns={3} gap={5}>
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
                      placeholder="e.g. 32"
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

                {/* Co-applicant Addresses */}
                <div className="pt-5 border-t border-[#e0e3e7]">
                  <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#1a73e8]" /> Co-Applicant Residential Address
                  </h4>
                  <FormGrid columns={3} gap={5}>
                    <div className="col-span-1 sm:col-span-2 md:col-span-3">
                      <TextField
                        name="co_current_address"
                        label="Current Address"
                        value={formData.co_current_address}
                        onChange={(val) => updateField('co_current_address', capitalizeText(val))}
                        required
                        placeholder="Enter complete current residential address"
                        error={errors.co_current_address}
                      />
                    </div>

                    <TextField
                      name="co_current_street"
                      label="Street"
                      value={formData.co_current_street}
                      onChange={(val) => updateField('co_current_street', capitalizeWords(val))}
                      required
                      placeholder="Enter street name"
                      error={errors.co_current_street}
                    />

                    <TextField
                      name="co_current_city"
                      label="City"
                      value={formData.co_current_city}
                      onChange={(val) => updateField('co_current_city', capitalizeWords(val))}
                      required
                      placeholder="Enter city"
                      error={errors.co_current_city}
                    />

                    <TextField
                      name="co_current_state"
                      label="State"
                      value={formData.co_current_state}
                      onChange={(val) => updateField('co_current_state', capitalizeWords(val))}
                      required
                      placeholder="Enter state"
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

                {/* Co-applicant Employment */}
                <div className="pt-5 border-t border-[#e0e3e7]">
                  <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#8430ce]" /> Co-Applicant Income
                  </h4>
                  <div className="mb-3">
                    <RadioGroup
                      name="co_employment"
                      label="Employment Type"
                      value={formData.co_employment}
                      onChange={(val) => updateField('co_employment', val)}
                      required
                      direction="horizontal"
                      options={[
                        { label: 'Business', value: 'Business' },
                        { label: 'Job / Salaried', value: 'Job' }
                      ]}
                      error={errors.co_employment}
                    />
                  </div>

                  {formData.co_employment === 'Job' && (
                    <FormGrid columns={3} gap={5}>
                      <TextField
                        name="co_job_name"
                        label="Employer Name"
                        value={formData.co_job_name}
                        onChange={(val) => updateField('co_job_name', capitalizeWords(val))}
                        required
                        placeholder="Enter workplace name"
                        error={errors.co_job_name}
                      />

                      <TextField
                        name="co_job_address"
                        label="Workplace Address"
                        value={formData.co_job_address}
                        onChange={(val) => updateField('co_job_address', capitalizeText(val))}
                        required
                        placeholder="Enter workplace address"
                        error={errors.co_job_address}
                      />

                      <NumberField
                        name="co_job_income_per_month"
                        label="Monthly Net Income (₹)"
                        value={formData.co_job_income_per_month}
                        onChange={(val) => updateField('co_job_income_per_month', val)}
                        required
                        placeholder="e.g. 40000"
                        error={errors.co_job_income_per_month}
                      />
                    </FormGrid>
                  )}

                  {formData.co_employment === 'Business' && (
                    <FormGrid columns={3} gap={5}>
                      <TextField
                        name="co_business_name"
                        label="Business Name"
                        value={formData.co_business_name}
                        onChange={(val) => updateField('co_business_name', capitalizeWords(val))}
                        required
                        placeholder="Enter business name"
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
                        label="Monthly Business Income (₹)"
                        value={formData.co_business_income_per_month}
                        onChange={(val) => updateField('co_business_income_per_month', val)}
                        required
                        placeholder="e.g. 60000"
                        error={errors.co_business_income_per_month}
                      />
                    </FormGrid>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center bg-[#f8fafd] rounded-xl border border-dashed border-[#dadce0]">
                <Users className="w-8 h-8 text-[#80868b] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-[#1f1f1f]">No Co-Applicant Selected</p>
                <p className="text-[11px] text-[#5f6368] mt-0.5">Toggle to 'Yes, Add Co-Applicant' above if required.</p>
              </div>
            )}

          </div>
        )}

        {/* SECTION 5: GUARANTORS (1, 2, 3) */}
        {(viewAllSections || activeStep === 5) && (
          <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs p-6 space-y-5">
            <div className="border-b border-[#e0e3e7] pb-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1f1f1f]">5. Guarantors Verification (3 Required)</h3>
                  <p className="text-[11px] text-[#5f6368]">Enter verified contact and residential details for 3 guarantors</p>
                </div>
              </div>

              {/* Guarantor Sub Tabs */}
              <div className="flex items-center gap-1.5 bg-[#f8fafd] border border-[#dadce0] p-1 rounded-full">
                {[1, 2, 3].map((idx) => {
                  const pfx = `guarantor_${idx}_`;
                  const isDone = Boolean(formData[`${pfx}name`] && formData[`${pfx}phone_number`]);
                  const isActive = activeGuarantorTab === idx;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveGuarantorTab(idx)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-[#1a73e8] text-white shadow-2xs'
                          : isDone
                          ? 'text-[#137333] hover:bg-[#e6f4ea]'
                          : 'text-[#5f6368] hover:text-[#1f1f1f]'
                      }`}
                    >
                      {isDone && <Check size={11} />}
                      <span>Guarantor {idx}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Guarantor Form */}
            <div>
              {renderGuarantorForm(activeGuarantorTab)}
            </div>

          </div>
        )}

        {/* Action Controls & Submission Unified Sticky Footer */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#e0e3e7] p-3 sm:p-3.5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-1 sm:bottom-2 z-20">
          {/* Left Side: Step Indicator or Previous Button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
            {!viewAllSections && activeStep > 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (activeStep === 5 && activeGuarantorTab > 1) {
                    setActiveGuarantorTab(activeGuarantorTab - 1);
                  } else {
                    setActiveStep(activeStep - 1);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white hover:bg-[#f1f3f4] border border-[#dadce0] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4 text-[#5f6368]" />
                <span>{activeStep === 5 && activeGuarantorTab > 1 ? `Guarantor ${activeGuarantorTab - 1}` : 'Previous'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#1f1f1f]">
                  {viewAllSections ? 'Full Form' : `Step ${activeStep} of 5`}
                </span>
                <span className="text-[11px] text-[#5f6368] hidden sm:inline">
                  • {viewAllSections ? 'Viewing all sections' : steps.find(s => s.id === activeStep)?.title}
                </span>
              </div>
            )}
          </div>

          {/* Right Side: Step Continue / Next Guarantor + Save Draft + Submit */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Step Continue Button (In Step-by-Step Mode) */}
            {!viewAllSections && activeStep < 5 && (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] border border-[#d2e3fc] transition-all cursor-pointer shadow-2xs"
              >
                <span>
                  {activeStep === 1
                    ? 'Continue to Addresses'
                    : activeStep === 2
                    ? 'Continue to Business'
                    : activeStep === 3
                    ? 'Continue to Co-Applicant'
                    : 'Continue to Guarantors'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Next Guarantor Tab Button (If on Step 5 and not on last tab) */}
            {!viewAllSections && activeStep === 5 && activeGuarantorTab < 3 && (
              <button
                type="button"
                onClick={() => setActiveGuarantorTab(activeGuarantorTab + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] border border-[#d2e3fc] transition-all cursor-pointer shadow-2xs"
              >
                <span>Next: Guarantor {activeGuarantorTab + 1}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Save as Draft — hidden when the application is already created/submitted */}
            {!isReadOnly && !isCreatedApp && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isDrafting || isSubmitting}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isDrafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-[#5f6368]" />}
                <span>{isDrafting ? 'Saving...' : 'Save Draft'}</span>
              </button>
            )}

            {/* Primary Submit */}
            <button
              type="submit"
              disabled={isSubmitting || isDrafting || (isReadOnly && !isEditMode)}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isEditMode ? 'Update Application' : 'Submit Loan Application'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default BusinessLoanForm;
