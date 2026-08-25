import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  Lock,
  Printer,
  Loader2,
  X,
  Building2,
  Edit3,
  ArrowLeft
} from 'lucide-react';
import { getBranchLoanApplications } from '../services/loanServices';
import { preloadAndDecodeImages } from '../utils/imageCompressor';
import { LoanDetailView } from '../components/forms';
import BranchOperationsMobileLoansViewApplication from './BranchOperationsMobileLoansViewApplication';

export default function BranchOperationsLoansViewApplication() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramAppId = searchParams.get('id');

  const stateApplication = location.state?.application;
  const stateFormData = location.state?.form_data || stateApplication?.form_data;
  const fromPath = location.state?.from || '/employee/branch-operations/loans-applications';
  const targetId = stateApplication?.id || stateApplication?.application_id || paramAppId;

  // Query fresh applications list from server
  const { data: response, isLoading } = useQuery({
    queryKey: ['branchOperations', 'applications', 'list'],
    queryFn: getBranchLoanApplications,
  });

  // Pick freshest data from query response if available, fallback to router state
  let application = stateApplication;
  let formData = stateFormData;

  if (response?.applications) {
    const found = response.applications.find(
      (a) => String(a.id) === String(targetId) || String(a.application_id) === String(targetId)
    );
    if (found) {
      application = found;
      formData = found.form_data;
    } else if (!application && response.applications.length > 0) {
      application = response.applications[0];
      formData = application.form_data;
    }
  }

  const [previewDoc, setPreviewDoc] = useState(null);

  const [currentDocs, setCurrentDocs] = useState(
    formData?.documents || application?.documents || application?.form_data?.documents || {}
  );
  const [localStatus, setLocalStatus] = useState(
    application?.status || formData?.status || 'Under Review'
  );

  useEffect(() => {
    if (application) {
      if (application.status) setLocalStatus(application.status);
      const docs = formData?.documents || application.documents || application.form_data?.documents || {};
      setCurrentDocs(docs);
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

  const appId = application?.application_id || formData?.application_id || 'LA-PENDING';
  const loanType = application?.loan_type || formData?.loan_type || 'Personal Loan';
  const branchName = response?.branch?.name || application?.branch_name || 'Branch Operations';

  const timelineEvents = application?.stage_history || formData?.timeline || application?.form_data?.timeline || [];
  const hasBranchOpsStage = 
    timelineEvents.some(e => e.stage === 'Branch Operations' || e.action?.includes('Branch Operations')) ||
    application?.stage === 'Branch Operations' ||
    formData?.stage === 'Branch Operations' ||
    ['Under Review', 'Created'].includes(localStatus);

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const docKeys = ['applicant_photo', 'co_applicant_photo', 'guarantor_1_photo', 'guarantor_2_photo', 'guarantor_3_photo'];
      const urls = docKeys
        .map((k) => {
          const doc = currentDocs?.[k];
          if (!doc) return null;
          return typeof doc === 'string' ? doc : doc.url;
        })
        .filter(Boolean);

      if (urls.length > 0) {
        await preloadAndDecodeImages(urls);
      }
      window.print();
    } catch (e) {
      console.error('Print preparation error:', e);
      window.print();
    } finally {
      setIsPrinting(false);
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-[#5f6368]">
        <p className="text-sm font-medium mb-4">No application details found.</p>
        <button
          onClick={() => navigate(fromPath)}
          className="px-5 py-2 bg-[#1a73e8] text-white rounded-full text-xs font-semibold hover:bg-[#1557b0] transition-colors cursor-pointer"
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
        <BranchOperationsMobileLoansViewApplication
          application={application}
          formData={formData}
          fromPath={fromPath}
        />
      </div>

      {/* Desktop View Component (Visible ONLY on Desktop >= 768px, forced in Print) */}
      <div className="hidden md:block print:block w-full max-w-full space-y-6 pb-16">
        {/* Top Page Header & Action Buttons (Hidden in Print) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                Branch Operations Hub
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              Application Details
              <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">
                {appId}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              View complete loan application details, applicant information, documents, and stage history.
            </p>
          </div>

          {/* Right-aligned action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate(fromPath)}
              className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#444746] border border-[#dadce0] hover:bg-[#f1f3f4] h-9 px-4 transition-all gap-1.5 shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            {hasBranchOpsStage && (
              <button
                type="button"
                onClick={() => navigate('/employee/branch-operations/loans-edit-application', {
                  state: {
                    application,
                    form_data: formData,
                    loan_type: loanType,
                    from: '/employee/branch-operations/loans-view-applications'
                  }
                })}
                className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[#1a73e8] text-white hover:bg-[#1557b0] h-9 px-4 transition-all gap-1.5 shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Application
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1a73e8] border border-[#dadce0] hover:bg-[#e8f0fe] h-9 px-4 transition-all gap-1.5 shadow-2xs cursor-pointer disabled:opacity-75"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing Print...
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" /> Print Application Form
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Loan Application Form Component */}
        <LoanDetailView
          formData={formData || {}}
          application={application || {}}
          currentDocs={currentDocs}
          onPreviewDoc={setPreviewDoc}
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
      </div>
    </>
  );
}
