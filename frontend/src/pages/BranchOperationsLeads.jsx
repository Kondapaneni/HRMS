import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, MapPin, CheckCircle2, Clock, Loader2, XCircle, RefreshCw, Eye, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import SearchBar from '../components/ui/SearchBar';
import BranchOperationsMobileLeads from './BranchOperationsMobileLeads';
import LeadDetailsSidebar from '../components/LeadDetailsSidebar';
import { getBranchLeads } from '../services/loanServices';
import { maskPhoneNumber, maskAddress } from '../utils/phoneUtils';
import PageLoader from '../components/PageLoader';

const BranchOperationsLeads = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState('all'); // 'all' | 'loans' | 'sales'
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [selectedLead, setSelectedLead] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['branchOperationsLeads', selectedEmployee, selectedPipeline, selectedStatusFilter, debouncedSearch],
    queryFn: getBranchLeads,
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
  });

  const branch = data?.branch || { name: 'Assigned Branch' };
  const allCreators = useMemo(() => data?.creators || [], [data?.creators]);
  const rawLeads = useMemo(() => data?.leads || [], [data?.leads]);
  const counts = data?.counts || {
    All: rawLeads.length,
    New: 0,
    'Follow Up': 0,
    Converted: 0,
    'Not Interested': 0,
    loans: 0,
    sales: 0
  };

  // Filter creators by pipeline (if officer only created loan leads vs sale leads)
  const filteredCreators = useMemo(() => {
    if (selectedPipeline === 'loans') {
      return allCreators.filter(c => c.has_loans !== false);
    }
    if (selectedPipeline === 'sales') {
      return allCreators.filter(c => c.has_sales !== false);
    }
    return allCreators;
  }, [allCreators, selectedPipeline]);

  // Reset employee filter if not in filtered list
  useEffect(() => {
    if (selectedEmployee !== 'all' && filteredCreators.length > 0) {
      const exists = filteredCreators.some(c => c.userId === selectedEmployee);
      if (!exists) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- clear an employee filter that is invalid for the newly selected pipeline.
        setSelectedEmployee('all');
      }
    }
  }, [selectedPipeline, filteredCreators, selectedEmployee]);

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
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]">
            <Clock size={11} /> {status}
          </span>
        );
      case 'Converted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]">
            <CheckCircle2 size={11} /> Converted
          </span>
        );
      case 'Not Interested':
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

  const isInitialLoading = isLoading && !data;

  if (isInitialLoading) {
    return <PageLoader message="Loading Branch Leads..." />;
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <BranchOperationsMobileLeads />
      </div>

      {/* Web Desktop Experience */}
      <div className="hidden md:block space-y-6 pb-12 font-sans text-[var(--text)]">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Branch Leads Directory
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
              <span>Branch Leads Directory</span> 
              <span className="text-xs font-semibold text-[var(--branch-deep)] bg-[var(--branch-tint)] px-2.5 py-0.5 rounded-full">
                {counts.All} Total
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
              Comprehensive overview of loan and sales prospects across {branch.name}.
            </p>
          </div>

          {/* Quick Filter Selectors in Header */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* 1. Pipeline Selector */}
            <div className="relative">
              <select
                value={selectedPipeline}
                onChange={(e) => setSelectedPipeline(e.target.value)}
                className="h-9 px-3.5 pr-8 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] text-xs font-medium text-[var(--text)] hover:border-[var(--branch)] focus:outline-none focus:ring-1 focus:ring-[var(--branch)] appearance-none cursor-pointer transition-colors shadow-xs"
              >
                <option value="all">All Pipelines ({counts.All})</option>
                <option value="loans">Loans Pipeline ({counts.loans})</option>
                <option value="sales">Sales Pipeline ({counts.sales})</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
            </div>

            {/* 2. Officer Selector */}
            <div className="relative">
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="h-9 px-3.5 pr-8 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] text-xs font-medium text-[var(--text)] hover:border-[var(--branch)] focus:outline-none focus:ring-1 focus:ring-[var(--branch)] appearance-none cursor-pointer transition-colors shadow-xs"
              >
                <option value="all">All Branch Officers ({filteredCreators.length})</option>
                {filteredCreators.map((creator) => (
                  <option key={creator.userId} value={creator.userId}>
                    {creator.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-3.5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'All', label: 'All', count: counts.All },
              { id: 'New', label: 'New', count: counts.New },
              { id: 'Follow Up', label: 'Follow Up', count: counts['Follow Up'] },
              { id: 'Converted', label: 'Converted', count: counts.Converted },
              { id: 'Not Interested', label: 'Not Interested', count: counts['Not Interested'] },
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
            placeholder="Search by name, phone, loan/product..."
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
              Failed to load branch leads. Please check your network or try refreshing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap">Applicant Name</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Pipeline</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Contact</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Location</th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">Type</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Created By</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Created Date</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {isInitialLoading ? (
                    <tr>
                      <td colSpan="9" className="p-12 text-center">
                        <Loader2 className="animate-spin h-6 w-6 text-[var(--branch-deep)] mx-auto mb-2" />
                        <p className="text-xs text-[var(--muted)]">Loading branch leads...</p>
                      </td>
                    </tr>
                  ) : rawLeads.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-12 text-xs text-[var(--muted)]">
                        No leads found matching current filter or search criteria.
                      </td>
                    </tr>
                  ) : (
                    rawLeads.map((lead) => {
                      const isSale = Boolean(lead.is_sale);
                      const displayName = lead.name || 'Unnamed Prospect';
                      const initial = (displayName.charAt(0) || 'L').toUpperCase();
                      const isOpportunity = !lead.loan_type || lead.loan_type.trim().toLowerCase() === 'opportunity';
                      const typeText = !isOpportunity ? lead.loan_type.trim() : '';

                      return (
                        <tr 
                          key={lead.id} 
                          className="hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <td className="py-3 px-3.5 font-semibold text-[var(--text)] whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-[8px] font-semibold flex items-center justify-center text-[11px] shrink-0 ${
                                isSale 
                                  ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]'
                                  : 'bg-[var(--brand-tint)] text-[var(--brand-deep)]'
                              }`}>
                                {initial}
                              </div>
                              <span className="truncate max-w-[135px]">{displayName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${
                              isSale
                                ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]'
                                : 'bg-[var(--brand-tint)] text-[var(--brand-deep)]'
                            }`}>
                              {isSale ? 'Sales' : 'Loans'}
                            </span>
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
                              <span className="truncate max-w-[145px]">{maskAddress(lead.address) || '—'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            {typeText ? (
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-[8px] text-[11px] bg-[var(--surface-alt)] border border-[var(--line)] text-[var(--text)] whitespace-nowrap font-medium text-center">
                                {typeText}
                              </span>
                            ) : (
                              <span className="text-[var(--icon-muted)]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-[var(--muted)] whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-[var(--text)]">{lead.creator_name || 'Branch Officer'}</span>
                            </span>
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
                              className="px-3 py-1 text-xs font-semibold text-[var(--branch-deep)] hover:bg-[var(--branch-tint)] rounded-full transition-colors cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <LeadDetailsSidebar 
        isOpen={!!selectedLead} 
        onClose={() => setSelectedLead(null)} 
        lead={selectedLead} 
        type={selectedLead?.is_sale ? 'sale' : 'loan'}
      />
    </>
  );
};

export default BranchOperationsLeads;