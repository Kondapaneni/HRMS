import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeads, getLoanApplications } from '../services/loanServices';
import { Search, Loader2, Eye, Phone, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import MemberDetailsSidebar from '../components/MemberDetailsSidebar';
import OriginationMobileLoanMemberList from './OriginationMobileLoanMemberList';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationLoanMembersList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

  // Debounce the search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: response, isLoading, isFetching, error } = useQuery({
    queryKey: ['origination', 'leads', 'list', debouncedSearch],
    queryFn: getLeads,
  });

  // Pre-fetch applications list so member details and sidebar load status instantly without flicker
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
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <OriginationMobileLoanMemberList />
      </div>

      {/* Web Desktop Experience */}
      <div className="hidden md:block space-y-6 pb-12 font-sans text-[var(--text)]">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Converted Members Directory
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
              <span>Converted Loan Members</span> 
              <span className="text-xs font-semibold text-[var(--badge-success-text)] bg-[var(--badge-success-bg)] px-2.5 py-0.5 rounded-full">
                {members.length} Converted
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
              Comprehensive list of borrower prospects converted into active members.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-3.5 shadow-xs flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            {isFetching ? (
              <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-deep)] animate-spin pointer-events-none" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--icon-muted)] pointer-events-none" />
            )}
            <input
              type="search"
              className="w-full pl-10 pr-4 py-2 text-xs bg-[var(--surface-alt)] hover:bg-[var(--surface)] focus:bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-full text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all shadow-none"
              placeholder="Search members by name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-xs text-[var(--badge-danger-text)] bg-[var(--badge-danger-bg)]">
              Failed to load members. Please check your network connection.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap">Member Name</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Contact</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Location</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Loan Products</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Converted Date</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="p-12 text-center">
                        <Loader2 className="animate-spin h-6 w-6 text-[var(--brand-deep)] mx-auto mb-2" />
                        <p className="text-xs text-[var(--muted)]">Loading members directory...</p>
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-xs text-[var(--muted)]">
                        No converted members found.
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr 
                        key={member.id} 
                        className="hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                        onClick={() => setSelectedMember(member)}
                      >
                        <td className="py-3 px-3.5 font-semibold text-[var(--text)] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)] font-semibold flex items-center justify-center text-[11px] shrink-0">
                              {(member.name || 'M').charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[135px]">{member.name || 'Unnamed Member'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-[var(--muted)] whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-[var(--icon-muted)]" />
                            {maskPhoneNumber(member.phone)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-[var(--muted)] max-w-[160px] truncate" title={member.address}>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[var(--icon-muted)] shrink-0" />
                            <span className="truncate max-w-[145px]">{member.address || '—'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-[var(--text)] font-medium whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-[8px] text-[11px] bg-[var(--surface-alt)] border border-[var(--line)] text-[var(--text)] whitespace-nowrap font-medium">
                            {formatLoanTypes(member.loans)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-[var(--muted)] whitespace-nowrap">
                          {member.updated_at || member.created_at ? format(new Date(member.updated_at || member.created_at), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            onClick={() => setSelectedMember(member)}
                            className="px-3 py-1 text-xs font-semibold text-[var(--brand-deep)] hover:bg-[var(--brand-tint)] rounded-[8px] transition-colors cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <MemberDetailsSidebar 
        isOpen={!!selectedMember} 
        onClose={() => setSelectedMember(null)} 
        member={selectedMember} 
      />
    </>
  );
};

export default OriginationLoanMembersList;