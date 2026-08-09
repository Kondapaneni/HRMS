import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ChevronLeft, MapPin, Calendar, CheckCircle2, Phone, Briefcase, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const OriginationMobileMemberDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const member = location.state?.member;

  // If no member in state, bounce back
  if (!member) {
    navigate('/employee/loans/origination/members', { replace: true });
    return null;
  }

  return (
    <div className="w-full pb-8">
      {/* Header */}
      <div className="relative pt-14 pb-16 px-4 overflow-hidden rounded-b-[40px] shadow-md bg-slate-900">
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

        <button
          onClick={() => navigate('/employee/loans/origination/members')}
          type="button"
          className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors z-20"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="absolute top-5 right-4 z-20">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={14} /> Member
          </span>
        </div>

        <div className="relative z-10 flex flex-col items-center mt-2">
          <h1 className="text-2xl font-bold text-white text-center px-4 leading-snug">{member.name}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-8 relative z-20">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
          
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Phone</h3>
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Phone size={18} className="text-blue-600" />
              </div>
              <span className="font-medium text-lg">{member.phone}</span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location / Address</h3>
            <div className="flex items-start gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-1">
                <MapPin size={18} className="text-indigo-600" />
              </div>
              <span className="font-medium leading-relaxed pt-2">{member.address}</span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined On</h3>
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <Calendar size={18} className="text-emerald-600" />
              </div>
              <span className="font-medium">{format(new Date(member.created_at), 'MMMM d, yyyy - h:mm a')}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Loan History Section */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-5">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Briefcase size={16} className="text-slate-500" />
            Loan History
          </h3>
          
          <div className="grid gap-3">
            {member.loans && member.loans.map((loan) => (
              <div key={loan.id} className="bg-slate-50 border border-slate-100 rounded-lg p-4 transition-all shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-semibold text-slate-800">
                    {loan.loan_type || 'Personal Loan'}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                    <CheckCircle2 size={12} /> {loan.status}
                  </span>
                </div>
                
                {/* Fill Loan Form Link */}
                <Link 
                  to={
                    loan.loan_type?.toLowerCase().includes('business') 
                      ? '/employee/loans/business-loan' 
                      : '/admin/business-loan'
                  }
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-all"
                >
                  Fill Loan Form <ArrowRight size={14} />
                </Link>
              </div>
            ))}
            
            {(!member.loans || member.loans.length === 0) && (
              <div className="text-center p-4 text-slate-500 text-sm bg-slate-50 rounded-lg border border-slate-100">
                No loan history available.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default OriginationMobileMemberDetails;
