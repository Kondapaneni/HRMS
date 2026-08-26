import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BusinessLoanForm, PersonalLoanForm } from '../components/forms';
import { ArrowLeft, Lock } from 'lucide-react';
import BranchOperationsMobileLoansEditApplication from './BranchOperationsMobileLoansEditApplication';

export default function BranchOperationsLoansEditApplication() {
  const location = useLocation();
  const navigate = useNavigate();
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
        <BranchOperationsMobileLoansEditApplication />
      </div>

      {/* Web Desktop View (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-3 w-full max-w-full">
        {/* Page Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C4DFF]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                Branch Operations Hub
              </span>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight">
                {loanType} Application
              </h1>
              <span className="text-xs font-semibold text-[#7C4DFF] bg-[#7C4DFF]/10 border border-[#7C4DFF]/20 px-2.5 py-0.5 rounded-full">
                Edit Mode
              </span>
              <span className="text-xs font-mono font-bold text-[#5f6368] bg-[#f8fafd] border border-[#dadce0] px-2.5 py-0.5 rounded-full">
                {appId}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-1">
              Update and verify applicant, address, enterprise, and guarantor details for this branch loan application.
            </p>
          </div>

          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-4 py-2 transition-all gap-1.5 shadow-2xs cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[#5f6368]" />
            <span>Back to Application</span>
          </button>
        </div>

        {/* Form Container */}
        <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-xs border border-[#e0e3e7]">
          {renderForm()}
        </div>
      </div>
    </>
  );
}
