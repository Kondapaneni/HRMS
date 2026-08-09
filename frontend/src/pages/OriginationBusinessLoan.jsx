import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BusinessLoanForm } from '../components/forms';
import { Briefcase, ArrowLeft } from 'lucide-react';
import OriginationMobileBusinessLoan from './OriginationMobileBusinessLoan';

export default function OriginationBusinessLoan() {
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
        {isReadOnly ? (
          <BusinessLoanForm />
        ) : (
          <>
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Business Loan Application
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Fill in the applicant details below to apply for a business loan
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(fromPath)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 h-10 px-4 transition-colors gap-2 shadow-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to {fromPath.includes('members') ? 'Members' : 'Applications'}
              </button>
            </div>

            {/* Main Full Width Form Card */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-slate-500" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    Applicant Information
                  </h3>
                </div>
              </div>

              <div className="p-6">
                <BusinessLoanForm />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

