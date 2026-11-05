import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Camera,
  Loader2,
  X,
  Copy,
  Building2,
  FileEdit,
  Send
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-[var(--muted)]">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--brand-deep)] mb-3" />
        <p className="text-sm font-medium">Loading application details...</p>
      </div>
    );
  }

  if (!application && !isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-[var(--muted)]">
        <p className="text-sm font-medium mb-4 text-[var(--text)]">No application details found.</p>
        <button
          onClick={() => navigate(fromPath)}
          className="px-4 py-2 bg-[var(--ink)] text-white rounded-[12px] text-sm font-semibold hover:bg-[var(--ink-2)] transition-colors"
        >
          Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-14 font-sans antialiased text-[var(--text)]">
      {/* Header & Back Action */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Origination &bull; Loan Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Application <span className="text-[var(--brand-deep)]">Details</span>
            </h2>

            <button
              type="button"
              onClick={() => navigate(fromPath)}
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 rounded-[12px] text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} className="text-[var(--icon-muted)]" />
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1">
            Review and Verification
          </p>
        </div>
      </section>

      {/* 2. Content Layer */}
      <div className="relative z-20 space-y-4">
        {/* Application Overview & Status Card */}
        <div className="bg-[var(--surface)] p-5 rounded-[20px] shadow-xs border border-[var(--line)] space-y-4">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--line)]">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[var(--text)] tracking-tight font-mono">
                  {appId}
                </span>
                {appId !== 'LA-DRAFT' && (
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 rounded-[6px] text-[var(--muted)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                    title="Copy App ID"
                  >
                    <Copy size={13} />
                  </button>
                )}
              </div>
              <p className="text-xs font-semibold text-[var(--brand-deep)] truncate">{loanType}</p>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[12px] font-semibold shrink-0 ${
              appStatus === 'Created' || appStatus === 'Approved'
                ? 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]'
                : appStatus === 'Under Review'
                ? 'bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]'
                : 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]'
            }`}>
              {appStatus === 'Created' || appStatus === 'Approved' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
              <span>{appStatus}</span>
            </span>
          </div>

          <div className="text-[11px] text-[var(--muted)] space-y-1">
            <p>{isCreated ? `Created on ${formattedDate}` : `Draft saved on ${formattedDate}`}</p>
            {branchName && (
              <p className="flex items-center gap-1.5 truncate">
                <Building2 size={12} className="text-[var(--icon-muted)] shrink-0" />
                <span className="truncate">{branchName}</span>
              </p>
            )}
          </div>

          {/* Action Controls for Draft / Created Applications */}
          {isDraft && (
            <div className="pt-2 border-t border-[var(--line)]">
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
                className="w-full inline-flex items-center justify-center rounded-[12px] text-xs font-semibold bg-[var(--ink)] text-white hover:bg-[var(--ink-2)] py-3 px-4 transition-all gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <FileEdit size={14} />
                <span>Continue / Complete Application</span>
              </button>
            </div>
          )}

          {isCreated && !hasTransferred && (
            <div className="pt-2 border-t border-[var(--line)] flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setIsDocsOpen(true)}
                className="w-full inline-flex items-center justify-center rounded-[12px] text-xs font-semibold bg-[var(--surface-alt)] text-[var(--brand-deep)] hover:bg-[var(--brand-tint)] border border-[var(--line)] py-2.5 px-4 transition-all gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <Camera size={15} />
                <span>Upload Photos ({uploadedCount}/{requiredSlots})</span>
              </button>

              {isAllUploaded && (
                <button
                  type="button"
                  onClick={() => setIsSignatureModalOpen(true)}
                  disabled={isTransferring}
                  className="w-full inline-flex items-center justify-center rounded-[12px] text-xs font-semibold bg-[var(--badge-success-text)] text-white hover:opacity-90 py-3 px-4 transition-all gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                >
                  {isTransferring ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Transferring...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Transfer to Branch Operations
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Loan Details Content */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs overflow-hidden">
          <LoanDetailView
            formData={formData || {}}
            application={application || {}}
            currentDocs={currentDocs}
            onPreviewDoc={setPreviewDoc}
            localTimeline={localTimeline}
          />
        </div>
      </div>

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
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
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
              className="max-w-3xl max-h-[85vh] overflow-hidden rounded-[20px] shadow-2xl border border-white/10"
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