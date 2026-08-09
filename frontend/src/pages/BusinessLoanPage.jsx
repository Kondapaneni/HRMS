import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BusinessLoanForm } from '../components/forms';
import { Briefcase, ArrowLeft } from 'lucide-react';
import OriginationMobileBusinessLoan from './OriginationMobileBusinessLoan';

export default function BusinessLoanPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isReadOnly = Boolean(location.state?.readOnly || location.state?.isReadOnly);
  const fromPath = location.state?.from || '/employee/loans/origination/applications';

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <OriginationMobileBusinessLoan />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block p-4 md:p-6 lg:p-8 space-y-6 w-full max-w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {isReadOnly ? 'Business Loan Application Details' : 'Business Loan Application'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isReadOnly 
                ? 'Viewing complete applicant, co-applicant, and guarantor application details' 
                : 'Fill in the applicant details below to apply for a business loan'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(fromPath)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {fromPath.includes('members') ? 'Members' : 'Applications'}
          </button>
        </div>

        {/* Main Full Width Form Card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-slate-500" />
              <h3 className="text-lg font-semibold text-slate-900">
                {isReadOnly ? 'Submitted Application Form' : 'Applicant Information'}
              </h3>
            </div>
            {isReadOnly && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Read-Only
              </span>
            )}
          </div>

          <div className="p-6">
            <BusinessLoanForm />
          </div>
        </div>
      </div>
    </>
  );
}

