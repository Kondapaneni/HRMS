import React from 'react';
import { ArrowLeft, Edit3, ShieldAlert } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BusinessLoanForm, PersonalLoanForm } from '../components/forms';

const BranchOperationsMobileLoansEditApplication = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    <div className="w-full pb-8">
      {/* Animated Hero Header */}
      <section className="relative px-6 pt-12 pb-24 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />

        <div className="relative z-10 flex items-center justify-between">
          <button
            onClick={() => navigate(fromPath, { state: { application, id: application?.id } })}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Edit3 className="w-3.5 h-3.5" /> Branch Operations
          </div>
        </div>

        <div className="relative z-10 mt-6">
          <p className="text-xs uppercase tracking-wider text-blue-400 font-bold mb-1">
            Editing Application #{appId}
          </p>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Edit {loanType}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Update application information. Changes will be audited and logged.
          </p>
        </div>
      </section>

      {/* Main Content Form Floating Over Hero */}
      <div className="-mt-16 px-4 relative z-20 space-y-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl">
          {renderForm()}
        </div>
      </div>
    </div>
  );
};

export default BranchOperationsMobileLoansEditApplication;
