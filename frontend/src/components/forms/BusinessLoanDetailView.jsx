import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  User,
  Users,
  Shield,
  Phone,
  MapPin,
  Briefcase,
  CheckCircle2,
  Clock,
  Printer,
  ArrowLeft,
  Calendar,
  Home,
  Lock,
  FileSpreadsheet,
  Camera,
  Image as ImageIcon,
  X,
  Loader2,
  ArrowRightCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { LoanDocumentsSidebar } from './LoanDocumentsSidebar';
import { SignatureModal } from './SignatureModal';
import { updateLoanApplicationStatus } from '../../services/loanServices';

// ============================================================================
// HELPER UTILITIES
// ============================================================================

const formatDateSafe = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : format(d, 'dd MMM yyyy, hh:mm a');
  } catch {
    return null;
  }
};

const formatCurrency = (val) => {
  if (!val) return '—';
  const num = Number(String(val).replace(/\D/g, ''));
  return isNaN(num) || num === 0 ? '—' : `₹ ${num.toLocaleString('en-IN')} / Month`;
};

/**
 * Resolves photo URL for loan documents matching employee avatar implementation
 */
const getDocumentPhotoUrl = (doc) => {
  if (!doc) return null;
  if (typeof doc === 'object' && doc !== null) {
    return doc.url || doc.proxy_url || null;
  }
  if (typeof doc === 'string') {
    return doc;
  }
  return null;
};

/**
 * Unified Passport Photograph Box Component
 * Displays authentic dashed placeholder with icon + "PASSPORT PHOTO" / "Not Uploaded"
 * or the uploaded image with tap-to-enlarge preview.
 */
const PassportPhotoBox = ({ doc, label, onPreview, icon: Icon = User, size = 'md' }) => {
  const photoUrl = getDocumentPhotoUrl(doc);

  const isSmall = size === 'sm';
  const boxDimensions = isSmall 
    ? 'w-24 h-32' 
    : 'w-28 h-36 sm:w-32 sm:h-40';

  return (
    <div className="shrink-0 flex flex-col items-center select-none passport-photo-box print:w-[110px] print:h-[140px] print:shrink-0">
      <div
        className={`${boxDimensions} rounded-xl border-2 ${
          photoUrl 
            ? 'border-blue-400 bg-blue-50/20' 
            : 'border-dashed border-slate-300 bg-slate-50/70'
        } flex flex-col items-center justify-center p-1 overflow-hidden shadow-2xs transition-all print:w-[110px] print:h-[140px] print:max-w-[110px] print:max-h-[140px]`}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={label}
            className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 active:scale-95 transition-all print:w-[102px] print:h-[130px] print:max-h-[130px] print:object-cover"
            onClick={() => onPreview && onPreview(photoUrl)}
            title="Click to view full size"
          />
        ) : (
          <div className="text-center p-1.5 flex flex-col items-center justify-center h-full">
            <Icon className={`${isSmall ? 'w-6 h-6' : 'w-8 h-8'} text-slate-300 mx-auto mb-1`} />
            <p className={`${isSmall ? 'text-[8.5px]' : 'text-[10px]'} font-bold text-slate-400 uppercase tracking-tight leading-tight`}>
              Passport Photo
            </p>
            <span className={`${isSmall ? 'text-[7.5px]' : 'text-[9px]'} text-slate-300 italic mt-0.5`}>
              Not Uploaded
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-wider text-center print:text-[9px]">
          {label}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// 1. MOBILE DETAIL VIEW SUB-COMPONENTS
// ============================================================================

/**
 * A single read-only detail field for mobile: small label on top, bold value below.
 */
const DetailField = ({ label, value }) => {
  const displayVal =
    value !== null && value !== undefined && String(value).trim() !== ''
      ? String(value)
      : '—';

  return (
    <div className="py-2.5">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-[15px] font-semibold text-slate-800 leading-snug break-words">
        {displayVal}
      </p>
    </div>
  );
};

/**
 * A thin divider between mobile fields.
 */
const FieldDivider = () => <div className="border-b border-slate-100" />;

/**
 * Mobile section card wrapper with numbered badge and title.
 */
const SectionCard = ({ number, title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
    <div className="flex items-center gap-1.5 px-5 pt-5 pb-3">
      <span className="text-sm font-bold text-slate-800 shrink-0">
        {number}.
      </span>
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
        {title}
      </h3>
    </div>
    <div className="px-5 pb-5">{children}</div>
  </div>
);

/**
 * Sub-section header inside a mobile card (e.g. "Current Address", "Permanent Address").
 */
const SubSectionHeader = ({ label }) => (
  <div className="pt-3 pb-1">
    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
      {label}
    </p>
    <div className="border-b border-blue-100 mt-1" />
  </div>
);

/**
 * Mobile Read-Only View Component (Designed for small screens)
 */
function MobileDetailView({ formData = {}, application = {}, onBack, userRole = 'origination' }) {
  const [activeGuarantorTab, setActiveGuarantorTab] = useState(1);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [currentDocs, setCurrentDocs] = useState(
    formData.documents || application.documents || application.form_data?.documents || {}
  );
  const [isTransferring, setIsTransferring] = useState(false);
  const [localStatus, setLocalStatus] = useState(application.status || formData.status || 'Draft');
  const [localTimeline, setLocalTimeline] = useState(
    formData.timeline || application.form_data?.timeline || []
  );

  useEffect(() => {
    if (previewDoc) {
      document.body.classList.add('hide-mobile-nav');
    } else {
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => {
      document.body.classList.remove('hide-mobile-nav');
    };
  }, [previewDoc]);

  const formattedDate =
    formatDateSafe(application.created_at || application.updated_at) ||
    format(new Date(), 'dd MMM yyyy');
  const appId = application.application_id || formData.application_id || 'LA-DRAFT';
  const dbId = application.id || formData.id;
  const loanType = application.loan_type || formData.loan_type || 'Business Loan';
  const appStatus = String(localStatus);
  const isSubmitted = appStatus.toLowerCase() === 'submitted' || appStatus.toLowerCase() === 'approved' || appStatus.toLowerCase() === 'under_review';

  // ── Calculate Document Upload Status ──
  const hasCoApplicant = formData.has_co_applicant === 'Yes' || (formData.co_applicant_name && String(formData.co_applicant_name).trim() !== '');
  let requiredSlots = 1; // applicant
  if (hasCoApplicant) requiredSlots++;
  if (formData.guarantor_1_name && String(formData.guarantor_1_name).trim() !== '') requiredSlots++;
  if (formData.guarantor_2_name && String(formData.guarantor_2_name).trim() !== '') requiredSlots++;
  if (formData.guarantor_3_name && String(formData.guarantor_3_name).trim() !== '') requiredSlots++;

  const uploadedCount = [
    'applicant_photo',
    hasCoApplicant ? 'co_applicant_photo' : null,
    formData.guarantor_1_name ? 'guarantor_1_photo' : null,
    formData.guarantor_2_name ? 'guarantor_2_photo' : null,
    formData.guarantor_3_name ? 'guarantor_3_photo' : null
  ].filter(key => key && !!currentDocs[key]).length;

  const isAllUploaded = requiredSlots > 0 && uploadedCount === requiredSlots;
  const hasTransferred = localTimeline.some(e => e.stage === 'Transferred to Underwriting');
  const showOriginationActions = userRole === 'origination' && !hasTransferred;
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  const handleTransferToUnderwriting = async (signatureDataUrl) => {
    if (!dbId) {
      toast.error("Application ID not found, cannot transfer.");
      return;
    }
    try {
      setIsSignatureModalOpen(false);
      setIsTransferring(true);
      
      let signatureUrl = null;
      if (signatureDataUrl) {
        const res = await fetch(signatureDataUrl);
        const blob = await res.blob();
        const fileToUpload = new File([blob], 'signature.png', { type: 'image/png' });
        
        const fileName = `${dbId}/employee-signature-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('loan_documents')
          .upload(fileName, fileToUpload, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) throw new Error(uploadError.message);
        signatureUrl = window.location.origin + "/Loan-Document/" + fileName;
      }

      const timelineEvent = {
        stage: 'Transferred to Underwriting',
        timestamp: new Date().toISOString(),
        signature: signatureUrl
      };
      const signatureData = signatureUrl ? { "Origination": signatureUrl } : null;
      await updateLoanApplicationStatus(dbId, 'Underwriting', timelineEvent, signatureData);
      
      setLocalTimeline([...localTimeline, timelineEvent]);
      toast.success("Application transferred to Underwriting successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to transfer application.");
    } finally {
      setIsTransferring(false);
    }
  };

  // Guarantor renderer for mobile
  const renderGuarantor = (idx) => {
    const pfx = `guarantor_${idx}_`;
    const g = (key) => formData[`${pfx}${key}`];
    const gEmp = g('employment');
    const gMarital = g('marital_status');
    const gPhoto = currentDocs[`guarantor_${idx}_photo`];
    const gPhotoUrl = getDocumentPhotoUrl(gPhoto);

    return (
      <div className="space-y-0">
        <SubSectionHeader label="Personal Details" />
        <div className="flex items-start justify-between gap-3 pt-1 pb-1">
          <div className="flex-1 min-w-0">
            <DetailField label="Full Name" value={g('name')} />
            <FieldDivider />
            <DetailField label="Phone Number" value={g('phone_number')} />
            <FieldDivider />
            <DetailField label="Aadhaar Number" value={g('aadhaar_number')} />
          </div>
          <PassportPhotoBox
            doc={gPhoto}
            label={`Guarantor ${idx}`}
            icon={Shield}
            size="sm"
            onPreview={setPreviewDoc}
          />
        </div>
        <FieldDivider />
        <DetailField label="Age" value={g('age') ? `${g('age')} Years` : ''} />
        <FieldDivider />
        <DetailField label="Gender" value={g('gender')} />
        <FieldDivider />
        <DetailField
          label="Marital Status"
          value={gMarital === 'Yes' ? 'Married' : gMarital === 'No' ? 'Unmarried' : gMarital}
        />
        {g('father_name') && (
          <>
            <FieldDivider />
            <DetailField label="Father's Name" value={g('father_name')} />
          </>
        )}
        {g('mother_name') && (
          <>
            <FieldDivider />
            <DetailField label="Mother's Name" value={g('mother_name')} />
          </>
        )}
        {g('husband_name') && (
          <>
            <FieldDivider />
            <DetailField label="Husband's Name" value={g('husband_name')} />
          </>
        )}
        <FieldDivider />
        <DetailField label="Own House" value={g('own_house')} />

        {/* Current Address */}
        <SubSectionHeader label="Current Address" />
        <DetailField label="Address" value={g('current_address')} />
        <FieldDivider />
        <DetailField label="Street / Locality" value={g('current_street')} />
        <FieldDivider />
        <DetailField label="City" value={g('current_city')} />
        <FieldDivider />
        <DetailField label="State" value={g('current_state')} />
        <FieldDivider />
        <DetailField label="Postal Code" value={g('current_postal_code')} />

        {/* Permanent Address */}
        <SubSectionHeader label="Permanent Address" />
        <DetailField label="Address" value={g('permanent_address')} />
        <FieldDivider />
        <DetailField label="Street / Locality" value={g('permanent_street')} />
        <FieldDivider />
        <DetailField label="City" value={g('permanent_city')} />
        <FieldDivider />
        <DetailField label="State" value={g('permanent_state')} />
        <FieldDivider />
        <DetailField label="Postal Code" value={g('permanent_postal_code')} />

        {/* Employment */}
        <SubSectionHeader label="Occupation & Income" />
        <DetailField
          label="Employment Type"
          value={
            gEmp === 'Job'
              ? 'Job (Salaried)'
              : gEmp === 'Business'
                ? 'Business (Self-Employed)'
                : gEmp
          }
        />
        {gEmp === 'Job' && (
          <>
            <FieldDivider />
            <DetailField label="Job / Employer Name" value={g('job_name')} />
            <FieldDivider />
            <DetailField label="Job Monthly Income" value={formatCurrency(g('job_income_per_month'))} />
            <FieldDivider />
            <DetailField label="Workplace Address" value={g('job_address')} />
          </>
        )}
        {gEmp === 'Business' && (
          <>
            <FieldDivider />
            <DetailField label="Business Name" value={g('business_name')} />
            <FieldDivider />
            <DetailField label="Business Monthly Income" value={formatCurrency(g('business_income_per_month'))} />
            <FieldDivider />
            <DetailField label="Business Address" value={g('business_address')} />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-full pb-2">
      {/* ━━━ Hero Header — matching Origination Module design ━━━ */}
      <section className="relative px-6 pt-12 pb-24 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between px-2">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 border border-white/20 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">
              ORIGINATION MODULE
            </p>
            <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-sm">
              Application Details
            </h2>
          </div>
          <div className="w-10 h-10" />
        </div>
      </section>

      {/* ━━━ Content Cards ━━━ */}
      <div className="relative z-20 -mt-12 px-4 space-y-4">
        {/* Application Overview & Status Card */}
        <div className="bg-white p-5 rounded-[24px] shadow-lg border border-slate-100/80">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-slate-900 tracking-tight font-sans">
              {appId}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isSubmitted ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
            }`}>
              {isSubmitted ? <CheckCircle2 size={10} /> : <Clock size={10} />} {appStatus}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500">{loanType}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
            {isSubmitted ? `Submitted on ${formattedDate}` : `Draft saved on ${formattedDate}`}
          </p>
          
          {isSubmitted && showOriginationActions && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setIsDocsOpen(true)}
                className="inline-flex items-center gap-2 text-lg font-bold text-blue-600 hover:text-blue-700 active:text-blue-800 transition-colors cursor-pointer font-sans"
              >
                <span className="underline decoration-blue-300 underline-offset-4">Documents Upload</span>
              </button>
              
              {appStatus === 'Submitted' && isAllUploaded && !hasTransferred && (
                <button
                  type="button"
                  onClick={() => setIsSignatureModalOpen(true)}
                  disabled={isTransferring}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl py-3 px-4 font-bold text-sm shadow-sm active:scale-95 transition-transform disabled:opacity-70 disabled:active:scale-100 cursor-pointer"
                >
                  {isTransferring ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Transferring...
                    </>
                  ) : (
                    <>
                      Transfer to Underwriting
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
        {/* ── 1. Applicant Personal Details ── */}
        <SectionCard number="1" title="Personal Details">
          <div className="flex items-start justify-between gap-3 pt-1 pb-1">
            <div className="flex-1 min-w-0">
              <DetailField label="Applicant Name" value={formData.applicant_name} />
              <FieldDivider />
              <DetailField label="Phone Number" value={formData.phone_number} />
              <FieldDivider />
              <DetailField label="Aadhaar Number" value={formData.aadhaar_number} />
            </div>
            <PassportPhotoBox
              doc={currentDocs.applicant_photo}
              label="Applicant"
              icon={User}
              size="sm"
              onPreview={setPreviewDoc}
            />
          </div>
          <FieldDivider />
          <DetailField label="Age" value={formData.age ? `${formData.age} Years` : ''} />
          <FieldDivider />
          <DetailField label="Gender" value={formData.gender} />
          <FieldDivider />
          <DetailField
            label="Marital Status"
            value={
              formData.marital_status === 'Yes'
                ? 'Married'
                : formData.marital_status === 'No'
                  ? 'Unmarried'
                  : formData.marital_status
            }
          />
          {formData.father_name && (
            <>
              <FieldDivider />
              <DetailField label="Father's Name" value={formData.father_name} />
            </>
          )}
          {formData.mother_name && (
            <>
              <FieldDivider />
              <DetailField label="Mother's Name" value={formData.mother_name} />
            </>
          )}
          {formData.husband_name && (
            <>
              <FieldDivider />
              <DetailField label="Husband's Name" value={formData.husband_name} />
            </>
          )}
          <FieldDivider />
          <DetailField label="Own House" value={formData.own_house} />
        </SectionCard>

        {/* ── 2. Residential Addresses ── */}
        <SectionCard number="2" title="Residential Address">
          <SubSectionHeader label="Current Address" />
          <DetailField label="Address" value={formData.current_address} />
          <FieldDivider />
          <DetailField label="Street / Locality" value={formData.current_street} />
          <FieldDivider />
          <DetailField label="City" value={formData.current_city} />
          <FieldDivider />
          <DetailField label="State" value={formData.current_state} />
          <FieldDivider />
          <DetailField label="Postal Code" value={formData.current_postal_code} />

          <SubSectionHeader label="Permanent Address" />
          <DetailField label="Address" value={formData.permanent_address} />
          <FieldDivider />
          <DetailField label="Street / Locality" value={formData.permanent_street} />
          <FieldDivider />
          <DetailField label="City" value={formData.permanent_city} />
          <FieldDivider />
          <DetailField label="State" value={formData.permanent_state} />
          <FieldDivider />
          <DetailField label="Postal Code" value={formData.permanent_postal_code} />
        </SectionCard>

        {/* ── 3. Employment & Income ── */}
        <SectionCard number="3" title="Employment & Income">
          <DetailField
            label="Employment Type"
            value={
              formData.employment === 'Job'
                ? 'Job (Salaried)'
                : formData.employment === 'Business'
                  ? 'Business (Self-Employed)'
                  : formData.employment
            }
          />

          {formData.employment === 'Job' && (
            <>
              <FieldDivider />
              <DetailField label="Job / Employer Name" value={formData.job_name} />
              <FieldDivider />
              <DetailField label="Job Monthly Income" value={formatCurrency(formData.job_income_per_month)} />
              <FieldDivider />
              <DetailField label="Workplace Address" value={formData.job_address} />
            </>
          )}

          {formData.employment === 'Business' && (
            <>
              <FieldDivider />
              <DetailField label="Business Name" value={formData.business_name} />
              <FieldDivider />
              <DetailField label="Business Monthly Income" value={formatCurrency(formData.business_income_per_month)} />
              <FieldDivider />
              <DetailField label="Business Address" value={formData.business_address} />
            </>
          )}
        </SectionCard>

        {/* ── 4. Co-Applicant Details ── */}
        <SectionCard number="4" title="Co-Applicant">
          <DetailField label="Has Co-Applicant" value={formData.has_co_applicant || 'No'} />

          {formData.has_co_applicant === 'Yes' && (
            <>
              <SubSectionHeader label="Co-Applicant Personal Details" />
              <div className="flex items-start justify-between gap-3 pt-1 pb-1">
                <div className="flex-1 min-w-0">
                  <DetailField label="Name" value={formData.co_applicant_name} />
                  <FieldDivider />
                  <DetailField label="Relation with Applicant" value={formData.co_relation_with_applicant} />
                  <FieldDivider />
                  <DetailField label="Phone Number" value={formData.co_phone_number} />
                  <FieldDivider />
                  <DetailField label="Aadhaar Number" value={formData.co_aadhaar_number} />
                </div>
                <PassportPhotoBox
                  doc={currentDocs.co_applicant_photo}
                  label="Co-Applicant"
                  icon={Users}
                  size="sm"
                  onPreview={setPreviewDoc}
                />
              </div>
              <FieldDivider />
              <DetailField label="Age" value={formData.co_age ? `${formData.co_age} Years` : ''} />
              <FieldDivider />
              <DetailField label="Gender" value={formData.co_gender} />
              <FieldDivider />
              <DetailField
                label="Marital Status"
                value={
                  formData.co_marital_status === 'Yes'
                    ? 'Married'
                    : formData.co_marital_status === 'No'
                      ? 'Unmarried'
                      : formData.co_marital_status
                }
              />
              {formData.co_father_name && (
                <>
                  <FieldDivider />
                  <DetailField label="Father's Name" value={formData.co_father_name} />
                </>
              )}
              {formData.co_mother_name && (
                <>
                  <FieldDivider />
                  <DetailField label="Mother's Name" value={formData.co_mother_name} />
                </>
              )}
              {formData.co_husband_name && (
                <>
                  <FieldDivider />
                  <DetailField label="Husband's Name" value={formData.co_husband_name} />
                </>
              )}
              <FieldDivider />
              <DetailField label="Own House" value={formData.co_own_house} />

              {/* Co-Applicant Current Address */}
              <SubSectionHeader label="Co-Applicant Current Address" />
              <DetailField label="Address" value={formData.co_current_address} />
              <FieldDivider />
              <DetailField label="Street / Locality" value={formData.co_current_street} />
              <FieldDivider />
              <DetailField label="City" value={formData.co_current_city} />
              <FieldDivider />
              <DetailField label="State" value={formData.co_current_state} />
              <FieldDivider />
              <DetailField label="Postal Code" value={formData.co_current_postal_code} />

              {/* Co-Applicant Permanent Address */}
              <SubSectionHeader label="Co-Applicant Permanent Address" />
              <DetailField label="Address" value={formData.co_permanent_address} />
              <FieldDivider />
              <DetailField label="Street / Locality" value={formData.co_permanent_street} />
              <FieldDivider />
              <DetailField label="City" value={formData.co_permanent_city} />
              <FieldDivider />
              <DetailField label="State" value={formData.co_permanent_state} />
              <FieldDivider />
              <DetailField label="Postal Code" value={formData.co_permanent_postal_code} />

              {/* Co-Applicant Employment */}
              {formData.co_employment && (
                <>
                  <SubSectionHeader label="Co-Applicant Employment & Income" />
                  <DetailField
                    label="Employment Type"
                    value={
                      formData.co_employment === 'Job'
                        ? 'Job (Salaried)'
                        : formData.co_employment === 'Business'
                          ? 'Business (Self-Employed)'
                          : formData.co_employment
                    }
                  />
                  {formData.co_employment === 'Job' && (
                    <>
                      <FieldDivider />
                      <DetailField label="Job Name" value={formData.co_job_name} />
                      <FieldDivider />
                      <DetailField label="Job Income" value={formatCurrency(formData.co_job_income_per_month)} />
                      <FieldDivider />
                      <DetailField label="Job Address" value={formData.co_job_address} />
                    </>
                  )}
                  {formData.co_employment === 'Business' && (
                    <>
                      <FieldDivider />
                      <DetailField label="Business Name" value={formData.co_business_name} />
                      <FieldDivider />
                      <DetailField label="Business Income" value={formatCurrency(formData.co_business_income_per_month)} />
                      <FieldDivider />
                      <DetailField label="Business Address" value={formData.co_business_address} />
                    </>
                  )}
                </>
              )}
            </>
          )}
        </SectionCard>

        {/* ── 5. Guarantors ── */}
        <SectionCard number="5" title="Guarantors (3 Required)">
          {/* Guarantor Pill Tabs */}
          <div className="flex items-center gap-2 pb-3 overflow-x-auto">
            {[1, 2, 3].map((gIdx) => {
              const isActive = activeGuarantorTab === gIdx;
              const gName = formData[`guarantor_${gIdx}_name`];
              const shortName = gName ? ` (${gName.split(' ')[0]})` : '';

              return (
                <button
                  key={gIdx}
                  type="button"
                  onClick={() => setActiveGuarantorTab(gIdx)}
                  className={`shrink-0 inline-flex items-center justify-center rounded-full text-xs font-semibold h-8 px-4 transition-all cursor-pointer ${isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  G{gIdx}{shortName}
                </button>
              );
            })}
          </div>

          {/* Active Guarantor */}
          {renderGuarantor(activeGuarantorTab)}
        </SectionCard>

        {/* ── 6. Application Timeline ── */}
        <SectionCard number="6" title="Application Timeline">
          <div className="py-2">
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2">
              {/* Created Event (Inferred) */}
              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-600" />
                <p className="text-sm font-bold text-slate-800">Application Created</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{formattedDate}</p>
              </div>
              
              {/* Dynamic Events from localTimeline */}
              {localTimeline.map((event, idx) => {
                const isLast = idx === localTimeline.length - 1;
                return (
                  <div key={idx} className="relative pl-6">
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${isLast ? 'bg-emerald-100 border-emerald-600' : 'bg-blue-100 border-blue-600'}`} />
                    <p className="text-sm font-bold text-slate-800">{event.stage}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{formatDateSafe(event.timestamp)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* ── Bottom Back Button ── */}
        <div className="flex justify-center pt-1 pb-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-slate-900 text-white h-11 px-6 transition-colors gap-2 shadow-sm cursor-pointer active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Applications
          </button>
        </div>
      </div>

      {/* Loan Documents Sidebar */}
      <LoanDocumentsSidebar
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        formData={{ ...formData, documents: currentDocs }}
        application={application}
        onDocumentsUpdated={(newDocs) => setCurrentDocs(newDocs)}
      />

      {/* Fullscreen Photo Lightbox Preview Portal */}
      {previewDoc && createPortal(
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setPreviewDoc(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewDoc(null)}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 active:scale-95 transition-all cursor-pointer z-10"
            title="Close Preview"
          >
            <X size={24} />
          </button>
          <div
            className="max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewDoc}
              alt="Enlarged Photo"
              className="w-full h-full object-contain max-h-[85vh] select-none"
            />
          </div>
        </div>,
        document.body
      )}

      {/* Signature Modal */}
      <SignatureModal 
        isOpen={isSignatureModalOpen} 
        onClose={() => setIsSignatureModalOpen(false)} 
        onSubmit={handleTransferToUnderwriting} 
      />
    </div>
  );
}

// ============================================================================
// 2. DESKTOP PHYSICAL PAPER DETAIL VIEW SUB-COMPONENTS
// ============================================================================

/**
 * Line-based Paper Application Field
 * Matches authentic printed physical application form with underline fill-ins
 */
const PaperLine = ({ label, value, className = '', labelWidth = 'min-w-[135px]' }) => {
  const displayVal = value !== null && value !== undefined && String(value).trim() !== '' ? String(value) : '';

  return (
    <div className={`flex flex-row items-baseline py-1 print:py-0.5 ${className}`}>
      <span className={`${labelWidth} text-xs sm:text-sm font-semibold text-slate-700 shrink-0 select-none pr-2 print:text-xs print:font-bold`}>
        {label}:
      </span>
      <div className="flex-1 border-b border-slate-300 sm:border-slate-400 min-h-[22px] print:min-h-[20px] flex items-end pb-0.5">
        <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide break-words print:text-xs">
          {displayVal || <span className="text-slate-300 font-normal italic">—</span>}
        </span>
      </div>
    </div>
  );
};

function DesktopPaperView({ formData = {}, application = {}, onBack, userRole = 'origination' }) {
  const [activeGuarantorTab, setActiveGuarantorTab] = useState(1);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [currentDocs, setCurrentDocs] = useState(
    formData.documents || application.documents || application.form_data?.documents || {}
  );
  const [isTransferring, setIsTransferring] = useState(false);
  const [localStatus, setLocalStatus] = useState(application.status || formData.status || 'Draft');
  const [localTimeline, setLocalTimeline] = useState(
    formData.timeline || application.form_data?.timeline || []
  );

  useEffect(() => {
    if (previewDoc) {
      document.body.classList.add('hide-mobile-nav');
    } else {
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => {
      document.body.classList.remove('hide-mobile-nav');
    };
  }, [previewDoc]);

  const formattedDate = formatDateSafe(application.created_at || application.updated_at) || format(new Date(), 'dd MMM yyyy');
  const appId = application.application_id || formData.application_id || 'LA-DRAFT';
  const dbId = application.id || formData.id;
  const appStatus = String(localStatus);
  const isSubmitted = appStatus.toLowerCase() === 'submitted' || appStatus.toLowerCase() === 'approved' || appStatus.toLowerCase() === 'under_review';

  // ── Calculate Document Upload Status ──
  const hasCoApplicant = formData.has_co_applicant === 'Yes' || (formData.co_applicant_name && String(formData.co_applicant_name).trim() !== '');
  let requiredSlots = 1; // applicant
  if (hasCoApplicant) requiredSlots++;
  if (formData.guarantor_1_name && String(formData.guarantor_1_name).trim() !== '') requiredSlots++;
  if (formData.guarantor_2_name && String(formData.guarantor_2_name).trim() !== '') requiredSlots++;
  if (formData.guarantor_3_name && String(formData.guarantor_3_name).trim() !== '') requiredSlots++;

  const uploadedCount = [
    'applicant_photo',
    hasCoApplicant ? 'co_applicant_photo' : null,
    formData.guarantor_1_name ? 'guarantor_1_photo' : null,
    formData.guarantor_2_name ? 'guarantor_2_photo' : null,
    formData.guarantor_3_name ? 'guarantor_3_photo' : null
  ].filter(key => key && !!currentDocs[key]).length;

  const isAllUploaded = requiredSlots > 0 && uploadedCount === requiredSlots;
  const hasTransferred = localTimeline.some(e => e.stage === 'Transferred to Underwriting');
  const showOriginationActions = userRole === 'origination' && !hasTransferred;
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  const handleTransferToUnderwriting = async (signatureDataUrl) => {
    if (!dbId) {
      toast.error("Application ID not found, cannot transfer.");
      return;
    }
    try {
      setIsSignatureModalOpen(false);
      setIsTransferring(true);
      
      let signatureUrl = null;
      if (signatureDataUrl) {
        const res = await fetch(signatureDataUrl);
        const blob = await res.blob();
        const fileToUpload = new File([blob], 'signature.png', { type: 'image/png' });
        
        const fileName = `${dbId}/employee-signature-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('loan_documents')
          .upload(fileName, fileToUpload, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) throw new Error(uploadError.message);
        signatureUrl = window.location.origin + "/Loan-Document/" + fileName;
      }

      const timelineEvent = {
        stage: 'Transferred to Underwriting',
        timestamp: new Date().toISOString(),
        signature: signatureUrl
      };
      const signatureData = signatureUrl ? { "Origination": signatureUrl } : null;
      await updateLoanApplicationStatus(dbId, 'Underwriting', timelineEvent, signatureData);
      
      setLocalTimeline([...localTimeline, timelineEvent]);
      toast.success("Application transferred to Underwriting successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to transfer application.");
    } finally {
      setIsTransferring(false);
    }
  };

  useEffect(() => {
    const originalTitle = document.title;
    const handleBeforePrint = () => {
      const documentName = appId && appId !== 'LA-DRAFT' ? appId : 'Business-Loan-Application';
      document.title = documentName;
    };
    const handleAfterPrint = () => {
      document.title = originalTitle;
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [appId]);

  const handlePrint = () => {
    const originalTitle = document.title;
    const documentName = appId && appId !== 'LA-DRAFT' ? appId : 'Business-Loan-Application';
    document.title = documentName;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const renderGuarantorPaper = (idx) => {
    const pfx = `guarantor_${idx}_`;
    const labelPfx = `Guarantor ${idx}`;
    const gName = formData[`${pfx}name`];
    const gPhone = formData[`${pfx}phone_number`];
    const gAadhaar = formData[`${pfx}aadhaar_number`];
    const gAge = formData[`${pfx}age`];
    const gGender = formData[`${pfx}gender`];
    const gMarital = formData[`${pfx}marital_status`];
    const gFather = formData[`${pfx}father_name`];
    const gMother = formData[`${pfx}mother_name`];
    const gHusband = formData[`${pfx}husband_name`];
    const gOwnHouse = formData[`${pfx}own_house`];

    const gCurAddr = formData[`${pfx}current_address`];
    const gCurStreet = formData[`${pfx}current_street`];
    const gCurCity = formData[`${pfx}current_city`];
    const gCurState = formData[`${pfx}current_state`];
    const gCurZip = formData[`${pfx}current_postal_code`];

    const gPermAddr = formData[`${pfx}permanent_address`];
    const gPermStreet = formData[`${pfx}permanent_street`];
    const gPermCity = formData[`${pfx}permanent_city`];
    const gPermState = formData[`${pfx}permanent_state`];
    const gPermZip = formData[`${pfx}permanent_postal_code`];

    const gEmp = formData[`${pfx}employment`];
    const gJobName = formData[`${pfx}job_name`];
    const gJobAddr = formData[`${pfx}job_address`];
    const gJobIncome = formData[`${pfx}job_income_per_month`];
    const gBizName = formData[`${pfx}business_name`];
    const gBizAddr = formData[`${pfx}business_address`];
    const gBizIncome = formData[`${pfx}business_income_per_month`];

    return (
      <div className="space-y-6">
        {/* Personal Details */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
            A. {labelPfx} Personal Details
          </div>
          <div className="flex flex-row items-start justify-between gap-4 print:flex-row print:items-start">
            <div className="flex-1 space-y-1 w-full">
              <PaperLine label={`${labelPfx} Name`} value={gName} />

              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                <PaperLine label="Phone Number" value={gPhone} />
                <PaperLine label="Aadhaar Number" value={gAadhaar} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
                <PaperLine label="Age" value={gAge ? `${gAge} Years` : ''} labelWidth="min-w-[70px]" />
                <PaperLine label="Gender" value={gGender} labelWidth="min-w-[70px]" />
                <PaperLine label="Marital Status" value={gMarital === 'Yes' ? 'Married' : gMarital === 'No' ? 'Unmarried' : gMarital} labelWidth="min-w-[100px]" />
              </div>

              {gFather && <PaperLine label="Father's Name" value={gFather} />}
              {gMother && <PaperLine label="Mother's Name" value={gMother} />}
              {gHusband && <PaperLine label="Husband's Name" value={gHusband} />}
              <PaperLine label="Own House" value={gOwnHouse} />
            </div>

            {/* Passport Photo Box */}
            <PassportPhotoBox
              doc={currentDocs[`guarantor_${idx}_photo`]}
              label={`Guarantor ${idx}`}
              icon={Shield}
              onPreview={setPreviewDoc}
            />
          </div>
        </div>

        {/* Current Address */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
            B. {labelPfx} Current Residential Address
          </div>
          <PaperLine label="Current Address" value={gCurAddr} />
          <PaperLine label="Street / Locality" value={gCurStreet} />
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
            <PaperLine label="City" value={gCurCity} labelWidth="min-w-[60px]" />
            <PaperLine label="State" value={gCurState} labelWidth="min-w-[60px]" />
            <PaperLine label="Postal Code" value={gCurZip} labelWidth="min-w-[90px]" />
          </div>
        </div>

        {/* Permanent Address */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
            C. {labelPfx} Permanent Residential Address
          </div>
          <PaperLine label="Permanent Address" value={gPermAddr} />
          <PaperLine label="Street / Locality" value={gPermStreet} />
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
            <PaperLine label="City" value={gPermCity} labelWidth="min-w-[60px]" />
            <PaperLine label="State" value={gPermState} labelWidth="min-w-[60px]" />
            <PaperLine label="Postal Code" value={gPermZip} labelWidth="min-w-[90px]" />
          </div>
        </div>

        {/* Employment & Income */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
            D. {labelPfx} Occupation & Income Details
          </div>
          <PaperLine label="Employment Type" value={gEmp === 'Job' ? 'Job (Salaried)' : gEmp === 'Business' ? 'Business (Self-Employed)' : gEmp} />

          {gEmp === 'Job' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                <PaperLine label="Job / Employer Name" value={gJobName} />
                <PaperLine label="Job Monthly Income" value={formatCurrency(gJobIncome)} labelWidth="min-w-[170px]" />
              </div>
              <PaperLine label="Workplace Address" value={gJobAddr} />
            </>
          )}

          {gEmp === 'Business' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                <PaperLine label="Business Name" value={gBizName} />
                <PaperLine label="Business Monthly Income" value={formatCurrency(gBizIncome)} labelWidth="min-w-[175px]" />
              </div>
              <PaperLine label="Business Address" value={gBizAddr} />
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-full space-y-6 pb-12">
      {/* Top Page Header & Right Action Buttons (Hidden in Print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Application
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Lock className="w-3.5 h-3.5 text-blue-600" /> Read-Only Mode
            </span>
          </div>
          <p className="text-sm text-slate-500">
            View and manage submitted loan application records, documents, and print copies.
          </p>
        </div>

        {/* Right-aligned action buttons matching AddLead style */}
        <div className="flex items-center gap-3 shrink-0">
          {isSubmitted && showOriginationActions && (
            <button
              type="button"
              onClick={() => setIsDocsOpen(true)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 transition-colors gap-2 shadow-sm cursor-pointer"
            >
              <Camera className="w-4 h-4" /> Upload Photos
            </button>
          )}

          {appStatus === 'Submitted' && isAllUploaded && showOriginationActions && (
            <button
              type="button"
              onClick={() => setIsSignatureModalOpen(true)}
              disabled={isTransferring}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-4 transition-colors gap-2 shadow-sm cursor-pointer disabled:opacity-70"
            >
              {isTransferring ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Transferring...</>
              ) : (
                <>Transfer to Underwriting</>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 transition-colors gap-2 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Application Form
          </button>
        </div>
      </div>

      {/* Main Physical Paper Document View */}
      <div className="relative bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none">

        {/* Full Page Diagonal Application ID Watermark (Centered cross on every printed page with light fadeout color) */}
        <div className="print-watermark hidden print:flex">
          <span className="print-watermark-text">
            {appId}
          </span>
        </div>

        {/* Paper Form Header (Matching Acme HRMS Theme) */}
        <div className="p-6 sm:p-7 bg-white border-b border-slate-200 print:px-0 print:pt-0 print:pb-3">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest print:text-[10px]">
                <Building2 className="w-4 h-4 text-blue-600 print:w-3.5 print:h-3.5" /> Acme Financial Services • Credit Origination
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 uppercase print:text-lg">
                Business Loan Application Form
              </h1>
              <p className="text-xs text-slate-500 print:text-[10px]">
                Official Commercial Credit Record • Form Code: BL-ORIG-2026
              </p>
            </div>

            {/* App / Loan ID & Date Info */}
            <div className="flex flex-col items-end gap-0.5 text-right">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider print:text-[9px]">
                Application ID
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-blue-600 print:text-xl">
                {appId}
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500 print:text-[10px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400 print:w-3 print:h-3" /> {formattedDate}
              </div>
            </div>
          </div>
        </div>

        {/* Paper Sheet Form Fields Body */}
        <div className="p-6 sm:p-8 space-y-8 print:space-y-4 print:p-4 bg-white text-slate-900">

          {/* ================= 1. APPLICANT PERSONAL DETAILS ================= */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">1</span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                Applicant Personal Details
              </h2>
            </div>

            <div className="flex flex-row items-start justify-between gap-4 print:flex-row print:items-start pt-1">
              <div className="flex-1 space-y-1 w-full">
                <PaperLine label="Applicant Name" value={formData.applicant_name} />

                <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                  <PaperLine label="Phone Number" value={formData.phone_number} />
                  <PaperLine label="Aadhaar Number" value={formData.aadhaar_number} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
                  <PaperLine label="Age" value={formData.age ? `${formData.age} Years` : ''} labelWidth="min-w-[70px]" />
                  <PaperLine label="Gender" value={formData.gender} labelWidth="min-w-[70px]" />
                  <PaperLine label="Marital Status" value={formData.marital_status === 'Yes' ? 'Married' : formData.marital_status === 'No' ? 'Unmarried' : formData.marital_status} labelWidth="min-w-[100px]" />
                </div>

                {formData.father_name && <PaperLine label="Father's Name" value={formData.father_name} />}
                {formData.mother_name && <PaperLine label="Mother's Name" value={formData.mother_name} />}
                {formData.husband_name && <PaperLine label="Husband's Name" value={formData.husband_name} />}
                <PaperLine label="Own House" value={formData.own_house} />
              </div>

              {/* Passport Photo Box */}
              <PassportPhotoBox
                doc={currentDocs.applicant_photo}
                label="Applicant"
                icon={User}
                onPreview={setPreviewDoc}
              />
            </div>
          </section>

          {/* ================= 2. RESIDENTIAL ADDRESSES ================= */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">2</span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                Applicant Residential Address Details
              </h2>
            </div>

            {/* Current Address */}
            <div className="space-y-1">
              <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                A. Current Address
              </div>
              <PaperLine label="Current Address" value={formData.current_address} />
              <PaperLine label="Street / Locality" value={formData.current_street} />
              <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
                <PaperLine label="City" value={formData.current_city} labelWidth="min-w-[60px]" />
                <PaperLine label="State" value={formData.current_state} labelWidth="min-w-[60px]" />
                <PaperLine label="Postal Code" value={formData.current_postal_code} labelWidth="min-w-[90px]" />
              </div>
            </div>

            {/* Permanent Address */}
            <div className="space-y-1 pt-2">
              <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                B. Permanent Address
              </div>
              <PaperLine label="Permanent Address" value={formData.permanent_address} />
              <PaperLine label="Street / Locality" value={formData.permanent_street} />
              <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
                <PaperLine label="City" value={formData.permanent_city} labelWidth="min-w-[60px]" />
                <PaperLine label="State" value={formData.permanent_state} labelWidth="min-w-[60px]" />
                <PaperLine label="Postal Code" value={formData.permanent_postal_code} labelWidth="min-w-[90px]" />
              </div>
            </div>
          </section>

          {/* ================= 3. EMPLOYMENT & INCOME ================= */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">3</span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                Employment & Monthly Income Details
              </h2>
            </div>

            <div className="space-y-1 pt-1">
              <PaperLine
                label="Employment Type"
                value={formData.employment === 'Job' ? 'Job (Salaried)' : formData.employment === 'Business' ? 'Business (Self-Employed)' : formData.employment}
              />

              {formData.employment === 'Job' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                    <PaperLine label="Job / Employer Name" value={formData.job_name} />
                    <PaperLine label="Job Monthly Income" value={formatCurrency(formData.job_income_per_month)} labelWidth="min-w-[170px]" />
                  </div>
                  <PaperLine label="Workplace Address" value={formData.job_address} />
                </>
              )}

              {formData.employment === 'Business' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                    <PaperLine label="Business Name" value={formData.business_name} />
                    <PaperLine label="Business Monthly Income" value={formatCurrency(formData.business_income_per_month)} labelWidth="min-w-[175px]" />
                  </div>
                  <PaperLine label="Business Address" value={formData.business_address} />
                </>
              )}
            </div>
          </section>

          {/* ================= 4. CO-APPLICANT DETAILS ================= */}
          <section className="space-y-3 print-break-before">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">4</span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                Co-Applicant Details
              </h2>
            </div>

            <PaperLine label="Has Co-Applicant" value={formData.has_co_applicant || 'No'} />

            {formData.has_co_applicant === 'Yes' && (
              <div className="space-y-4 pt-2">
                {/* Co-applicant Personal */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                    A. Co-Applicant Personal Particulars
                  </div>
                  <div className="flex flex-row items-start justify-between gap-4 print:flex-row print:items-start">
                    <div className="flex-1 space-y-1 w-full">
                      <PaperLine label="Co-Applicant Name" value={formData.co_applicant_name} />
                      <PaperLine label="Relation with Applicant" value={formData.co_relation_with_applicant} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                        <PaperLine label="Phone Number" value={formData.co_phone_number} />
                        <PaperLine label="Aadhaar Number" value={formData.co_aadhaar_number} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
                        <PaperLine label="Age" value={formData.co_age ? `${formData.co_age} Years` : ''} labelWidth="min-w-[70px]" />
                        <PaperLine label="Gender" value={formData.co_gender} labelWidth="min-w-[70px]" />
                        <PaperLine label="Marital Status" value={formData.co_marital_status === 'Yes' ? 'Married' : formData.co_marital_status === 'No' ? 'Unmarried' : formData.co_marital_status} labelWidth="min-w-[100px]" />
                      </div>
                      {formData.co_father_name && <PaperLine label="Father's Name" value={formData.co_father_name} />}
                      {formData.co_mother_name && <PaperLine label="Mother's Name" value={formData.co_mother_name} />}
                      {formData.co_husband_name && <PaperLine label="Husband's Name" value={formData.co_husband_name} />}
                      <PaperLine label="Own House" value={formData.co_own_house} />
                    </div>

                    {/* Co-Applicant Passport Photo Box */}
                    <PassportPhotoBox
                      doc={currentDocs.co_applicant_photo}
                      label="Co-Applicant"
                      icon={Users}
                      onPreview={setPreviewDoc}
                    />
                  </div>
                </div>

                {/* Co-applicant Current Address */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                    B. Co-Applicant Current Address
                  </div>
                  <PaperLine label="Current Address" value={formData.co_current_address} />
                  <PaperLine label="Street / Locality" value={formData.co_current_street} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
                    <PaperLine label="City" value={formData.co_current_city} labelWidth="min-w-[60px]" />
                    <PaperLine label="State" value={formData.co_current_state} labelWidth="min-w-[60px]" />
                    <PaperLine label="Postal Code" value={formData.co_current_postal_code} labelWidth="min-w-[90px]" />
                  </div>
                </div>

                {/* Co-applicant Permanent Address */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                    C. Co-Applicant Permanent Address
                  </div>
                  <PaperLine label="Permanent Address" value={formData.co_permanent_address} />
                  <PaperLine label="Street / Locality" value={formData.co_permanent_street} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-x-6">
                    <PaperLine label="City" value={formData.co_permanent_city} labelWidth="min-w-[60px]" />
                    <PaperLine label="State" value={formData.co_permanent_state} labelWidth="min-w-[60px]" />
                    <PaperLine label="Postal Code" value={formData.co_permanent_postal_code} labelWidth="min-w-[90px]" />
                  </div>
                </div>

                {/* Co-applicant Employment */}
                {formData.co_employment && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                      D. Co-Applicant Employment & Income
                    </div>
                    <PaperLine label="Employment Type" value={formData.co_employment === 'Job' ? 'Job (Salaried)' : formData.co_employment === 'Business' ? 'Business (Self-Employed)' : formData.co_employment} />
                    {formData.co_employment === 'Job' && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                          <PaperLine label="Job / Employer Name" value={formData.co_job_name} />
                          <PaperLine label="Job Monthly Income" value={formatCurrency(formData.co_job_income_per_month)} labelWidth="min-w-[170px]" />
                        </div>
                        <PaperLine label="Workplace Address" value={formData.co_job_address} />
                      </>
                    )}
                    {formData.co_employment === 'Business' && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6">
                          <PaperLine label="Business Name" value={formData.co_business_name} />
                          <PaperLine label="Business Monthly Income" value={formatCurrency(formData.co_business_income_per_month)} labelWidth="min-w-[175px]" />
                        </div>
                        <PaperLine label="Business Address" value={formData.co_business_address} />
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ================= 5. GUARANTOR DETAILS (3 REQUIRED) ================= */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2 print:hidden">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">5</span>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                  Guarantors Details (3 Required)
                </h2>
              </div>

              {/* Guarantor Tabs Styled Like Add Lead Button */}
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                {[1, 2, 3].map((gIdx) => {
                  const isActive = activeGuarantorTab === gIdx;
                  const gName = formData[`guarantor_${gIdx}_name`];
                  const shortName = gName ? ` (${gName.split(' ')[0]})` : '';

                  return (
                    <button
                      key={gIdx}
                      type="button"
                      onClick={() => setActiveGuarantorTab(gIdx)}
                      className={`inline-flex items-center justify-center rounded-md text-xs sm:text-sm font-medium h-9 px-3.5 transition-colors gap-1.5 cursor-pointer shadow-xs ${isActive
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                          : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-300'
                        }`}
                    >
                      Guarantor {gIdx}{shortName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Guarantor Form in Screen View (Hidden in Print to prevent duplication) */}
            <div className="p-4 sm:p-5 rounded-md border border-slate-200 bg-slate-50/50 print:hidden">
              {renderGuarantorPaper(activeGuarantorTab)}
            </div>

            {/* Print View: Render all 3 Guarantors sequentially when printing */}
            <div className="hidden print:block space-y-6 print:p-0 print:m-0">
              <div className="space-y-4 print-break-before print:p-0 print:m-0">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">5</span>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">Guarantor 1 Details</h2>
                </div>
                {renderGuarantorPaper(1)}
              </div>

              <div className="space-y-4 print-break-before print:p-0 print:m-0">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">6</span>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">Guarantor 2 Details</h2>
                </div>
                {renderGuarantorPaper(2)}
              </div>

              <div className="space-y-4 print-break-before print:p-0 print:m-0">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">7</span>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">Guarantor 3 Details</h2>
                </div>
                {renderGuarantorPaper(3)}
              </div>
            </div>
          </section>

          {/* ================= 6. APPLICATION TIMELINE ================= */}
          <section className="space-y-4 print:hidden">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">6</span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                Application Timeline
              </h2>
            </div>
            
            <div className="p-4 sm:p-5 rounded-md border border-slate-200 bg-slate-50/50">
              <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2">
                {/* Created Event (Inferred) */}
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-600" />
                  <p className="text-sm font-bold text-slate-800">Application Created</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{formattedDate}</p>
                </div>
                
                {/* Dynamic Events from localTimeline */}
                {localTimeline.map((event, idx) => {
                  const isLast = idx === localTimeline.length - 1;
                  return (
                    <div key={idx} className="relative pl-6">
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${isLast ? 'bg-emerald-100 border-emerald-600' : 'bg-blue-100 border-blue-600'}`} />
                      <p className="text-sm font-bold text-slate-800">{event.stage}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{formatDateSafe(event.timestamp)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Bottom Back Button */}
      <div className="flex justify-center pt-2 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 h-10 px-6 transition-colors gap-2 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Applications List
        </button>
      </div>

      {/* Loan Documents Sidebar */}
      <LoanDocumentsSidebar
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        formData={{ ...formData, documents: currentDocs }}
        application={application}
        onDocumentsUpdated={(newDocs) => setCurrentDocs(newDocs)}
      />

      {/* Fullscreen Photo Lightbox Preview Portal */}
      {previewDoc && createPortal(
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setPreviewDoc(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewDoc(null)}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30 active:scale-95 transition-all cursor-pointer z-10"
            title="Close Preview"
          >
            <X size={24} />
          </button>
          <div
            className="max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewDoc}
              alt="Enlarged Photo"
              className="w-full h-full object-contain max-h-[85vh] select-none"
            />
          </div>
        </div>,
        document.body
      )}

      {/* Signature Modal */}
      <SignatureModal 
        isOpen={isSignatureModalOpen} 
        onClose={() => setIsSignatureModalOpen(false)} 
        onSubmit={handleTransferToUnderwriting} 
      />
    </div>
  );
}

// ============================================================================
// 3. UNIFIED RESPONSIVE BUSINESS LOAN DETAIL VIEW EXPORT
// ============================================================================

export function BusinessLoanDetailView({ formData = {}, application = {}, onBack, userRole = 'origination' }) {
  const appId = application.application_id || formData.application_id || 'LA-DRAFT';
  const showOriginationActions = !application.hasTransferred && userRole === 'origination';

  useEffect(() => {
    const originalTitle = document.title;
    const handleBeforePrint = () => {
      const documentName = appId && appId !== 'LA-DRAFT' ? appId : 'Business-Loan-Application';
      document.title = documentName;
    };
    const handleAfterPrint = () => {
      document.title = originalTitle;
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [appId]);

  return (
    <>
      {/* Mobile Detail View: Spacious cards with animated hero gradient (Hidden in Print) */}
      <div className="md:hidden print:hidden">
        <MobileDetailView
          formData={formData}
          application={application}
          onBack={onBack}
        />
      </div>

      {/* Desktop Detail View: Physical paper document with print capabilities (Always forced visible in Print) */}
      <div className="hidden md:block print:block">
        <DesktopPaperView
          formData={formData}
          application={application}
          onBack={onBack}
        />
      </div>
    </>
  );
}

export { MobileDetailView as BusinessLoanMobileDetailView, DesktopPaperView as BusinessLoanPaperView };
export default BusinessLoanDetailView;
