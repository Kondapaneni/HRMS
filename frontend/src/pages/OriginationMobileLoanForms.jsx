import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BusinessLoanForm, PersonalLoanForm } from '../components/forms';

const OriginationMobileLoanForms = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from || '/employee/loans/origination/applications';
  const loanType = location.state?.loan_type || location.state?.loanType || location.state?.application?.loan_type || 'Business Loan';
  const application = location.state?.application;

  const isDraft = Boolean(
    location.state?.application?.status === 'Draft' || 
    location.state?.status === 'Draft'
  );
  const isEditMode = Boolean(
    (location.state?.mode === 'edit' || location.state?.isEdit) && !isDraft
  );

  const handleBack = () => {
    if (fromPath.includes('view-application') && application) {
      const viewId = application.application_id || application.id;
      navigate(`/employee/loans/view-application?id=${encodeURIComponent(viewId)}`, {
        state: {
          application,
          form_data: application.form_data,
          from: '/employee/loans/origination/applications'
        }
      });
    } else {
      navigate(fromPath);
    }
  };

  const renderForm = () => {
    switch (loanType) {
      case 'Personal Loan':
        return (
          <PersonalLoanForm 
            application={application} 
            isEditMode={isEditMode} 
          />
        );
      case 'Business Loan':
        return (
          <BusinessLoanForm 
            application={application} 
            isEditMode={isEditMode} 
          />
        );
      default:
        return (
          <div className="p-8 text-center text-xs text-[#5f6368] font-medium bg-[#f8fafd] rounded-2xl border border-[#e0e3e7]">
            Invalid or Unsupported Loan Type Selected.
          </div>
        );
    }
  };

  return (
    <div className="space-y-4 pb-14 w-full">
      {/* 1. Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs with Loans Origination Blue & Indigo Theme */}
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
          className="absolute bottom-0 left-20 w-80 h-80 bg-sky-400 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 px-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">
              Origination &bull; Loan Pipeline
            </p>
            <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
              {loanType}
            </h2>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
              {isDraft ? 'Draft Application Form' : isEditMode ? 'Edit Application Form' : 'New Loan Application'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
      </section>

      {/* 2. Elevated Form Container Layer */}
      <div className="relative z-20 -mt-8 mx-0.5 space-y-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-[#e0e3e7]">
          {renderForm()}
        </div>
      </div>
    </div>
  );
};

export { OriginationMobileLoanForms as OriginationMobileBusinessLoan };
export default OriginationMobileLoanForms;
