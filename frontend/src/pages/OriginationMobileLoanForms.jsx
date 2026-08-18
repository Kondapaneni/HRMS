import React from 'react';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BusinessLoanForm, PersonalLoanForm } from '../components/forms';

const OriginationMobileLoanForms = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from || '/employee/loans/origination/members';
  const loanType = location.state?.loan_type || location.state?.loanType || 'Business Loan';

  const renderForm = () => {
    switch (loanType) {
      case 'Personal Loan':
        return <PersonalLoanForm />;
      case 'Business Loan':
        return <BusinessLoanForm />;
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
      {/* Animated Hero Header - Matched from Member Page */}
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
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2 flex items-center justify-between">
          <button 
            type="button" 
            onClick={() => navigate(fromPath)} 
            className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 border border-white/20 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">Origination Module</p>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-1.5 justify-center drop-shadow-sm">
              <Briefcase className="w-4 h-4 text-blue-300" /> {loanType} Form
            </h2>
          </div>
          <div className="w-10 h-10" />
        </div>
      </section>

      {/* Main Floating Form Container */}
      <div className="relative z-20 -mt-12 mx-4">
        <div className="bg-white p-5 rounded-[28px] shadow-xl border border-slate-100">
          {renderForm()}
        </div>
      </div>
    </div>
  );
};

export { OriginationMobileLoanForms as OriginationMobileBusinessLoan };
export default OriginationMobileLoanForms;
