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
    <div className="space-y-4 pb-14 font-sans antialiased text-[var(--text)]">

      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Origination &bull; Loan Pipeline
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Converted Members
            </h2>
          </div>
          <p className="text-xs font-medium text-[var(--muted)] mt-1">
            {members.length} Verified Borrower Profiles
          </p>
        </div>
      </section>

      {/* 2. Content Layer */}
      <div className="relative z-20 space-y-3.5">

        {/* Search Box */}
        <div className="bg-[var(--surface)] rounded-[12px] border border-[var(--line)] px-3.5 py-2.5 shadow-xs flex items-center gap-2.5">
          <Search className="w-4 h-4 text-[var(--icon-muted)] shrink-0" />
          <input
            type="text"
            placeholder="Search members by name, phone, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-normal bg-transparent border-none outline-none text-[var(--text)] placeholder:text-[var(--muted)] pr-1"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-full text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)] shrink-0 cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 3. Members Card List */}
        <div className="space-y-3">
          {error ? (
            <div className="bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] p-4 rounded-[16px] text-center text-xs">
              Failed to load members. Please refresh or try again.
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="animate-spin h-7 w-7 text-[var(--brand-deep)]" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-8 text-center space-y-2 shadow-xs">
              <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--line)] flex items-center justify-center mx-auto text-[var(--icon-muted)]">
                <Users size={20} />
              </div>
              <p className="text-sm font-semibold text-[var(--text)]">No members found</p>
              <p className="text-xs text-[var(--muted)]">
                {searchTerm ? 'No results matched your search query.' : 'Converted borrower prospects will appear here.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 inline-flex items-center text-xs font-semibold text-[var(--brand-deep)] hover:underline cursor-pointer"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            filteredMembers.map((member) => {
              const displayName = member.name || 'Unnamed Member';
              const initials = displayName.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'M';

              return (
                <div 
                  key={member.id} 
                  onClick={() => navigate('/employee/loans/origination/members/details', { state: { member } })}
                  className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] hover:border-[var(--brand)]/30 p-4 shadow-xs transition-all active:scale-[0.99] active:bg-[var(--surface-alt)] cursor-pointer space-y-2.5 group"
                >
                  {/* Top Row: Name and Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] font-semibold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <h3 className="font-semibold text-[var(--text)] text-sm truncate group-hover:text-[var(--brand-deep)] transition-colors">
                          {displayName}
                        </h3>
                        <div className="flex items-center gap-2 text-[10.5px] text-[var(--muted)]">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Phone size={10} className="text-[var(--icon-muted)]" />
                            {member.phone ? maskPhoneNumber(member.phone) : '—'}
                          </span>
                          <span>&bull;</span>
                          <span className="text-[var(--brand-deep)] font-medium truncate">{formatLoanTypes(member.loans)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] shrink-0">
                        <CheckCircle2 size={13} /> Member
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Address & Joined Date */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)] text-[11px] text-[var(--muted)]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin size={11} className="text-[var(--icon-muted)] shrink-0" />
                      <span className="truncate">{member.address || 'Address on file'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-right min-w-0">
                      <Calendar size={11} className="text-[var(--icon-muted)] shrink-0" />
                      <span>{member.created_at ? format(new Date(member.created_at), 'dd MMM yyyy') : 'Recent'}</span>
                    </div>
                  </div>

                  {/* Bottom Row: Loans Count & Arrow */}
                  <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-[var(--muted)] flex items-center gap-1.5">
                      <FileText size={12} className="text-[var(--brand-deep)]" />
                      {member.loans.length} Application{member.loans.length !== 1 ? 's' : ''} on record
                    </span>
                    
                    <div className="w-6 h-6 rounded-[8px] bg-[var(--surface-alt)] flex items-center justify-center text-[var(--muted)] group-hover:bg-[var(--brand-tint)] group-hover:text-[var(--brand-deep)] transition-colors">
                      <ChevronRight size={13} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};

export default OriginationMobileLoanMemberList;