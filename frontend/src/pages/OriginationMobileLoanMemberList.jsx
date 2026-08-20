import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeads, getLoanApplications } from '../services/loanServices';
import { motion } from 'framer-motion';
import { Search, Phone, MapPin, Calendar, CheckCircle2, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import { useNavigate } from 'react-router-dom';

const OriginationMobileLoanMemberList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce the search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['origination', 'leads', 'list', debouncedSearch],
    queryFn: getLeads,
  });

  // Pre-fetch applications list so mobile member details load status instantly without flicker
  useQuery({
    queryKey: ['origination', 'applications', 'list'],
    queryFn: getLoanApplications,
  });

  // Filter only converted leads and group by phone
  const convertedLeads = (response?.leads || []).filter(lead => lead.status === 'Converted');
  const members = Object.values(convertedLeads.reduce((acc, lead) => {
    if (!acc[lead.phone]) {
      acc[lead.phone] = {
        id: lead.phone,
        lead_id: lead.id,
        name: lead.name,
        phone: lead.phone,
        address: lead.address,
        updated_at: lead.updated_at,
        created_at: lead.created_at,
        status: 'Converted',
        loans: []
      };
    }
    acc[lead.phone].loans.push(lead);
    return acc;
  }, {}));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  const formatLoanTypes = (loans) => {
    if (!loans || loans.length === 0) return 'N/A';
    const uniqueTypes = [...new Set(loans.map(l => l.loan_type || 'Personal Loan'))];
    if (uniqueTypes.length <= 2) {
      return uniqueTypes.join(', ');
    } else {
      return `${uniqueTypes.slice(0, 2).join(', ')} +${uniqueTypes.length - 2}`;
    }
  };

  return (
    <div className="w-full pb-5">
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

        <div className="relative z-10 px-2 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">Origination Loans Module</p>
            <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Members</h2>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Converted lead directory</p>
          </div>
        </div>
      </section>

      <div className="relative z-20 -mt-16 px-4 space-y-4">
        {/* Search Bar - Floating */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-3 flex items-center">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="search"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* State Handling */}
        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center border border-red-100 shadow-sm mt-4">
            Failed to load members. Please try again.
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-20 mt-4">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-20 text-center text-slate-500 mt-4">
            No members found.
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {members.map(member => (
              <div 
                key={member.id} 
                variants={itemVariants} 
                onClick={() => navigate('/employee/loans/origination/members/details', { state: { member } })}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 hover:shadow-md transition-shadow active:scale-[0.98] active:bg-slate-50 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{member.name}</h3>
                  <div className="shrink-0 ml-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                      <CheckCircle2 size={10} /> Member
                    </span>
                  </div>
                </div>
                <div className="space-y-2.5 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Phone size={12} className="text-blue-500" />
                    </div>
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                      <MapPin size={12} className="text-indigo-500" />
                    </div>
                    <span className="truncate">{member.address}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <Calendar size={12} className="text-emerald-500" />
                    </div>
                    <span>Joined on {format(new Date(member.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 mt-3 flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">{member.loans.length} Loan{member.loans.length !== 1 ? 's' : ''}</span>
                    <span className="text-slate-700 font-semibold">{formatLoanTypes(member.loans)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OriginationMobileLoanMemberList;
