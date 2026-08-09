import React from 'react';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BusinessLoanForm } from '../components/forms';

const OriginationMobileBusinessLoan = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full pb-10 bg-slate-50 min-h-screen">
      {/* Header Banner */}
      <div className="relative pt-10 pb-20 px-4 sm:px-6 overflow-hidden rounded-b-[36px] shadow-lg bg-slate-900">
        {/* Decorative ambient gradient blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-16 -left-10 w-60 h-60 bg-blue-600 rounded-full mix-blend-screen filter blur-[36px] opacity-50 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -30, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-56 h-56 bg-indigo-600 rounded-full mix-blend-screen filter blur-[36px] opacity-50 pointer-events-none"
        />

        <div className="relative z-10 flex items-center justify-between">
          <button 
            type="button" 
            onClick={() => navigate('/employee/loans/origination/members')} 
            className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 border border-white/20 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-0.5 drop-shadow-sm">Origination Module</p>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5 justify-center">
              <Briefcase className="w-4 h-4 text-blue-400" /> Business Loan Form
            </h2>
          </div>
          <div className="w-10 h-10" />
        </div>
      </div>

      {/* Main Floating Form Container */}
      <div className="relative z-20 -mt-12 mx-3 sm:mx-6">
        <div className="bg-white p-4 sm:p-6 rounded-[24px] shadow-xl border border-slate-100">
          <BusinessLoanForm />
        </div>
      </div>
    </div>
  );
};

export default OriginationMobileBusinessLoan;
