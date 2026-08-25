import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Briefcase, CheckCircle2, ArrowRight, Lock, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLoanApplications } from '../services/loanServices';
import { maskPhoneNumber } from '../utils/phoneUtils';
import { format } from 'date-fns';

const MemberDetailsSidebar = ({ isOpen, onClose, member, type = 'loan' }) => {
  const isSale = type === 'sale';

  const { data: appsResponse, isLoading: isLoadingApps } = useQuery({
    queryKey: ['origination', 'applications', 'list'],
    queryFn: getLoanApplications,
  });

  const createdLeadIds = React.useMemo(() => {
    if (!appsResponse?.applications) return new Set();
    return new Set(
      appsResponse.applications
        .filter(app => app.status !== 'Draft' && app.lead_id)
        .map(app => String(app.lead_id))
    );
  }, [appsResponse]);

  if (!isOpen || !member) return null;

  const defaultLeadId = String(member.lead_id || member.id || '');
  const isMemberDefaultCreated = createdLeadIds.has(defaultLeadId);

  const rawProducts = isSale ? (member.products || []) : (member.loans || []);
  const productsList = rawProducts.length > 0 ? rawProducts : [
    {
      id: member.lead_id || member.id,
      product_type: member.product_type || member.loan_type || (isSale ? 'Savings & Deposits' : 'Personal Loan'),
      status: 'Converted'
    }
  ];

  return createPortal(
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        className="bg-white shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[#e0e3e7]"
      >
        {/* Top 4-Color Google Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Member Profile</span>
            </div>
            <h2 className="text-lg font-semibold text-[#1f1f1f]">Member Details</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Member Profile Info */}
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-full flex items-center justify-center text-lg font-bold uppercase shrink-0 shadow-2xs border bg-[#e6f4ea] text-[#137333] border-[#ceead6]">
              {member.name ? member.name.charAt(0) : 'M'}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#1f1f1f] leading-snug">{member.name}</h3>
              <div className="flex items-center gap-2 text-xs text-[#5f6368]">
                <Phone size={13} className="text-[#1a73e8]" />
                <span>{maskPhoneNumber(member.phone)}</span>
              </div>
              {member.address && (
                <div className="flex items-center gap-1.5 text-xs text-[#5f6368]">
                  <MapPin size={13} className="text-[#1a73e8] shrink-0" />
                  <span className="truncate max-w-[260px]">{member.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* History Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase size={14} className="text-[#1a73e8]" />
              <span>{isSale ? 'Sale Product History' : 'Loan Product History'}</span>
            </h4>
            
            <div className="grid gap-2.5">
              {productsList.map((item, idx) => {
                const currentLeadId = String(item.id || item.lead_id || member.lead_id || '');
                const isCreated = createdLeadIds.has(currentLeadId);
                const title = item.product_type || item.loan_type || member.product_type || member.loan_type || (isSale ? 'Savings & Deposits' : 'Personal Loan');

                return (
                  <div key={item.id || idx} className="bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl p-4 transition-all hover:border-[#1a73e8]">
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="font-semibold text-[#1f1f1f] text-xs">
                        {title}
                      </div>
                      {isLoadingApps && !appsResponse ? (
                        <div className="h-5 w-16 bg-[#e0e3e7] animate-pulse rounded-full" />
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isCreated 
                            ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]' 
                            : 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]'
                        }`}>
                          <CheckCircle2 size={11} /> {isCreated ? 'Created' : 'Converted'}
                        </span>
                      )}
                    </div>
                    
                    {isLoadingApps && !appsResponse ? (
                      <div className="h-7 w-32 bg-[#e0e3e7] animate-pulse rounded-full" />
                    ) : isCreated ? (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] cursor-not-allowed select-none">
                        <Lock size={11} className="text-[#80868b]" /> Application Created
                      </div>
                    ) : (
                      <Link 
                        to="/employee/loans/form"
                        state={{ 
                          name: member.name, 
                          phone: member.phone, 
                          lead_id: currentLeadId, 
                          loan_type: title,
                          from: isSale ? '/employee/sales/origination/members' : '/employee/loans/origination/members'
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#1a73e8] hover:underline"
                      >
                        Fill Application <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default MemberDetailsSidebar;
