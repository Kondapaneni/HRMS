import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BusinessLoanForm, PersonalLoanForm } from '../components/forms';
import { ArrowLeft } from 'lucide-react';
import OriginationMobileLoanForms from './OriginationMobileLoanForms';

export default function OriginationLoanForms() {
  const location = useLocation();
  const navigate = useNavigate();
  const fromPath = location.state?.from || '/employee/loans/origination/applications';
  const loanType = location.state?.loan_type || location.state?.loanType || location.state?.application?.loan_type || 'Business Loan';

  const isEditMode = Boolean(
    location.state?.mode === 'edit' || 
    location.state?.isEdit || 
    location.state?.application?.status === 'Draft'
  );

  const application = location.state?.application;

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
          <div className="p-12 text-center text-xs text-[#5f6368] font-medium bg-[#f8fafd] rounded-2xl border border-[#e0e3e7]">
            Invalid or Unsupported Loan Type Selected.
          </div>
        );
    }
  };

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <OriginationMobileLoanForms />
      </div>

      {/* Web Desktop View (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-3 w-full max-w-full">
        {/* Page Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Origination Loans Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2.5">
              {loanType} Application
              <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">
                {isEditMode ? 'Edit Mode' : 'Application Studio'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Fill in the verified applicant, residential, business enterprise, and guarantor details to submit or draft the loan application.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(fromPath)}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-4 py-2 transition-all gap-1.5 shadow-2xs cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[#5f6368]" />
            <span>Back to {fromPath.includes('members') ? 'Members' : 'Applications'}</span>
          </button>
        </div>

        {/* Form Container */}
        <div>
          {renderForm()}
        </div>
      </div>
    </>
  );
}

export { OriginationLoanForms as OriginationBusinessLoan };
