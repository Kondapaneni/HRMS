import React from 'react';
import { ArrowLeft, Edit3, Building2, ShieldAlert } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBranchLoanApplications } from '../services/loanServices';
import { BusinessLoanForm, PersonalLoanForm } from '../components/forms';

const BranchOperationsMobileLoansEditApplication = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const application = location.state?.application || {};
  const fromPath = location.state?.from || '/employee/branch-operations/loans-view-applications';
  const loanType = location.state?.loan_type || application?.loan_type || application?.form_data?.loan_type || 'Personal Loan';
  const appId = application?.application_id || application?.id || 'LA-PENDING';

  // Fetch branch details if not present in state
  const { data: response } = useQuery({
    queryKey: ['branchOperations', 'applications', 'list'],
    queryFn: getBranchLoanApplications,
    enabled: !application?.branch_name,
  });

  const branchName = response?.branch?.name || application?.branch_name || 'Branch Operations';

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
    <div className="w-full space-y-4 pb-12">
      {/* 1. Header Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5">
                Branch Operations
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              Edit Application
            </h1>
            <p className="text-xs text-[#5f6368] flex items-center gap-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2 py-0.5 rounded-full">
                <Building2 size={11} /> {branchName}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(fromPath, { state: { application, id: application?.id } })}
            className="w-9 h-9 rounded-full bg-white border border-[#dadce0] text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Overview Banner */}
      <div className="bg-white p-4 rounded-2xl border border-[#e0e3e7] shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-bold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full border border-[#d2e3fc]">
            {appId}
          </span>
          <span className="text-xs font-semibold text-[#5f6368]">
            {loanType}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#b06000] bg-[#fef7e0] border border-[#feefc3] p-2 rounded-xl">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Edits will update application records for this branch</span>
        </div>
      </div>

      {/* 3. Main Form */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white p-4 shadow-xs">
        {renderForm()}
      </div>

      {/* 4. Bottom Back Button */}
      <div className="flex justify-center pt-2 pb-4">
        <button
          type="button"
          onClick={() => navigate(fromPath, { state: { application, id: application?.id } })}
          className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#444746] border border-[#dadce0] hover:bg-[#f1f3f4] h-10 px-6 transition-all gap-2 shadow-2xs cursor-pointer active:scale-98"
        >
          <ArrowLeft className="w-4 h-4" /> Back to View Application
        </button>
      </div>
    </div>
  );
};

export default BranchOperationsMobileLoansEditApplication;
