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
      className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm antialiased font-sans"
    >
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        className="bg-[var(--surface)] text-[var(--text)] shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[var(--line)]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface-alt)] shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)]" />
              <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">Member Profile</span>
            </div>
            <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">
              Member Details
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] p-2 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Member Profile Info */}
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-[14px] flex items-center justify-center text-lg font-bold uppercase shrink-0 shadow-2xs border bg-[#E6F6EC] text-[#1F9D55] border-[#1F9D55]/20">
              {member.name ? member.name.charAt(0) : 'M'}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--text)] leading-snug">{member.name}</h3>
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <Phone size={13} className="text-[var(--brand-deep)]" />
                <span>{maskPhoneNumber(member.phone)}</span>
              </div>
              {member.address && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <MapPin size={13} className="text-[var(--brand-deep)] shrink-0" />
                  <span className="truncate max-w-[260px]">{member.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* History Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase size={14} className="text-[var(--brand-deep)]" />
              <span>{isSale ? 'Sale Product History' : 'Loan Product History'}</span>
            </h4>
            
            <div className="grid gap-2.5">
              {productsList.map((item, idx) => {
                const currentLeadId = String(item.id || item.lead_id || member.lead_id || '');
                const isCreated = createdLeadIds.has(currentLeadId);
                const title = item.product_type || item.loan_type || member.product_type || member.loan_type || (isSale ? 'Savings & Deposits' : 'Personal Loan');

                return (
                  <div key={item.id || idx} className="bg-[var(--surface-alt)] border border-[var(--line)] rounded-[20px] p-4 transition-all hover:border-[var(--brand)]">
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="font-semibold text-[var(--text)] text-xs">
                        {title}
                      </div>
                      {isLoadingApps && !appsResponse ? (
                        <div className="h-5 w-16 bg-[var(--line)] animate-pulse rounded-full" />
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isCreated 
                            ? 'bg-[#E8F0FB] text-[#3B6FB6] border-[#3B6FB6]/20' 
                            : 'bg-[#FDF3DC] text-[#B7791F] border-[#B7791F]/20'
                        }`}>
                          <CheckCircle2 size={11} /> {isCreated ? 'Created' : 'Converted'}
                        </span>
                      )}
                    </div>
                    
                    {isLoadingApps && !appsResponse ? (
                      <div className="h-7 w-32 bg-[var(--line)] animate-pulse rounded-full" />
                    ) : isCreated ? (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)] cursor-not-allowed select-none">
                        <Lock size={11} className="text-[var(--muted)]" /> Application Created
                      </div>
                    ) : (
                      <Link 
                        to={isSale ? "/employee/sales/form" : "/employee/loans/form"}
                        state={{ 
                          name: member.name, 
                          phone: member.phone, 
                          lead_id: currentLeadId, 
                          product_type: title,
                          loan_type: title,
                          from: isSale ? '/employee/sales/origination/members' : '/employee/loans/origination/members'
                        }}
                        className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${
                          isSale ? 'text-[#1F9D55]' : 'text-[var(--brand-deep)]'
                        }`}
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
