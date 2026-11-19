import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useRemoteData } from '../state/remote.js';
import { createPortal } from 'react-dom';
import {
  Lock,
  Printer,
  Loader2,
  X,
  ArrowLeft,
  Briefcase,
  Building2,
  User,
  Phone,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Copy,
  FileEdit,
  Clock,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getBranchLoanApplications, getBranches } from '../services/loanServices';
import { preloadAndDecodeImages } from '../utils/imageCompressor';
import { LoanDetailView } from '../components/forms';
import BranchOperationsMobileLoansViewApplication from './BranchOperationsMobileLoansViewApplication';
import { maskPhoneNumber } from '../utils/phoneUtils';

// Helper: Safe date formatter
const formatDateSafe = (dateStr, formatPattern = 'MMM d, yyyy') => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : format(d, formatPattern);
  } catch (e) {
    return '—';
  }
};

export default function BranchOperationsLoansViewApplication() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramAppId = searchParams.get('id');

  const stateApplication = location.state?.application;
  const stateFormData = location.state?.form_data || stateApplication?.form_data;
  const fromPath = location.state?.from || '/employee/branch-operations/loans-applications';

  // Fallback query if page is refreshed or visited with a query parameter/missing state
  const { data: response, isLoading } = useRemoteData({
    scope: ['branchOperations', 'applications', 'list'],
    load: getBranchLoanApplications,
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

  const [isPrinting, setIsPrinting] = useState(false);
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

  const appId = application?.application_id || formData?.application_id || 'LA-DRAFT';
  const dbId = application?.id || formData?.id;
  const loanType = application?.loan_type || formData?.loan_type || 'Personal Loan';
  const appStatus = String(localStatus);

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const docKeys = [
        'applicant_photo',
        'co_applicant_photo',
        'guarantor_1_photo',
        'guarantor_2_photo',
        'guarantor_3_photo'
      ];
      const urls = docKeys
        .map((k) => {
          const doc = currentDocs?.[k];
          if (!doc) return null;
          return typeof doc === 'object' ? (doc.url || doc.proxy_url) : doc;
        })
        .filter(Boolean);

      if (urls.length > 0) {
        await preloadAndDecodeImages(urls, 1200);
      }

      const originalTitle = document.title;
      const documentName =
        appId && appId !== 'LA-DRAFT' ? appId : `${loanType.replace(/\s+/g, '-')}-Application`;
      document.title = documentName;
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    } catch (e) {
      console.warn('Print preparation error:', e);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCopyId = () => {
    if (appId) {
      navigator.clipboard.writeText(appId);
      toast.success(`Copied Application ID: ${appId}`);
    }
  };

  // Fetch all company branches to map branch IDs to human-readable names
  const { data: branches = [] } = useRemoteData({
    scope: ['branches', 'list'],
    load: getBranches,
  });

  const branchMap = useMemo(() => {
    const map = {};
    if (Array.isArray(branches)) {
      branches.forEach((b) => {
        if (b && b.id && b.name) {
          map[String(b.id).toLowerCase()] = b.name;
        }
      });
    }
    return map;
  }, [branches]);

  if (!application && isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-[var(--muted)]">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--branch-deep)] mb-3" />
        <p className="text-xs font-semibold">Loading application details...</p>
      </div>
    );
  }

  if (!application && !isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-[var(--muted)]">
        <p className="text-sm font-semibold mb-4 text-[var(--text)]">No application details found.</p>
        <button
          onClick={() => navigate(fromPath)}
          className="px-5 py-2.5 bg-[var(--ink)] text-white rounded-full text-xs font-semibold hover:bg-[var(--ink)]/90 transition-colors cursor-pointer shadow-xs"
        >
          Back to Applications List
        </button>
      </div>
    );
  }

  const applicantName = formData?.applicant_name || application?.applicant_name || 'Unnamed Applicant';
  const applicantPhone = formData?.phone_number || application?.phone_number || '';
  
  // Resolve friendly branch name from branches table or application data
  const rawBranch = String(application?.branch || formData?.branch || '').trim();
  const branchName =
    response?.branch?.name ||
    application?.branch_name ||
    formData?.branch_name ||
    branchMap[rawBranch.toLowerCase()] ||
    (rawBranch && !/^[0-9a-fA-F-]{32,36}$/.test(rawBranch) ? rawBranch : null) ||
    'Corporate Office';

  return (
    <>
      {/* Mobile View Component (Visible ONLY on Mobile < 768px) */}
      <div className="block md:hidden print:hidden">
        <BranchOperationsMobileLoansViewApplication
          application={application}
          formData={formData}
          fromPath={fromPath}
          branchName={branchName}
        />
      </div>

      {/* Desktop View Component (Visible ONLY on Desktop >= 768px, forced in Print) */}
      <div className="hidden md:block print:block w-full max-w-full space-y-6 pb-16 font-sans antialiased text-[var(--text)]">
        {/* Top Header Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Branch Operations Hub</span>
            </div>
            
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight whitespace-nowrap">
                {loanType} Application
              </h1>

              <span className="text-xs font-mono font-medium text-[var(--branch-deep)] bg-[var(--branch-tint)] px-2.5 py-0.5 rounded-full">
                {appId}
              </span>

              {/* Read Only Indicator */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-alt)] text-[var(--muted)] border border-[var(--line)] whitespace-nowrap">
                <Lock size={12} className="text-[var(--muted)]" /> Read-Only
              </span>
            </div>

            <p className="text-xs text-[var(--muted)] mt-1">
              Inspect applicant verified profile, documents, and track branch operations review lifecycle.
            </p>
          </div>

          {/* Top Right Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigate(fromPath)}
              className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] px-4 py-2 transition-all gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--muted)]" />
              <span>Back to Applications</span>
            </button>

            {/* Edit Application */}
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
              className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[var(--branch-tint)] text-[var(--branch-deep)] hover:opacity-90 border border-[var(--branch)]/20 px-4 py-2 transition-all gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileEdit className="w-4 h-4" />
              <span>Edit Application</span>
            </button>

            {/* Print Form Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white px-4 py-2 transition-all gap-1.5 shadow-xs cursor-pointer disabled:opacity-75 whitespace-nowrap shrink-0"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Preparing Print...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Print Application</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Loan Application Detail Paper View Component */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs overflow-hidden">
          <LoanDetailView
            formData={formData || {}}
            application={application || {}}
            currentDocs={currentDocs}
            onPreviewDoc={setPreviewDoc}
            localTimeline={localTimeline}
          />
        </div>

        {/* Fullscreen Photo Lightbox Preview Portal */}
        {previewDoc &&
          createPortal(
            <div
              className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
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
