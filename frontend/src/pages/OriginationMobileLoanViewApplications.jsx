import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Camera,
  Loader2,
  X,
  Copy,
  Building2,
  FileEdit,
  Send,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { getLoanApplications, updateLoanApplicationStatus } from '../services/loanServices';
import { LoanDetailView } from '../components/forms';
import { LoanDocumentsSidebar } from '../components/forms/LoanDocumentsSidebar';
import { SignatureModal } from '../components/forms/SignatureModal';

const formatDateSafe = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : format(d, 'dd MMM yyyy, hh:mm a');
  } catch {
    return null;
  }
};

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'Created':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Under Review':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Approved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'Rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Draft':
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
};

export default function OriginationMobileLoanViewApplications({
  application: propApplication,
  formData: propFormData,
  fromPath: propFromPath,
  branchName: propBranchName
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const paramAppId = searchParams.get('id');

  const stateApplication = propApplication || location.state?.application;
  const stateFormData = propFormData || location.state?.form_data || stateApplication?.form_data;
  const fromPath = propFromPath || location.state?.from || '/employee/loans/origination/applications';

  // Fallback query if page is refreshed or visited with a query parameter/missing state
  const { data: response, isLoading } = useQuery({
    queryKey: ['origination', 'applications', 'list'],
    queryFn: getLoanApplications,
    enabled: !stateApplication,
  });

  let application = stateApplication;
  let formData = stateFormData;

  if (!application && response?.applications) {
    if (paramAppId) {
      application = response.applications.find(
        (a) => String(a.id) === String(paramAppId) || String(a.application_id) === String(paramAppId)
      );
    } else if (response.applications.length > 0) {
      application = response.applications[0];
    }
    if (application) {
      formData = application.form_data;
    }
  }

  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const [currentDocs, setCurrentDocs] = useState(
    formData?.documents || application?.documents || application?.form_data?.documents || {}
  );
  const [localStatus, setLocalStatus] = useState(
    application?.status || formData?.status || 'Draft'
  );
  const [localTimeline, setLocalTimeline] = useState(
    formData?.timeline || application?.form_data?.timeline || []
  );

  // Sync state if application is loaded via async query
  useEffect(() => {
    if (application) {
      if (application.status) setLocalStatus(application.status);
      const docs = formData?.documents || application.documents || application.form_data?.documents || {};
      setCurrentDocs(docs);
      const timeline = formData?.timeline || application.form_data?.timeline || [];
      setLocalTimeline(timeline);
    }
  }, [application, formData]);

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
    formatDateSafe(application?.created_at || application?.updated_at) ||
    format(new Date(), 'dd MMM yyyy');
  const appId = application?.application_id || formData?.application_id || 'LA-DRAFT';
  const dbId = application?.id || formData?.id;
  const loanType = application?.loan_type || formData?.loan_type || 'Business Loan';
  const branchName = propBranchName || application?.branch_name || formData?.branch_name || application?.branch || 'Corporate Office';
  const appStatus = String(localStatus);
  const isCreated =
    appStatus.toLowerCase() === 'created' ||
    appStatus.toLowerCase() === 'approved' ||
    appStatus.toLowerCase() === 'under_review';
  const isDraft = appStatus.toLowerCase() === 'draft';

  const handleCopyId = () => {
    if (!appId || appId === 'LA-DRAFT') return;
    navigator.clipboard.writeText(appId);
    toast.success(`Copied ${appId} to clipboard!`);
  };

  // Calculate Document Upload Status
  const hasCoApplicant =
    formData?.has_co_applicant === 'Yes' ||
    (formData?.co_applicant_name && String(formData?.co_applicant_name).trim() !== '');
  let requiredSlots = 1; // applicant
  if (hasCoApplicant) requiredSlots++;
  if (formData?.guarantor_1_name && String(formData?.guarantor_1_name).trim() !== '') requiredSlots++;
  if (formData?.guarantor_2_name && String(formData?.guarantor_2_name).trim() !== '') requiredSlots++;
  if (formData?.guarantor_3_name && String(formData?.guarantor_3_name).trim() !== '') requiredSlots++;

  const uploadedCount = [
    'applicant_photo',
    hasCoApplicant ? 'co_applicant_photo' : null,
    formData?.guarantor_1_name ? 'guarantor_1_photo' : null,
    formData?.guarantor_2_name ? 'guarantor_2_photo' : null,
    formData?.guarantor_3_name ? 'guarantor_3_photo' : null,
  ].filter((key) => key && !!currentDocs[key]).length;

  const isAllUploaded = requiredSlots > 0 && uploadedCount === requiredSlots;
  const hasTransferred =
    localStatus === 'Under Review' ||
    localStatus === 'Approved' ||
    localStatus === 'Rejected' ||
    localTimeline.some((e) => e.stage === 'Branch Operations');

  const handleTransferToBranchOperations = async (signatureDataUrl) => {
    if (!dbId) {
      toast.error('Application ID not found, cannot transfer.');
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
          .from('loan_signatures')
          .upload(fileName, fileToUpload, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) throw new Error(uploadError.message);
        signatureUrl = window.location.origin + '/Loan-Signature/' + fileName;
      }

      const timelineEvent = {
        stage: 'Branch Operations',
        timestamp: new Date().toISOString(),
        signature: signatureUrl,
      };
      const signatureData = signatureUrl ? { Origination: signatureUrl } : null;
      await updateLoanApplicationStatus(dbId, 'Under Review', timelineEvent, signatureData);

      setLocalTimeline((prev) => [...prev, timelineEvent]);
      setLocalStatus('Under Review');
      queryClient.invalidateQueries({ queryKey: ['origination', 'applications', 'list'] });
      toast.success('Application transferred to Branch Operations successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to transfer application.');
    } finally {
      setIsTransferring(false);
    }
  };

  if (!application && isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-[#5f6368]">
        <Loader2 className="animate-spin h-8 w-8 text-[#1a73e8] mb-3" />
        <p className="text-xs font-semibold">Loading application details...</p>
      </div>
    );
  }

  if (!application && !isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <p className="text-sm font-medium text-[#5f6368]">No application details found.</p>
        <button
          onClick={() => navigate(fromPath)}
          className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[#1a73e8] text-white hover:bg-[#1557b0] px-5 py-2 transition-all shadow-xs cursor-pointer"
        >
          Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-14 w-full">
      {/* 1. Google Material 3 Workspace Header Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-4 sm:p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30 space-y-3">
        {/* Workspace Tag */}
        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335] shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05] shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5 whitespace-nowrap">
            Origination Workspace
          </span>
        </div>

        {/* Heading + Back Button Row */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight whitespace-nowrap truncate">
            Application Details
          </h1>

          <button
            type="button"
            onClick={() => navigate(fromPath)}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-3.5 py-1.5 transition-all gap-1.5 shadow-2xs cursor-pointer shrink-0 whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#5f6368]" />
            <span>Back</span>
          </button>
        </div>

        {/* Subtitle / Status Meta Row */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {/* App ID Badge with Copy */}
          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] hover:bg-[#d2e3fc] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title="Click to copy Application ID"
          >
            <span>{appId}</span>
            <Copy className="w-3 h-3 text-[#1a73e8]" />
          </button>

          {/* Status Pill */}
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap shrink-0 ${getStatusBadgeStyle(localStatus)}`}>
            {localStatus === 'Created' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            <span>{localStatus}</span>
          </span>

          <span className="text-[#5f6368]">&bull;</span>
          <span className="text-xs font-medium text-[#5f6368] truncate">{loanType}</span>
        </div>

        {/* Subtitle Date & Branch */}
        <div className="text-[11px] text-[#5f6368] flex items-center gap-1.5 flex-wrap pt-0.5">
          <span>{isCreated ? `Created on ${formattedDate}` : `Draft saved on ${formattedDate}`}</span>
          {branchName && (
            <>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-1 truncate">
                <Building2 className="w-3 h-3 text-[#5f6368] shrink-0" />
                <span className="truncate">{branchName}</span>
              </span>
            </>
          )}
        </div>

        {/* Action Controls for Draft / Created Applications */}
        {isDraft && (
          <div className="pt-2 border-t border-[#e0e3e7]">
            <button
              type="button"
              onClick={() => {
                navigate('/employee/loans/form', {
                  state: {
                    application,
                    form_data: formData,
                    loan_type: loanType,
                    mode: 'edit',
                    isEdit: true,
                    from: `/employee/loans/view-application?id=${encodeURIComponent(appId)}`
                  }
                });
              }}
              className="w-full inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[#1a73e8] text-white hover:bg-[#1557b0] py-2.5 px-4 transition-all gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <FileEdit className="w-4 h-4" />
              <span>Continue / Complete Application</span>
            </button>
          </div>
        )}

        {isCreated && !hasTransferred && (
          <div className="pt-2 border-t border-[#e0e3e7] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsDocsOpen(true)}
              className="w-full inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1a73e8] hover:bg-[#e8f0fe] border border-[#d2e3fc] py-2.5 px-4 transition-all gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98]"
            >
              <Camera className="w-4 h-4 text-[#1a73e8]" />
              <span>Upload Photos ({uploadedCount}/{requiredSlots})</span>
            </button>

            {isAllUploaded && (
              <button
                type="button"
                onClick={() => setIsSignatureModalOpen(true)}
                disabled={isTransferring}
                className="w-full inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[#1a73e8] text-white hover:bg-[#1557b0] py-2.5 px-4 transition-all gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer active:scale-[0.98]"
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Transferring...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Transfer to Branch Operations
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Main Content Card with Loan Details */}
      <LoanDetailView
        formData={formData || {}}
        application={application || {}}
        currentDocs={currentDocs}
        onPreviewDoc={setPreviewDoc}
        localTimeline={localTimeline}
      />

      {/* Loan Documents Sidebar */}
      <LoanDocumentsSidebar
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        formData={{ ...(formData || {}), documents: currentDocs }}
        application={application}
        onDocumentsUpdated={(newDocs) => setCurrentDocs(newDocs)}
      />

      {/* Fullscreen Photo Lightbox Preview Portal */}
      {previewDoc &&
        createPortal(
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
        onSubmit={handleTransferToBranchOperations}
      />
    </div>
  );
}

export { OriginationMobileLoanViewApplications };
