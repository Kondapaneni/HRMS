import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  XCircle, 
  RefreshCw, 
  X, 
  Building2, 
  UserCheck, 
  Layers, 
  ChevronDown 
} from 'lucide-react';
import { format } from 'date-fns';
import BranchOperationsMobileLeads from './BranchOperationsMobileLeads';
import { getBranchLeads } from '../services/loanServices';
import { maskPhoneNumber, maskAddress } from '../utils/phoneUtils';
import PageLoader from '../components/PageLoader';

const BranchOperationsLeads = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState('all'); // 'all' | 'loans' | 'sales'
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

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
  const allCreators = data?.creators || [];
  const rawLeads = data?.leads || [];
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
        setSelectedEmployee('all');
      }
    }
  }, [selectedPipeline, filteredCreators, selectedEmployee]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] border border-[var(--badge-info-text)]/15">
            <Clock size={11} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--badge-warning-text)]/15">
            <RefreshCw size={11} /> Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--badge-warning-text)]/15">
            <Clock size={11} /> {status}
          </span>
        );
      case 'Converted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border border-[var(--badge-success-text)]/15">
            <CheckCircle2 size={11} /> Converted
          </span>
        );
      case 'Not Interested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] border border-[var(--badge-danger-text)]/15">
            <XCircle size={11} /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)] border border-[var(--line)]">
            {status || '—'}
          </span>
        );
    }
  };

  const statusFilterTabs = [
    { key: 'All', label: 'All', count: counts.All },
    { key: 'New', label: 'New', count: counts.New },
    { key: 'Follow Up', label: 'Follow Up', count: counts['Follow Up'] },
    { key: 'Converted', label: 'Converted', count: counts.Converted },
    { key: 'Not Interested', label: 'Closed', count: counts['Not Interested'] },
  ];

  const isInitialLoading = isLoading && !data;

  if (isInitialLoading) {
    return <PageLoader message="Loading Branch Leads..." />;
  }

  return (
    <>
      {/* Mobile Experience */}
      <div className="md:hidden">
        <BranchOperationsMobileLeads />
      </div>

      {/* Desktop Experience */}
      <div className="hidden md:block space-y-6 pb-12 font-sans antialiased text-[var(--text)]">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                Branch Operations &bull; Directory
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2.5">
              <span>Branch Leads Directory</span> 
              <span className="text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[8px]">
                {counts.All} Total
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5 flex items-center gap-1.5">
              <Building2 size={13} className="text-[var(--brand-deep)]" />
              <span>All loan and sales prospects for <strong>{branch.name}</strong>.</span>
              <span>&bull;</span>
              <span className="text-[11px] bg-[var(--surface-alt)] border border-[var(--line)] text-[var(--muted)] px-2 py-0.5 rounded-[6px]">Read-Only View</span>
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-3.5">
          {/* Top Row: Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {statusFilterTabs.map((tab) => {
              const isSelected = selectedStatusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[var(--ink)] text-white shadow-xs font-semibold'
                      : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[10.5px] font-bold leading-none tabular-nums text-center ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[var(--line)] text-[var(--text-2)]'
                    }`}
                  >
                    {tab.count ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Row: Pipeline Dropdown, Officer Dropdown & Search Input */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-[var(--line)]">
            <div className="flex flex-wrap items-center gap-3">
              {/* Pipeline Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--muted)] whitespace-nowrap flex items-center gap-1">
                  <Layers size={13} className="text-[var(--brand-deep)]" />
                  <span>Pipeline:</span>
                </span>
                <div className="relative">
                  <select
                    value={selectedPipeline}
                    onChange={(e) => setSelectedPipeline(e.target.value)}
                    className="pl-3 pr-7 py-1.5 text-xs bg-[var(--surface-alt)] border border-[var(--line)] rounded-[10px] text-[var(--text)] focus:outline-none focus:border-[var(--brand)] transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="all">All Pipelines ({counts.All})</option>
                    <option value="loans">Loans Pipeline ({counts.loans})</option>
                    <option value="sales">Sales Pipeline ({counts.sales})</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-[var(--muted)]">
                    <ChevronDown size={12} />
                  </div>
                </div>
              </div>

              {/* Officer Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--muted)] whitespace-nowrap flex items-center gap-1">
                  <UserCheck size={13} className="text-[var(--brand-deep)]" />
                  <span>Officer:</span>
                </span>
                <div className="relative">
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="pl-3 pr-7 py-1.5 text-xs bg-[var(--surface-alt)] border border-[var(--line)] rounded-[10px] text-[var(--text)] focus:outline-none focus:border-[var(--brand)] transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="all">All Branch Officers ({filteredCreators.length})</option>
                    {filteredCreators.map((creator) => (
                      <option key={creator.userId} value={creator.userId}>
                        {creator.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-[var(--muted)]">
                    <ChevronDown size={12} />
                  </div>
                </div>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative w-full lg:w-72 shrink-0">
              {isFetching ? (
                <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-deep)] animate-spin pointer-events-none" />
              ) : (
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
              )}
              <input
                type="search"
                className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[var(--surface-alt)] border border-[var(--line)] rounded-[10px] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--brand)] transition-all"
                placeholder="Search name, phone, loan/product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
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
                <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 whitespace-nowrap">Applicant Name</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Pipeline</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Contact</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Location</th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">Type</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Created By</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 whitespace-nowrap text-right">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {isInitialLoading ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center">
                        <Loader2 className="animate-spin h-6 w-6 text-[var(--brand-deep)] mx-auto mb-2" />
                        <p className="text-xs text-[var(--muted)]">Loading all branch leads...</p>
                      </td>
                    </tr>
                  ) : rawLeads.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-xs text-[var(--muted)]">
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
                          className="hover:bg-[var(--surface-alt)]/60 transition-colors"
                        >
                          {/* Name */}
                          <td className="py-3 px-4 font-medium text-[var(--text)] whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-[8px] font-semibold flex items-center justify-center text-[11px] shrink-0 border ${
                                  isSale
                                    ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border-[var(--accent-pink)]/20'
                                    : 'bg-[var(--brand-tint)] text-[var(--brand-deep)] border-[var(--brand)]/20'
                                }`}
                              >
                                {initial}
                              </div>
                              <span className="truncate max-w-[140px]">
                                {displayName}
                              </span>
                            </div>
                          </td>

                          {/* Pipeline */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${
                                isSale
                                  ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]'
                                  : 'bg-[var(--brand-tint)] text-[var(--brand-deep)]'
                              }`}
                            >
                              {isSale ? 'Sales' : 'Loans'}
                            </span>
                          </td>

                          {/* Contact */}
                          <td className="py-3 px-3.5 text-[var(--muted)] whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-[var(--muted)]" />
                              {maskPhoneNumber(lead.phone)}
                            </span>
                          </td>

                          {/* Location - Masked */}
                          <td className="py-3 px-3.5 text-[var(--muted)] max-w-[160px] truncate">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                              <span className="truncate max-w-[145px]">{maskAddress(lead.address)}</span>
                            </span>
                          </td>

                          {/* Type */}
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            {typeText ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-[6px] text-[11px] bg-[var(--surface-alt)] border border-[var(--line)] text-[var(--text-2)] whitespace-nowrap font-medium text-center">
                                {typeText}
                              </span>
                            ) : (
                              <span className="text-[var(--muted)] font-medium">-</span>
                            )}
                          </td>

                          {/* Created By */}
                          <td className="py-3 px-3.5 text-[var(--text-2)] whitespace-nowrap font-medium">
                            <span className="inline-flex items-center gap-1">
                              <UserCheck size={12} className="text-[var(--brand-deep)]" />
                              <span>{lead.creator_name || 'Branch Officer'}</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {getStatusBadge(lead.status)}
                          </td>

                          {/* Created Date */}
                          <td className="py-3 px-4 text-[var(--muted)] whitespace-nowrap text-right">
                            {lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy') : '-'}
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
    </>
  );
};

export default BranchOperationsLeads;
