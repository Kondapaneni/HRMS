import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Camera,
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
import { LoanDocumentsSidebar } from '../components/forms/LoanDocumentsSidebar';

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

  const [isDocsOpen, setIsDocsOpen] = useState(false);
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
  const applicantName = formData?.applicant_name || formData?.name || application?.applicant_name || 'N/A';
  const applicantPhone = formData?.phone_number || formData?.phone || application?.phone_number || 'N/A';
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
          Back to Applications List
        </button>
      </div>
    );
  }

  return (
    <div className="w-full pb-8">
      {/* Animated Hero Header */}
      <section className="relative px-6 pt-12 pb-24 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />

        {/* Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => navigate(fromPath)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-indigo-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              <Building2 size={12} className="text-indigo-300" />
              <span>{branchName}</span>
            </div>
          </div>

          <span className="text-[11px] font-bold text-blue-300 bg-blue-900/60 px-2.5 py-0.5 rounded-full border border-blue-400/30 uppercase tracking-wider">
            {appId}
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-2 mb-0.5 drop-shadow-sm truncate">
            {applicantName}
          </h2>
          <p className="text-xs font-medium text-slate-200 drop-shadow-sm opacity-90">
            {loanType} • {applicantPhone}
          </p>
        </div>
      </section>

      {/* Main Content Form - Render LoanDetailView */}
      <div className="relative z-20 -mt-16 px-4 space-y-4">
        {/* Floating Quick Action Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsDocsOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Camera size={14} /> Photos
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer size={14} /> Print
          </button>
        </div>

        {/* Loan Details View */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <LoanDetailView
            formData={formData || {}}
            application={application || {}}
            currentDocs={currentDocs}
            onPreviewDoc={setPreviewDoc}
            localTimeline={localTimeline}
          />
        </div>

        {/* Back Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate(fromPath)}
            className="w-full inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 h-12 px-6 transition-all gap-2 shadow-sm cursor-pointer active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Applications
          </button>
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
