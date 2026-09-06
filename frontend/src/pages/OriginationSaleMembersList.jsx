import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSalesLeads } from '../services/salesServices';
import { 
  Search, 
  Users, 
  Loader2, 
  Eye, 
  Phone, 
  MapPin, 
  X 
} from 'lucide-react';
import { format } from 'date-fns';
import MemberDetailsSidebar from '../components/MemberDetailsSidebar';
import OriginationMobileSaleMemberList from './OriginationMobileSaleMemberList';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationSaleMembersList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

  // Debounce the search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['sales', 'leads', 'list', debouncedSearch],
    queryFn: () => getSalesLeads({ search: debouncedSearch }),
  });

  // Filter only converted sales leads and group by phone
  const convertedLeads = useMemo(() => {
    return (response?.leads || response?.data || []).filter(lead => lead.status === 'Converted');
  }, [response]);

  const members = useMemo(() => {
    return Object.values(convertedLeads.reduce((acc, lead) => {
      if (!acc[lead.phone]) {
        acc[lead.phone] = {
          id: lead.phone,
          lead_id: lead.id,
          name: lead.name,
          phone: lead.phone,
          address: lead.address,
          product_type: lead.product_type,
          updated_at: lead.updated_at,
          created_at: lead.created_at,
          status: 'Converted',
          products: []
        };
      }
      acc[lead.phone].products.push(lead);
      return acc;
    }, {}));
  }, [convertedLeads]);

  const formatProductTypes = (products) => {
    if (!products || products.length === 0) return '—';
    const uniqueTypes = [...new Set(products.map(p => p.product_type).filter(Boolean))];
    if (uniqueTypes.length === 0) return '—';
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
        <OriginationMobileSaleMemberList />
      </div>

      {/* Web Desktop Experience (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                Converted Members Directory
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight flex items-center gap-2" style={{ fontWeight: 500 }}>
              <span>Sales <span className="font-medium italic text-[#137333]">Members</span></span> <span className="text-xs font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-2.5 py-0.5 rounded-full">{members.length} Converted</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Comprehensive list of sales prospects converted into active members.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#80868b]" />
            <input
              type="search"
              className="w-full pl-9.5 pr-8 py-2 text-xs bg-[#f8fafd] border border-[#dadce0] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 focus:border-[#1a73e8] transition-all text-[#1f1f1f] placeholder:text-[#80868b]"
              placeholder="Search members by name, phone, address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#80868b] hover:text-[#1f1f1f] rounded-full"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-xs text-[#c5221f] bg-[#fce8e6]/30">
              Failed to load members. Please check your network connection.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap">Member Name</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Contact</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Location</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Product Types</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Converted Date</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f4]">
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="p-12 text-center">
                        <Loader2 className="animate-spin h-6 w-6 text-[#1a73e8] mx-auto mb-2" />
                        <p className="text-xs text-[#5f6368]">Loading members directory...</p>
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-xs text-[#5f6368]">
                        No converted members found.
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr 
                        key={member.id} 
                        className="hover:bg-[#f8fafd] transition-colors cursor-pointer"
                        onClick={() => setSelectedMember(member)}
                      >
                        <td className="py-3 px-3.5 font-semibold text-[#1f1f1f] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#e6f4ea] text-[#137333] font-bold flex items-center justify-center text-[11px] shrink-0 border border-[#ceead6]">
                              {(member.name || 'M').charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[135px]">{member.name || 'Unnamed Member'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-[#5f6368] whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-[#80868b]" />
                            {maskPhoneNumber(member.phone)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-[#5f6368] max-w-[160px] truncate" title={member.address}>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#80868b] shrink-0" />
                            <span className="truncate max-w-[145px]">{member.address || '—'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-[#1f1f1f] font-medium min-w-[140px] max-w-[220px]">
                          <span className="inline-block px-2.5 py-1 rounded-xl text-[11px] bg-[#f8fafd] border border-[#e0e3e7] text-[#1f1f1f] font-medium leading-snug">
                            {formatProductTypes(member.products)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-[#5f6368] whitespace-nowrap">
                          {member.updated_at || member.created_at ? format(new Date(member.updated_at || member.created_at), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            onClick={() => setSelectedMember(member)}
                            className="px-3 py-1 text-xs font-semibold text-[#1a73e8] hover:bg-[#e8f0fe] rounded-full transition-colors cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
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
        type="sale"
      />
    </>
  );
};

export default OriginationSaleMembersList;
