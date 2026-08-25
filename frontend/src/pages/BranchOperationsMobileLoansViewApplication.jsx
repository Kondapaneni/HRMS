import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  X,
  FileText,
  Edit3,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { getBranchLoanApplications } from '../services/loanServices';
import { LoanDetailView } from '../components/forms';

const formatDateSafe = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : format(d, 'dd MMM yyyy, hh:mm a');
  } catch {
    return null;
  }
};

export default function BranchOperationsMobileLoansViewApplication({
  application: propApplication,
  formData: propFormData,
  fromPath: propFromPath
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramAppId = searchParams.get('id');

  const stateApplication = propApplication || location.state?.application;
  const stateFormData = propFormData || location.state?.form_data || stateApplication?.form_data;
  const fromPath = propFromPath || location.state?.from || '/employee/branch-operations/loans-applications';

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

  const formattedDate =
    formatDateSafe(application?.created_at || application?.updated_at) ||
    format(new Date(), 'dd MMM yyyy');
  const appId = application?.application_id || formData?.application_id || 'LA-PENDING';
  const loanType = application?.loan_type || formData?.loan_type || 'Personal Loan';
  const appStatus = String(localStatus);
  const branchName = response?.branch?.name || application?.branch_name || 'Branch Operations';

  const timelineEvents = application?.stage_history || formData?.timeline || application?.form_data?.timeline || [];
  const hasBranchOpsStage = 
    timelineEvents.some(e => e.stage === 'Branch Operations' || e.action?.includes('Branch Operations')) ||
    application?.stage === 'Branch Operations' ||
    formData?.stage === 'Branch Operations' ||
    ['Under Review', 'Created'].includes(localStatus);

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-[#5f6368] text-center">
        <p className="text-sm font-medium mb-4">No application details found.</p>
        <button
          onClick={() => navigate(fromPath)}
          className="px-5 py-2 bg-[#1a73e8] text-white rounded-full text-xs font-semibold hover:bg-[#1557b0] transition-colors shadow-xs cursor-pointer"
        >
          Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-12">
      {/* 1. Header Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5">
                Branch Operations
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              Application Details
            </h1>
            <p className="text-xs text-[#5f6368] flex items-center gap-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2 py-0.5 rounded-full">
                <Building2 size={11} /> {branchName}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(fromPath)}
            className="w-9 h-9 rounded-full bg-white border border-[#dadce0] text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Overview & Status Card */}
      <div className="bg-white p-4.5 rounded-2xl shadow-xs border border-[#e0e3e7]">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full border border-[#d2e3fc]">
                {appId}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                  appStatus === 'Created' || appStatus === 'Approved'
                    ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
                    : appStatus === 'Under Review'
                    ? 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]'
                    : appStatus === 'Rejected'
                    ? 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]'
                    : 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]'
                }`}
              >
                {appStatus === 'Created' || appStatus === 'Approved' ? (
                  <CheckCircle2 size={10} />
                ) : (
                  <Clock size={10} />
                )}{' '}
                {appStatus}
              </span>
            </div>
            <p className="text-xs font-semibold text-[#1f1f1f] pt-0.5">{loanType}</p>
            <p className="text-[11px] text-[#5f6368]">
              Processed on {formattedDate}
            </p>
          </div>

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
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#1a73e8] text-white hover:bg-[#1557b0] active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>
      </div>

      {/* 3. Loan Details Content rendered from LoanDetailView */}
      <LoanDetailView
        formData={formData || {}}
        application={application || {}}
        currentDocs={currentDocs}
        onPreviewDoc={setPreviewDoc}
      />

      {/* 4. Bottom Navigation Button */}
      <div className="flex justify-center pt-2 pb-4">
        <button
          type="button"
          onClick={() => navigate(fromPath)}
          className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#444746] border border-[#dadce0] hover:bg-[#f1f3f4] h-10 px-6 transition-all gap-2 shadow-2xs cursor-pointer active:scale-98"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Applications
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
  );
}
