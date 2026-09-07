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
    <div className="space-y-4 pb-14 w-full font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Clean White Header & Back Action */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">
            Origination &bull; Loan Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight leading-tight min-w-0" style={{ fontWeight: 500 }}>
              {loanType} <span className="font-medium italic text-[#1a73e8]">Form</span>
            </h2>

            <button
              type="button"
              onClick={handleBack}
              className="shrink-0 h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} className="text-[#5f6368]" />
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#5f6368] mt-1">
            {isDraft ? 'Draft Application Form' : isEditMode ? 'Edit Application Form' : 'New Loan Application'}
          </p>
        </div>
      </section>

      {/* 2. Form Container Layer */}
      <div className="relative z-20 mx-0.5 space-y-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-[#e0e3e7]">
          {renderForm()}
        </div>
      </div>
    </div>
  );
};

export { OriginationMobileLoanForms as OriginationMobileBusinessLoan };
export default OriginationMobileLoanForms;
