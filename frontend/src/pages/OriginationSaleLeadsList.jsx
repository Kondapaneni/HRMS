import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import SearchBar from '../components/ui/SearchBar';
import { getSalesLeads } from '../services/salesServices';
import { 
  Search, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Plus, 
  XCircle, 
  RefreshCw,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import OriginationMobileSaleLeadsList from './OriginationMobileSaleLeadsList';
import AddLeadSidebar from '../components/AddLeadSidebar';
import LeadDetailsSidebar from '../components/LeadDetailsSidebar';
import { maskPhoneNumber } from '../utils/phoneUtils';

const OriginationSaleLeadsList = () => {
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

  const { data: response, isLoading, isFetching, error } = useQuery({
    queryKey: ['sales', 'leads', 'list', debouncedSearch],
    queryFn: () => getSalesLeads({ search: debouncedSearch }),
  });

  const rawLeads = response?.leads || response?.data || [];

  const filteredLeads = useMemo(() => {
    let result = rawLeads;

    if (selectedStatusFilter !== 'All') {
      result = result.filter(lead => {
        if (selectedStatusFilter === 'Active/In Progress') {
          return lead.status === 'Active' || lead.status === 'In Progress';
        }
        return lead.status === selectedStatusFilter;
      });
    }

    if (debouncedSearch && debouncedSearch.trim()) {
      const term = debouncedSearch.trim().toLowerCase();
      result = result.filter(lead => {
        return (
          lead.name?.toLowerCase().includes(term) ||
          lead.phone?.toLowerCase().includes(term) ||
          lead.address?.toLowerCase().includes(term) ||
          lead.product_type?.toLowerCase().includes(term) ||
          lead.loan_type?.toLowerCase().includes(term)
        );
      });
    }

    return result;
  }, [rawLeads, selectedStatusFilter, debouncedSearch]);

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
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]">
            <Clock size={11} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]">
            <RefreshCw size={11} /> Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
      case 'Proposal Sent':
      case 'Negotiation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]">
            <Clock size={11} /> {status}
          </span>
        );
      case 'Converted':
      case 'Won':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]">
            <CheckCircle2 size={11} /> Converted
          </span>
        );
      case 'Not Interested':
      case 'Lost':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)]">
            <XCircle size={11} /> Not Interested
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)]">
            {status || '—'}
          </span>
        );
    }
  };

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <OriginationMobileSaleLeadsList />
      </div>

      {/* Web Desktop Experience */}
      <div className="hidden md:block space-y-6 pb-12 font-sans text-[var(--text)]">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Sales Pipeline Directory
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
              <span>Sales Leads Directory</span>
              <span className="text-xs font-semibold text-[var(--accent-pink-deep)] bg-[var(--accent-pink-tint)] px-2.5 py-0.5 rounded-full">
                {rawLeads.length} Total
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
              Manage, qualify, and track your sales origination prospects and conversion pipeline.
            </p>
          </div>

          <button 
            type="button"
            onClick={() => setIsAddLeadOpen(true)}
            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white h-9 px-4.5 transition-all gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Plus size={15} />
            <span>Add Lead</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-3.5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
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
                      ? 'bg-[var(--ink)] text-white shadow-xs'
                      : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--line)] border border-[var(--line)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[var(--line)] text-[var(--muted)]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <SearchBar
            placeholder="Search by name, phone, product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            isFetching={isFetching}
            wrapperClassName="w-full lg:w-72 shrink-0"
          />
        </div>

        {/* Data Table */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-xs text-[var(--badge-danger-text)] bg-[var(--badge-danger-bg)]">
              Failed to load leads. Please check your network or try refreshing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap">Applicant Name</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Contact</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Location</th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">Loan Type</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Created Date</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="p-12 text-center">
                        <Loader2 className="animate-spin h-6 w-6 text-[var(--brand-deep)] mx-auto mb-2" />
                        <p className="text-xs text-[var(--muted)]">Loading leads directory...</p>
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-xs text-[var(--muted)]">
                        No leads found matching current filter or search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr 
                        key={lead.id} 
                        className="hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <td className="py-3 px-3.5 font-semibold text-[var(--text)] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-[8px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] font-semibold flex items-center justify-center text-[11px] shrink-0">
                              {(lead.name || 'L').charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[135px]">{lead.name || 'Unnamed Prospect'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-[var(--muted)] whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-[var(--icon-muted)]" />
                            {maskPhoneNumber(lead.phone)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-[var(--muted)] max-w-[160px] truncate" title={lead.address}>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[var(--icon-muted)] shrink-0" />
                            <span className="truncate max-w-[145px]">{lead.address || '—'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center min-w-[140px] max-w-[200px]">
                          {lead.product_type || lead.loan_type ? (
                            <span className="inline-block px-2.5 py-1 rounded-[8px] text-[11px] bg-[var(--surface-alt)] border border-[var(--line)] text-[var(--text)] font-medium text-center leading-snug">
                              {lead.product_type || lead.loan_type}
                            </span>
                          ) : (
                            <span className="text-[var(--icon-muted)]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {getStatusBadge(lead.status)}
                        </td>
                        <td className="py-3 px-3.5 text-[var(--muted)] whitespace-nowrap">
                          {lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            className="px-3 py-1 text-xs font-semibold text-[var(--brand-deep)] hover:bg-[var(--brand-tint)] rounded-full transition-colors cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
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

      <AddLeadSidebar isOpen={isAddLeadOpen} onClose={() => setIsAddLeadOpen(false)} type="sale" />
      <LeadDetailsSidebar 
        isOpen={!!selectedLead} 
        onClose={() => setSelectedLead(null)} 
        lead={selectedLead} 
        type="sale"
      />
    </>
  );
};

export default OriginationSaleLeadsList;