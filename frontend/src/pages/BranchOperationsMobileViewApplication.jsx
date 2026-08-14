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
  Building2,
  Printer
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { getBranchLoanApplications } from '../services/branchOperationsServices';
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

export default function BranchOperationsMobileViewApplication({
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
  const fromPath = propFromPath || location.state?.from || '/employee/branch-operations/applications';

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

  const formattedDate =
    formatDateSafe(application?.created_at || application?.updated_at) ||
    format(new Date(), 'dd MMM yyyy');
  const appId = application?.application_id || formData?.application_id || 'LA-PENDING';
  const loanType = application?.loan_type || formData?.loan_type || 'Personal Loan';
  const appStatus = String(localStatus);
  const isCreated =
    appStatus.toLowerCase() === 'created' ||
    appStatus.toLowerCase() === 'approved' ||
    appStatus.toLowerCase() === 'under_review';
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-slate-500 text-center">
        <p className="text-sm font-medium mb-4">No application details found.</p>
        <button
          onClick={() => navigate(fromPath)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div className="w-full pb-8">
      {/* ━━━ Hero Header — matching Origination Module Mobile Design ━━━ */}
      <section className="relative px-6 pt-12 pb-24 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => navigate(fromPath)}
            className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 border border-white/20 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-indigo-200 text-[10px] font-bold uppercase tracking-wider mb-1 backdrop-blur-md">
              <Building2 size={10} className="text-indigo-300" />
              <span>{branchName}</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-sm">
              Application Details
            </h2>
          </div>
          <div className="w-10 h-10" />
        </div>
      </section>

      {/* ━━━ Mobile Content Cards ━━━ */}
      <div className="relative z-20 -mt-12 px-4 space-y-4">
        {/* Application Overview & Status Card */}
        <div className="bg-white p-5 rounded-[24px] shadow-lg border border-slate-100/80">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-slate-900 tracking-tight font-sans">
              {appId}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${
                appStatus === 'Created' || appStatus === 'Approved'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : appStatus === 'Under Review'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : appStatus === 'Rejected'
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
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
          <p className="text-xs font-semibold text-slate-500">{loanType}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
            Processed on {formattedDate}
          </p>

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl py-3 px-4 font-bold text-sm shadow-md shadow-slate-900/10 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <Printer size={16} /> Print Application Form
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

        {/* ━━━ Bottom Back Button ━━━ */}
        <div className="flex justify-center pt-2 pb-2">
          <button
            type="button"
            onClick={() => navigate(fromPath)}
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-slate-900 text-white h-11 px-6 transition-colors gap-2 shadow-sm cursor-pointer active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Applications
          </button>
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
