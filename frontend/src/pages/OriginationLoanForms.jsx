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

  const isDraft = Boolean(
    location.state?.application?.status === 'Draft' || 
    location.state?.status === 'Draft'
  );
  const isEditMode = Boolean(
    (location.state?.mode === 'edit' || location.state?.isEdit) && !isDraft
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
          <div className="p-12 text-center text-xs text-[var(--muted)] font-medium bg-[var(--surface-alt)] rounded-[20px] border border-[var(--line)]">
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

      {/* Web Desktop View */}
      <div className="hidden md:block space-y-6 pb-3 w-full max-w-full font-sans text-[var(--text)]">
        {/* Page Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Origination Loans Workspace
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2.5">
              <span>{loanType} Application</span>
              <span className="text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-full">
                {isDraft ? 'Draft Application' : isEditMode ? 'Edit Mode' : 'Application Studio'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
              Fill in the verified applicant, residential, business enterprise, and guarantor details to submit or draft the loan application.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
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
            }}
            className="inline-flex items-center justify-center rounded-full-[12px] text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] px-4 py-2 transition-all gap-1.5 shadow-2xs cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--icon-muted)]" />
            <span>Back to {fromPath.includes('members') ? 'Members' : (isEditMode || fromPath.includes('view-application')) ? 'Application' : 'Applications'}</span>
          </button>
        </div>

        {/* Form Container */}
        <div className="bg-[var(--surface)] p-6 lg:p-8 rounded-[24px] shadow-xs border border-[var(--line)]">
          {renderForm()}
        </div>
      </div>
    </>
  );
}

export { OriginationLoanForms as OriginationBusinessLoan };