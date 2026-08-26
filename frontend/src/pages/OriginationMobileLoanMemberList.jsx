import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Users, 
  Loader2, 
  ChevronRight,
  ShieldCheck,
  X,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { getLeads, getLoanApplications } from '../services/loanServices';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationMobileLoanMemberList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 250);
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

  const filteredMembers = members.filter(member => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      member.name?.toLowerCase().includes(term) ||
      member.phone?.includes(term) ||
      member.address?.toLowerCase().includes(term)
    );
  });

  const formatLoanTypes = (loans) => {
    if (!loans || loans.length === 0) return 'Personal Loan';
    const uniqueTypes = [...new Set(loans.map(l => l.loan_type || 'Personal Loan'))];
    if (uniqueTypes.length <= 2) {
      return uniqueTypes.join(', ');
    } else {
      return `${uniqueTypes.slice(0, 2).join(', ')} +${uniqueTypes.length - 2}`;
    }
  };

  return (
    <div className="space-y-4 pb-14">

      {/* 1. Header Card (Google Material 3 Workspace) */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5">
                Origination Workspace
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              Converted Members
            </h1>
            <p className="text-xs text-[#5f6368]">
              {members.length} verified members ready for origination
            </p>
          </div>

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0">
            <CheckCircle2 size={12} />
            <span>{members.length} Active</span>
          </span>
        </div>
      </div>

      {/* 2. Search Box */}
      <div className="bg-white rounded-2xl border border-[#e0e3e7] p-2.5 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-[#5f6368] ml-1.5 shrink-0" />
        <input
          type="search"
          placeholder="Search members by name, phone, address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs bg-transparent border-none outline-none text-[#1f1f1f] placeholder:text-[#80868b] pr-2"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="p-1 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] shrink-0"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* 3. Members Card List */}
      <div className="space-y-3">
        {error ? (
          <div className="bg-[#fce8e6] text-[#c5221f] p-4 rounded-2xl text-center border border-[#fad2cf] text-xs">
            Failed to load members. Please refresh or try again.
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="animate-spin h-7 w-7 text-[#1a73e8]" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-8 text-center space-y-2 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#f8fafd] border border-[#e0e3e7] flex items-center justify-center mx-auto text-[#80868b]">
              <Users size={20} />
            </div>
            <p className="text-sm font-bold text-[#1f1f1f]">No members found</p>
            <p className="text-xs text-[#5f6368]">
              {searchTerm ? 'No results matched your search query.' : 'Converted borrower prospects will appear here.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 inline-flex items-center text-xs font-semibold text-[#1a73e8] hover:underline"
              >
                Clear search query
              </button>
            )}
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div 
              key={member.id} 
              onClick={() => navigate('/employee/loans/origination/members/details', { state: { member } })}
              className="bg-white rounded-2xl border border-[#e0e3e7] hover:border-[#dadce0] p-4 shadow-xs transition-all active:scale-[0.99] active:bg-[#f8fafd] cursor-pointer space-y-2.5"
            >
              {/* Top Row: Name and Member Pill */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <h3 className="font-bold text-[#1f1f1f] text-sm truncate">
                    {member.name || 'Unnamed Member'}
                  </h3>
                  <div className="flex items-center gap-2 text-[10.5px] text-[#5f6368]">
                    <span className="inline-flex items-center gap-1 font-medium text-[#5f6368]">
                      <Phone size={10} className="text-[#80868b]" />
                      {member.phone ? maskPhoneNumber(member.phone) : '—'}
                    </span>
                    <span>&bull;</span>
                    <span className="text-[#1a73e8] font-medium truncate">{formatLoanTypes(member.loans)}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                    <CheckCircle2 size={10} /> Member
                  </span>
                </div>
              </div>

              {/* Middle Row: Address & Joined Date */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f1f3f4] text-[11px] text-[#5f6368]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin size={11} className="text-[#80868b] shrink-0" />
                  <span className="truncate">{member.address || 'Address on file'}</span>
                </div>
                <div className="flex items-center justify-end gap-1.5 text-right min-w-0">
                  <Calendar size={11} className="text-[#80868b] shrink-0" />
                  <span>{member.created_at ? format(new Date(member.created_at), 'dd MMM yyyy') : 'Recent'}</span>
                </div>
              </div>

              {/* Bottom Row: Loans Count & Arrow */}
              <div className="pt-2 border-t border-[#f1f3f4] flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-[#5f6368] flex items-center gap-1">
                  <FileText size={11} className="text-[#1a73e8]" />
                  {member.loans.length} Application{member.loans.length !== 1 ? 's' : ''} on record
                </span>
                
                <div className="w-6 h-6 rounded-full bg-[#f8fafd] border border-[#dadce0] flex items-center justify-center text-[#5f6368]">
                  <ChevronRight size={13} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default OriginationMobileLoanMemberList;
