import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import OriginationMobileFormEngine from '../components/forms/OriginationMobileFormEngine';

const OriginationMobileLoanForms = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from || '/employee/loans/origination/applications';
  const loanType = location.state?.loan_type || location.state?.loanType || location.state?.application?.loan_type || 'Personal Loan';
  const application = location.state?.application;

  const isEditMode = Boolean(
    location.state?.mode === 'edit' || 
    location.state?.isEdit || 
    location.state?.application?.status === 'Draft'
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

  return (
    <div className="space-y-4 pb-14 w-full">

      {/* 1. Header Card (Google Material 3 Workspace) */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30 space-y-2">
        {/* Workspace Tag */}
        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335] shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05] shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5 whitespace-nowrap">
            Origination Workspace
          </span>
        </div>

        {/* Heading + Back Button Row (Same Line) */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
            {loanType} Form
          </h1>

          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-3.5 py-1.5 transition-all gap-1.5 shadow-2xs cursor-pointer shrink-0 whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#5f6368]" />
            <span>Back</span>
          </button>
        </div>

        {/* Subtitle Row (Full Width - Always Single Line) */}
        <div className="flex items-center gap-2 text-xs text-[#5f6368] whitespace-nowrap pt-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full shrink-0">
            {isEditMode ? 'Edit Mode' : 'New Application'}
          </span>
          <span>&bull;</span>
          <span className="truncate">Fill all verified details</span>
        </div>
      </div>

      {/* 2. Bespoke Mobile Form Engine */}
      <OriginationMobileFormEngine
        loanType={loanType}
        isEditMode={isEditMode}
        application={application}
      />

    </div>
  );
};

export { OriginationMobileLoanForms as OriginationMobileBusinessLoan };
export default OriginationMobileLoanForms;
