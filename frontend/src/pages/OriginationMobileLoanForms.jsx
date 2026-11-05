import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
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
          <div className="p-8 text-center text-xs text-[var(--muted)] font-medium bg-[var(--surface-alt)] rounded-[16px] border border-[var(--line)]">
            Invalid or Unsupported Loan Type Selected.
          </div>
        );
    }
  };

  return (
    <div className="space-y-4 pb-14 w-full font-sans antialiased text-[var(--text)]">
      {/* Header & Back Action */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Origination &bull; Loan Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              {loanType} <span className="text-[var(--brand-deep)]">Form</span>
            </h2>

            <button
              type="button"
              onClick={handleBack}
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 rounded-[12px] text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} className="text-[var(--icon-muted)]" />
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1">
            {isDraft ? 'Draft Application Form' : isEditMode ? 'Edit Application Form' : 'New Loan Application'}
          </p>
        </div>
      </section>

      {/* 2. Form Container Layer */}
      <div className="relative z-20 space-y-4">
        <div className="bg-[var(--surface)] p-4 sm:p-5 rounded-[20px] shadow-xs border border-[var(--line)]">
          {renderForm()}
        </div>
      </div>
    </div>
  );
};

export { OriginationMobileLoanForms as OriginationMobileBusinessLoan };
export default OriginationMobileLoanForms;