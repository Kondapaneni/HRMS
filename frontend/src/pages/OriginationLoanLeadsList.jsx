import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeads } from '../services/loanServices';
import { 
  Search, 
  Filter, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Loader2, 
  Plus, 
  MoreVertical, 
  XCircle, 
  RefreshCw,
  Eye,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import OriginationMobileLoanLeadsList from './OriginationMobileLoanLeadsList';
import AddLeadSidebar from '../components/AddLeadSidebar';
import LeadDetailsSidebar from '../components/LeadDetailsSidebar';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationLoanLeadsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Debounce the search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['origination', 'leads', 'list', debouncedSearch],
    queryFn: getLeads,
  });

  const rawLeads = response?.leads || [];

  const filteredLeads = useMemo(() => {
    if (selectedStatusFilter === 'All') return rawLeads;
    return rawLeads.filter(lead => {
      if (selectedStatusFilter === 'Active/In Progress') {
        return lead.status === 'Active' || lead.status === 'In Progress';
      }
      return lead.status === selectedStatusFilter;
    });
  }, [rawLeads, selectedStatusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { All: rawLeads.length, New: 0, 'Follow Up': 0, Converted: 0, 'Not Interested': 0 };
    rawLeads.forEach(l => {
      if (counts[l.status] !== undefined) {
        counts[l.status] += 1;
      }
    });
    return counts;
  }, [rawLeads]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]"><Clock size={11} /> New</span>;
      case 'Follow Up':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]"><RefreshCw size={11} /> Follow Up</span>;
      case 'Active':
      case 'In Progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]"><Clock size={11} /> {status}</span>;
      case 'Converted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]"><CheckCircle2 size={11} /> Converted</span>;
      case 'Not Interested':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]"><XCircle size={11} /> Not Interested</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">{status || '—'}</span>;
    }
  };

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <OriginationMobileLoanLeadsList />
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
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Loan Pipeline Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              All Leads <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{rawLeads.length} Total</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Manage, qualify, and track your loan origination prospects and conversion stages.
            </p>
          </div>

          <button 
            type="button"
            onClick={() => setIsAddLeadOpen(true)}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white h-9 px-4.5 transition-all gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Plus size={15} />
            <span>Add Lead</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'All', label: 'All', count: statusCounts.All },
              { id: 'New', label: 'New', count: statusCounts.New },
              { id: 'Follow Up', label: 'Follow Up', count: statusCounts['Follow Up'] },
              { id: 'Converted', label: 'Converted', count: statusCounts.Converted },
              { id: 'Not Interested', label: 'Not Interested', count: statusCounts['Not Interested'] },
            ].map(tab => {
              const isSelected = selectedStatusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#c2e7ff]/70 text-[#001d35] border border-[#b2d7ff]/80 shadow-2xs'
                      : 'bg-[#f8fafd] text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f] border border-[#dadce0]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-[#1a73e8] text-white' : 'bg-[#e0e3e7] text-[#5f6368]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#80868b]" />
            <input
              type="search"
              className="w-full pl-9.5 pr-8 py-2 text-xs bg-[#f8fafd] border border-[#dadce0] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 focus:border-[#1a73e8] transition-all text-[#1f1f1f] placeholder:text-[#80868b]"
              placeholder="Search by name, phone, loan..."
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
              Failed to load leads. Please check your network or try refreshing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap">Applicant Name</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Contact</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Location</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Loan Type</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Created Date</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f4]">
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="p-12 text-center">
                        <Loader2 className="animate-spin h-6 w-6 text-[#1a73e8] mx-auto mb-2" />
                        <p className="text-xs text-[#5f6368]">Loading leads directory...</p>
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-xs text-[#5f6368]">
                        No leads found matching current filter or search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr 
                        key={lead.id} 
                        className="hover:bg-[#f8fafd] transition-colors cursor-pointer"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <td className="py-3 px-3.5 font-semibold text-[#1f1f1f] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold flex items-center justify-center text-[11px] shrink-0 border border-[#d2e3fc]">
                              {(lead.name || 'L').charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[135px]">{lead.name || 'Unnamed Prospect'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-[#5f6368] whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-[#80868b]" />
                            {maskPhoneNumber(lead.phone)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-[#5f6368] max-w-[160px] truncate" title={lead.address}>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#80868b] shrink-0" />
                            <span className="truncate max-w-[145px]">{lead.address || '—'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-[#1f1f1f] font-medium whitespace-nowrap">
                          {lead.loan_type ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] bg-[#f8fafd] border border-[#e0e3e7] text-[#1f1f1f] whitespace-nowrap font-medium">
                              {lead.loan_type}
                            </span>
                          ) : (
                            <span className="text-[#80868b]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {getStatusBadge(lead.status)}
                        </td>
                        <td className="py-3 px-3.5 text-[#5f6368] whitespace-nowrap">
                          {lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            onClick={() => setSelectedLead(lead)}
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

      <AddLeadSidebar isOpen={isAddLeadOpen} onClose={() => setIsAddLeadOpen(false)} />
      <LeadDetailsSidebar 
        isOpen={!!selectedLead} 
        onClose={() => setSelectedLead(null)} 
        lead={selectedLead} 
      />
    </>
  );
};

export default OriginationLoanLeadsList;
