import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  Lock,
  Camera,
  Printer,
  Loader2,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { getLoanApplications, updateLoanApplicationStatus } from '../services/loanServices';
import { LoanDetailView } from '../components/forms';
import { LoanDocumentsSidebar } from '../components/forms/LoanDocumentsSidebar';
import { SignatureModal } from '../components/forms/SignatureModal';
import OriginationMobileViewApplications from './OriginationMobileViewApplications';

export default function OriginationViewApplication() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const paramAppId = searchParams.get('id');

  const stateApplication = location.state?.application;
  const stateFormData = location.state?.form_data || stateApplication?.form_data;
  const fromPath = location.state?.from || '/employee/origination/applications';

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
      // If no specific ID, take the most recent application as fallback or the first match
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

  const appId = application?.application_id || formData?.application_id || 'LA-DRAFT';
  const dbId = application?.id || formData?.id;
  const loanType = application?.loan_type || formData?.loan_type || 'Business Loan';
  const appStatus = String(localStatus);
  const isCreated =
    appStatus.toLowerCase() === 'created' ||
    appStatus.toLowerCase() === 'approved' ||
    appStatus.toLowerCase() === 'under_review';

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

  const handlePrint = () => {
    const originalTitle = document.title;
    const documentName =
      appId && appId !== 'LA-DRAFT' ? appId : `${loanType.replace(/\s+/g, '-')}-Application`;
    document.title = documentName;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-slate-500">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600 mb-3" />
        <p className="text-sm font-medium">Loading application details...</p>
      </div>
    );
  }

  if (!application && !isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-slate-500">
        <p className="text-sm font-medium mb-4">No application details found.</p>
        <button
          onClick={() => navigate(fromPath)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Back to Applications List
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View Component (Visible ONLY on Mobile < 768px) */}
      <div className="block md:hidden print:hidden">
        <OriginationMobileViewApplications
          application={application}
          formData={formData}
          fromPath={fromPath}
        />
      </div>

      {/* Desktop View Component (Visible ONLY on Desktop >= 768px, forced in Print) */}
      <div className="hidden md:block print:block w-full max-w-full space-y-6 pb-12 p-4 md:p-6 lg:p-8">
        {/* Top Page Header & Action Buttons (Hidden in Print) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Application
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Lock className="w-3.5 h-3.5 text-blue-600" /> Read-Only Mode
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              View and manage created loan application records, documents, and print copies.
            </p>
          </div>

          {/* Right-aligned action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            {isCreated && !hasTransferred && (
              <button
                type="button"
                onClick={() => setIsDocsOpen(true)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 transition-colors gap-2 shadow-sm cursor-pointer"
              >
                <Camera className="w-4 h-4" /> Upload Photos
              </button>
            )}

            {isCreated && !hasTransferred && isAllUploaded && (
              <button
                type="button"
                onClick={() => setIsSignatureModalOpen(true)}
                disabled={isTransferring}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-4 transition-colors gap-2 shadow-sm cursor-pointer disabled:opacity-70"
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Transferring...
                  </>
                ) : (
                  <>Transfer to Branch Operations</>
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

        {/* Main Loan Application Form Component */}
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
    </>
  );
}
