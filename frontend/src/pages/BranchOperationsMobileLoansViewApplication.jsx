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
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold shrink-0 shadow-2xs bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]">
            <CheckCircle2 size={15} /> Created
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold shrink-0 shadow-2xs bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20">
            <Clock size={15} /> Under Review
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold shrink-0 shadow-2xs bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
            <CheckCircle2 size={15} /> Approved
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold shrink-0 shadow-2xs bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
            <Clock size={15} /> Draft
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold shrink-0 shadow-2xs bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">
            <XCircle size={15} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold shrink-0 shadow-2xs bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
            {status || '—'}
          </span>
        );
    }
  };

  if (!application && isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-[#5f6368]">
        <Loader2 className="animate-spin h-8 w-8 text-[#7C4DFF] mb-3" />
        <p className="text-sm font-medium">Loading application details...</p>
      </div>
    );
  }

  if (!application && !isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-[#5f6368] text-center">
        <p className="text-sm font-medium mb-4">No application details found.</p>
        <button
          onClick={() => navigate(fromPath)}
          className="px-5 py-2 bg-[#7C4DFF] text-white rounded-full text-xs font-semibold hover:bg-[#673AB7] transition-colors shadow-xs cursor-pointer"
        >
          Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-14 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* 1. Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs with Branch Operations Purple/Violet Theme */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#7C4DFF] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-[#9575FF] rounded-full mix-blend-screen filter blur-[40px] opacity-50 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-[#B388FF] rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 px-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">
              Branch Operations &bull; Loan Pipeline
            </p>
            <h2 className="text-3xl font-medium text-white tracking-tight mb-0.5 drop-shadow-sm" style={{ fontWeight: 500 }}>
              Application <span className="font-medium italic text-[#B388FF]">Details</span>
            </h2>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
              Review and Verification
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(fromPath)}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
      </section>

      {/* 2. Elevated Content Layer */}
      <div className="relative z-20 -mt-8 mx-0.5 space-y-4">
        {/* Application Overview & Status Card */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-[#e0e3e7] space-y-4">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#f1f3f4]">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#1f1f1f] tracking-tight font-mono">
                  {appId}
                </span>
                {appId !== 'LA-DRAFT' && (
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] transition-colors cursor-pointer"
                    title="Copy App ID"
                  >
                    <Copy size={13} />
                  </button>
                )}
              </div>
              <p className="text-xs font-semibold text-[#7C4DFF] truncate">{loanType}</p>
            </div>

            {getStatusBadge(appStatus)}
          </div>

          <div className="text-[11px] text-[#5f6368] space-y-1">
            <p>Processed on {formattedDate}</p>
            {branchName && (
              <p className="flex items-center gap-1.5 truncate">
                <Building2 size={12} className="text-[#80868b] shrink-0" />
                <span className="truncate">{branchName}</span>
              </p>
            )}
          </div>

          {/* Action Controls for Edit */}
          <div className="pt-2 border-t border-[#f1f3f4]">
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
              className="w-full inline-flex items-center justify-center rounded-full text-xs font-bold bg-[#7C4DFF] text-white hover:bg-[#673AB7] py-3.5 px-4 transition-all gap-1.5 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <FileEdit size={14} />
              <span>Edit Application</span>
            </button>
          </div>
        </div>

        {/* ━━━ Loan Details Content rendered from LoanDetailView ━━━ */}
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
