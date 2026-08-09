import React from 'react';
import { BusinessLoanForm } from '../components/forms';
import { Briefcase } from 'lucide-react';

export default function BusinessLoanPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 w-full max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Business Loan Application</h1>
          <p className="text-sm text-slate-500 mt-1">Fill in the applicant details below to apply for a business loan</p>
        </div>
      </div>

      {/* Main Full Width Form Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-900">Applicant Information</h3>
        </div>

        <div className="p-6">
          <BusinessLoanForm />
        </div>
      </div>
    </div>
  );
}
