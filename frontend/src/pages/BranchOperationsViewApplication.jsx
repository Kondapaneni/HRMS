import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  Lock,
  Printer,
  ArrowLeft,
  Loader2,
  X,
  Building2
} from 'lucide-react';
import { getBranchLoanApplications } from '../services/branchOperationsServices';
import { LoanDetailView } from '../components/forms';
import BranchOperationsMobileViewApplication from './BranchOperationsMobileViewApplication';

export default function BranchOperationsViewApplication() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramAppId = searchParams.get('id');

  const stateApplication = location.state?.application;
  const stateFormData = location.state?.form_data || stateApplication?.form_data;
  const fromPath = location.state?.from || '/employee/branch-operations/applications';

  // Fallback query if page is refreshed or visited with a query parameter/missing state
  const { data: response, isLoading } = useQuery({
    queryKey: ['branchOperations', 'applications', 'list'],
    queryFn: getBranchLoanApplications,
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

  const [previewDoc, setPreviewDoc] = useState(null);

  const [currentDocs, setCurrentDocs] = useState(
    formData?.documents || application?.documents || application?.form_data?.documents || {}
  );
  const [localStatus, setLocalStatus] = useState(
    application?.status || formData?.status || 'Under Review'
  );
  const [localTimeline, setLocalTimeline] = useState(
    formData?.timeline || application?.form_data?.timeline || []
  );

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

  const appId = application?.application_id || formData?.application_id || 'LA-PENDING';
  const loanType = application?.loan_type || formData?.loan_type || 'Personal Loan';
  const branchName = response?.branch?.name || application?.branch_name || 'Branch Operations';

  const handlePrint = () => {
    const originalTitle = document.title;
    const documentName = appId && appId !== 'LA-PENDING' ? appId : `${loanType.replace(/\s+/g, '-')}-Application`;
    document.title = documentName;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
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
        <BranchOperationsMobileViewApplication
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
                Application Details
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                {branchName}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Lock className="w-3.5 h-3.5 text-blue-600" /> Read-Only Mode
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              View complete loan application details, applicant information, documents, and stage history.
            </p>
          </div>

          {/* Right-aligned action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 h-10 px-4 transition-colors gap-2 shadow-sm cursor-pointer"
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

        {/* Bottom Back to Applications List Button (Hidden in Print) */}
        <div className="flex justify-center pt-2 print:hidden">
          <button
            type="button"
            onClick={() => navigate(fromPath)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 h-10 px-6 transition-colors gap-2 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Applications List
          </button>
        </div>

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
