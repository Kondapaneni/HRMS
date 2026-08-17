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
          <div className="p-8 text-center text-slate-500 font-medium">
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

      {/* Desktop View */}
      <div className="hidden md:block p-4 md:p-6 lg:p-8 space-y-6 w-full max-w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Edit3 className="w-3.5 h-3.5" /> Branch Operations Edit Mode
              </span>
              <span className="text-xs font-semibold text-slate-500">
                ID: {appId}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Edit {loanType} Application
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Update details or correct mistakes in the application. Any changes made will be automatically tracked in the audit trail.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(fromPath, { state: { application, id: application?.id } })}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 h-10 px-4 transition-colors gap-2 shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to View Application
          </button>
        </div>

        {/* Main Full Width Form Card */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {loanType} Form Data
                </h3>
                <p className="text-xs text-slate-500">
                  Applicant &amp; Loan Details
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md">
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
