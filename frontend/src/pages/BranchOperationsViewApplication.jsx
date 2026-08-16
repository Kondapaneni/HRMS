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
  Edit3
} from 'lucide-react';
import { getBranchLoanApplications } from '../services/loanServices';
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
  const [localTimeline, setLocalTimeline] = useState([]);

  useEffect(() => {
    if (application) {
      if (application.status) setLocalStatus(application.status);
      const docs = formData?.documents || application.documents || application.form_data?.documents || {};
      setCurrentDocs(docs);

      const baseTimeline = formData?.timeline || application.form_data?.timeline || application.stage_history || [];
      const auditLogsAsEvents = (application.audit_logs || []).map((al) => ({
        stage: 'Application Updated',
        action: 'Application Details Modified',
        timestamp: al.created_at,
        editor_name: al.editor_name,
        changes: al.changes,
        changes_count: al.changes_count
      }));

      const combined = [...baseTimeline, ...auditLogsAsEvents].sort((a, b) => {
        return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
      });
      setLocalTimeline(combined);
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

  const hasBranchOpsStage = 
    localTimeline.some(e => e.stage === 'Branch Operations' || e.action?.includes('Branch Operations')) ||
    application?.stage === 'Branch Operations' ||
    formData?.stage === 'Branch Operations' ||
    ['Under Review', 'Created'].includes(localStatus);

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
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              View complete loan application details, applicant information, documents, and stage history.
            </p>
          </div>

          {/* Right-aligned action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            {hasBranchOpsStage && (
              <button
                type="button"
                onClick={() => navigate('/employee/branch-operations/edit-application', {
                  state: {
                    application,
                    form_data: formData,
                    loan_type: loanType,
                    from: '/employee/branch-operations/view-application'
                  }
                })}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 transition-colors gap-2 shadow-sm cursor-pointer"
              >
                <Edit3 className="w-4 h-4" /> Edit Application
              </button>
            )}
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
