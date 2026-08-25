import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BusinessLoanForm, PersonalLoanForm } from '../components/forms';
import { Edit3, ArrowLeft, ShieldAlert } from 'lucide-react';
import BranchOperationsMobileLoansEditApplication from './BranchOperationsMobileLoansEditApplication';

export default function BranchOperationsLoansEditApplication() {
  const location = useLocation();
  const navigate = useNavigate();
  const application = location.state?.application || {};
  const fromPath = location.state?.from || '/employee/branch-operations/loans-view-applications';
  const loanType = location.state?.loan_type || application?.loan_type || application?.form_data?.loan_type || 'Personal Loan';
  const appId = application?.application_id || application?.id || 'Application';

  const renderForm = () => {
    switch (loanType) {
      case 'Personal Loan':
        return <PersonalLoanForm isEditMode={true} application={application} />;
      case 'Business Loan':
        return <BusinessLoanForm isEditMode={true} application={application} />;
      default:
        return (
          <div className="p-8 text-center text-[#5f6368] font-medium">
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

      {/* Desktop View (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 w-full max-w-full pb-16">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                Branch Operations Hub
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              Edit Application
              <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">
                {appId}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Edit {loanType} Application &bull; Update details or correct mistakes in the application.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(fromPath, { state: { application, id: application?.id } })}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#444746] hover:bg-[#f1f3f4] border border-[#dadce0] h-9 px-4 transition-all gap-1.5 shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to View Application
          </button>
        </div>

        {/* Main Full Width Form Card */}
        <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#f1f3f4] flex items-center justify-between bg-[#f8fafd]/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1f1f1f]">
                  {loanType} Form Data
                </h3>
                <p className="text-xs text-[#5f6368]">
                  Applicant &amp; Loan Details
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#b06000] bg-[#fef7e0] border border-[#feefc3] px-3.5 py-1.5 rounded-full">
              <ShieldAlert className="w-4 h-4" />
              Edits will update application fields and log editor information
            </div>
          </div>

          <div className="p-6">
            {renderForm()}
          </div>
        </div>
      </div>
    </>
  );
}
