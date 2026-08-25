import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSalesLeads } from '../services/salesServices';
import { 
  Search, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Users, 
  Loader2, 
  Briefcase, 
  ChevronRight, 
  X,
  ShoppingBag
} from 'lucide-react';
import { format } from 'date-fns';
import { maskPhoneNumber } from '../utils/phoneUtils';
import { useNavigate } from 'react-router-dom';

const OriginationMobileSaleMemberList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce the search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 250);
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
    <div className="space-y-4 pb-14">
      {/* 1. Header Card (Google Material 3 Workspace) */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335] shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05] shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5 whitespace-nowrap">
                Sales Origination Hub
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
              Converted Members
            </h1>
            <p className="text-xs text-[#5f6368]">
              {members.length} active customer member accounts
            </p>
          </div>

          <div className="w-11 h-11 rounded-full bg-[#e6f4ea] border border-[#ceead6] flex items-center justify-center text-[#137333] shrink-0 shadow-2xs">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* 2. Search Box */}
      <div className="bg-white rounded-2xl border border-[#e0e3e7] p-2.5 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-[#5f6368] ml-1.5 shrink-0" />
        <input
          type="search"
          placeholder="Search converted members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs bg-transparent border-none outline-none text-[#1f1f1f] placeholder:text-[#80868b] pr-2"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="p-1 text-[#80868b] hover:text-[#1f1f1f] rounded-full mr-1"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* 3. Members Cards Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-8 text-center shadow-xs">
            <Loader2 className="animate-spin h-6 w-6 text-[#1a73e8] mx-auto mb-2" />
            <p className="text-xs text-[#5f6368]">Loading members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-8 text-center shadow-xs space-y-2">
            <Users className="w-8 h-8 text-[#80868b] mx-auto" />
            <p className="text-xs font-semibold text-[#1f1f1f]">No converted members found</p>
            <p className="text-[11px] text-[#5f6368]">Converted sales leads will appear here automatically.</p>
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              onClick={() => navigate('/employee/sales/origination/members/details', { state: { member } })}
              className="bg-white rounded-2xl border border-[#e0e3e7] p-4 shadow-xs hover:border-[#dadce0] transition-all active:scale-[0.99] cursor-pointer space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#e6f4ea] text-[#137333] font-bold text-xs flex items-center justify-center border border-[#ceead6] shrink-0">
                    {(member.name || 'M').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#1f1f1f] truncate">{member.name}</h3>
                    <p className="text-[11px] text-[#1a73e8] font-medium truncate mt-0.5">
                      {formatProductTypes(member.products)}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shrink-0">
                  <CheckCircle2 size={10} /> Converted
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11.5px] pt-1 border-t border-[#f1f3f4] text-[#5f6368]">
                <div className="flex items-center gap-1.5 truncate">
                  <Phone size={12} className="text-[#80868b] shrink-0" />
                  <span className="truncate">{maskPhoneNumber(member.phone)}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin size={12} className="text-[#80868b] shrink-0" />
                  <span className="truncate">{member.address || '—'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 text-[#80868b]">
                <div className="flex items-center gap-1">
                  <Calendar size={11} />
                  <span>{member.created_at ? format(new Date(member.created_at), 'dd MMM yyyy') : '—'}</span>
                </div>
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#1a73e8]">
                  View Details <ChevronRight size={13} />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OriginationMobileSaleMemberList;
