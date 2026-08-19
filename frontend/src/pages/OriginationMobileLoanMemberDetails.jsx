import React, { useState, useEffect } from 'react';
import { ArrowLeft, Phone, MapPin, Calendar, Briefcase, CheckCircle2, ArrowRight, Lock, Loader2 } from 'lucide-react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { getLoanApplications, getLeads } from '../services/loanServices';

const OriginationMobileLoanMemberDetails = ({ member: propMember }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone } = useParams();

  // Fetch leads if propMember or location.state.member is missing
  const { data: response, isLoading: isLoadingLeads } = useQuery({
    queryKey: ['origination', 'leads', 'member-details', phone],
    queryFn: getLeads,
    enabled: !propMember && !location.state?.member
  });

  const member = React.useMemo(() => {
    if (propMember) return propMember;
    if (location.state?.member) {
      try {
        sessionStorage.setItem('current_loan_member', JSON.stringify(location.state.member));
      } catch (e) {}
      return location.state.member;
    }
    try {
      const saved = sessionStorage.getItem('current_loan_member');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    if (response?.leads && phone) {
      const converted = response.leads.filter(l => l.status === 'Converted' && String(l.phone) === String(phone));
      if (converted.length > 0) {
        const lead = converted[0];
        return {
          id: lead.phone,
          lead_id: lead.id,
          name: lead.name,
          phone: lead.phone,
          address: lead.address,
          created_at: lead.created_at,
          status: 'Converted',
          loans: converted
        };
      }
    }
    return null;
  }, [propMember, location.state?.member, response, phone]);

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

  if (isLoadingLeads && !member) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-500">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium">Loading member details...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-4">
        <p className="text-base font-semibold text-slate-700">Member profile not found.</p>
        <button
          type="button"
          onClick={() => navigate('/employee/loans/origination/members')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-xl shadow-sm cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Members
        </button>
      </div>
    );
  }

  const defaultLeadId = String(member.lead_id || member.id || '');
  const isMemberDefaultCreated = createdLeadIds.has(defaultLeadId);

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

        <div className="relative z-10 flex items-center justify-between px-2">
          <button 
            type="button" 
            onClick={() => navigate('/employee/loans/origination/members')} 
            className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 border border-white/20 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">Origination Loan Module</p>
            <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-sm">Member Profile</h2>
          </div>
          <div className="w-10 h-10" />
        </div>
      </section>

      {/* Profile Card */}
      <div className="space-y-6 relative z-20 -mt-12 mx-4">
        <div className="bg-white p-6 rounded-[28px] shadow-xl border border-slate-100 space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold shrink-0 shadow-inner">
              {member.name ? member.name.charAt(0) : 'M'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{member.name}</h2>
              <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider leading-none bg-blue-100 text-blue-700 mt-1.5">
                <CheckCircle2 size={12} className="shrink-0" />
                <span>Converted Member</span>
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone Number</h3>
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Phone size={18} className="text-blue-600" />
              </div>
              <span className="font-medium text-lg">{member.phone}</span>
            </div>
          </div>

          {member.address && (
            <div className="space-y-1 border-t border-slate-100 pt-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</h3>
              <div className="flex items-center gap-3 text-slate-700">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-blue-600" />
                </div>
                <span className="font-medium">{member.address}</span>
              </div>
            </div>
          )}

          {member.created_at && (
            <div className="space-y-1 border-t border-slate-100 pt-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Member Since</h3>
              <div className="flex items-center gap-3 text-slate-700">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Calendar size={18} className="text-blue-600" />
                </div>
                <span className="font-medium">{format(new Date(member.created_at), 'MMMM d, yyyy - h:mm a')}</span>
              </div>
            </div>
          )}

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
            {member.loans && member.loans.map((loan) => {
              const currentLeadId = String(loan.id || loan.lead_id || member.lead_id || '');
              const isCreated = createdLeadIds.has(currentLeadId);

              return (
                <div key={loan.id} className="bg-slate-50 border border-slate-100 rounded-lg p-4 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-semibold text-slate-800">
                      {loan.loan_type}
                    </div>
                    {isLoadingApps && !appsResponse ? (
                      <div className="h-5 w-16 bg-slate-200 animate-pulse rounded-full" />
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isCreated ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        <CheckCircle2 size={12} /> {isCreated ? 'Created' : (loan.status || 'Draft')}
                      </span>
                    )}
                  </div>
                  
                  {isLoadingApps && !appsResponse ? (
                    <div className="h-8 w-36 bg-slate-200 animate-pulse rounded-md" />
                  ) : isCreated ? (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none">
                      <Lock size={12} className="text-slate-400" /> Application Created
                    </div>
                  ) : (
                    <Link 
                      to="/employee/loans/form"
                      state={{ name: member.name, phone: member.phone, lead_id: currentLeadId, loan_type: loan.loan_type }}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-all"
                    >
                      Fill Loan Form <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              );
            })}
            
            {(!member.loans || member.loans.length === 0) && (
              <div className="text-center p-4 text-slate-500 text-sm bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                <p>No loan history available.</p>
                {isLoadingApps && !appsResponse ? (
                  <div className="h-8 w-36 bg-slate-200 animate-pulse rounded-md mx-auto" />
                ) : isMemberDefaultCreated ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none">
                    <Lock size={12} className="text-slate-400" /> Application Created
                  </div>
                ) : (
                  <Link 
                    to="/employee/loans/form"
                    state={{ name: member.name, phone: member.phone, lead_id: member.lead_id }}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Fill Loan Form <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OriginationMobileLoanMemberDetails;
