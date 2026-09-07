import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BusinessLoanForm, PersonalLoanForm } from '../components/forms';

const BranchOperationsMobileLoansEditApplication = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const application = location.state?.application || {};
  const fromPath = location.state?.from || '/employee/branch-operations/loans-view-applications';
  const loanType = location.state?.loan_type || application?.loan_type || application?.form_data?.loan_type || 'Personal Loan';
  const appId = application?.application_id || application?.id || 'LA-DRAFT';

  const handleBack = () => {
    if (fromPath.includes('loans-view-applications') && application) {
      const viewId = application.application_id || application.id;
      navigate(`/employee/branch-operations/loans-view-applications?id=${encodeURIComponent(viewId)}`, {
        state: {
          application,
          form_data: application.form_data,
          from: '/employee/branch-operations/loans-applications'
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
            isEditMode={true} 
          />
        );
      case 'Business Loan':
        return (
          <BusinessLoanForm 
            application={application} 
            isEditMode={true} 
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
            Branch Operations &bull; Loan Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight leading-tight min-w-0" style={{ fontWeight: 500 }}>
              {loanType} <span className="font-medium italic text-[#7C4DFF]">Form</span>
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
            Edit Application Form &bull; {appId}
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

export default BranchOperationsMobileLoansEditApplication;
