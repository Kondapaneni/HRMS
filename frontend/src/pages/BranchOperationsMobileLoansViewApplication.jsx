import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { originationQueryOptions } from '../queries/originationQueries';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  X,
  FileText,
  Copy,
  Building2,
  FileEdit,
  XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
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
  fromPath: propFromPath,
  branchName: propBranchName
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramAppId = searchParams.get('id');

  const stateApplication = propApplication || location.state?.application;
  const stateFormData = propFormData || location.state?.form_data || stateApplication?.form_data;
  const fromPath = propFromPath || location.state?.from || '/employee/branch-operations/loans-applications';

  // Fallback query if page is refreshed or visited with a query parameter/missing state
  const { data: response, isLoading } = useQuery(originationQueryOptions.branchApplications());

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
  const loanType = application?.loan_type || formData?.loan_type || 'Personal Loan';
  const branchName = propBranchName || response?.branch?.name || application?.branch_name || formData?.branch_name || 'Branch Operations';
  const appStatus = String(localStatus);

  const handleCopyId = () => {
    if (!appId || appId === 'LA-DRAFT') return;
    navigator.clipboard.writeText(appId);
    toast.success(`Copied ${appId} to clipboard!`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Created':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 bg-[var(--branch-tint)] text-[var(--branch-deep)] border border-[var(--branch)]/20">
            <CheckCircle2 size={13} /> Created
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] border border-[var(--badge-info-text)]/15">
            <Clock size={13} /> Under Review
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border border-[var(--badge-success-text)]/15">
            <CheckCircle2 size={13} /> Approved
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--badge-warning-text)]/15">
            <Clock size={13} /> Draft
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] border border-[var(--badge-danger-text)]/15">
            <XCircle size={13} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)] border border-[var(--line)]">
            {status || '—'}
          </span>
        );
    }
  };

  if (!application && isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-[var(--muted)]">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--branch-deep)] mb-3" />
        <p className="text-sm font-medium">Loading application details...</p>
      </div>
    );
  }

  if (!application && !isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-[var(--muted)] text-center">
        <p className="text-sm font-medium mb-4 text-[var(--text)]">No application details found.</p>
        <button
          onClick={() => navigate(fromPath)}
          className="px-5 py-2 bg-[var(--ink)] text-white rounded-full text-xs font-semibold hover:bg-[var(--ink)]/90 transition-colors shadow-xs cursor-pointer"
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
            Branch Operations &bull; Loan Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Application <span className="text-[var(--branch-deep)]">Details</span>
            </h2>

            <button
              type="button"
              onClick={() => navigate(fromPath)}
              className="shrink-0 h-9 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} className="text-[var(--muted)]" />
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1">
            Review and Verification
          </p>
        </div>
      </section>

      {/* 2. Content Layer */}
      <div className="relative z-20 space-y-3.5">
        {/* Application Overview & Status Card */}
        <div className="bg-[var(--surface)] p-4.5 rounded-[20px] shadow-xs border border-[var(--line)] space-y-3.5">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-[var(--text)] tracking-tight font-mono">
                  {appId}
                </span>
                {appId !== 'LA-DRAFT' && (
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 rounded-full text-[var(--muted)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                    title="Copy App ID"
                  >
                    <Copy size={13} />
                  </button>
                )}
              </div>
              <p className="text-xs font-medium text-[var(--branch-deep)] truncate">{loanType}</p>
            </div>

            {getStatusBadge(appStatus)}
          </div>

          <div className="text-[11px] text-[var(--muted)] space-y-1">
            <p>Processed on {formattedDate}</p>
            {branchName && (
              <p className="flex items-center gap-1.5 truncate">
                <Building2 size={12} className="text-[var(--muted)] shrink-0" />
                <span className="truncate">{branchName}</span>
              </p>
            )}
          </div>

          {/* Action Controls for Edit */}
          <div className="pt-2 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={() => {
                navigate('/employee/branch-operations/loans-edit-application', {
                  state: {
                    application,
                    form_data: formData,
                    loan_type: loanType,
                    from: `/employee/branch-operations/loans-view-applications?id=${encodeURIComponent(appId)}`
                  }
                });
              }}
              className="w-full inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[var(--ink)] text-white hover:bg-[var(--ink)]/90 py-3 px-4 transition-all gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <FileEdit size={14} />
              <span>Edit Application</span>
            </button>
          </div>
        </div>

        {/* ━━━ Loan Details Content rendered from LoanDetailView ━━━ */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] overflow-hidden">
          <LoanDetailView
            formData={formData || {}}
            application={application || {}}
            currentDocs={currentDocs}
            onPreviewDoc={setPreviewDoc}
            localTimeline={localTimeline}
          />
        </div>
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

export { BranchOperationsMobileLoansViewApplication };
