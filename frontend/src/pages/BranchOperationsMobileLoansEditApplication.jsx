import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
          <div className="p-8 text-center text-slate-500 font-medium">
            Invalid or Unsupported Loan Type Selected.
          </div>
        );
    }
  };

  return (
    <div className="w-full pb-8">
      {/* Hero Header matching Branch Operations Mobile Design */}
      <section className="relative px-6 pt-12 pb-24 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs (#7C4DFF) */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#7C4DFF] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-[#9575FF] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-[#B388FF] rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => navigate(fromPath, { state: { application, id: application?.id } })}
            className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 border border-white/20 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">
              Branch Operation Module
            </p>
            <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-sm">
              Edit {loanType}
            </h2>
          </div>
          <div className="w-10 h-10" />
        </div>
      </section>

      {/* Main Content Form Floating Over Hero */}
      <div className="relative z-20 -mt-12 px-4 space-y-4">
        <div className="rounded-[24px] border border-slate-100/80 bg-white p-5 shadow-lg">
          <div className="mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 font-sans tracking-tight">{appId}</h3>
            <p className="text-xs font-semibold text-slate-500">Edit {loanType} Application</p>
          </div>
          {renderForm()}
        </div>
      </div>
    </div>
  );
};

export default BranchOperationsMobileLoansEditApplication;
