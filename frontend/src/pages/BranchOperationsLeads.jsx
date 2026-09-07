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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <Clock size={11} /> New
          </span>
        );
      case 'Follow Up':
      case 'Contacted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f3e8fd] text-[#8430ce] border border-[#e9d5ff]">
            <RefreshCw size={11} /> Follow Up
          </span>
        );
      case 'Active':
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
            <Clock size={11} /> {status}
          </span>
        );
      case 'Converted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
            <CheckCircle2 size={11} /> Converted
          </span>
        );
      case 'Not Interested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">
            <XCircle size={11} /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
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

      {/* Desktop Experience (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                Branch Operations &bull; Directory
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight flex items-center gap-2" style={{ fontWeight: 500 }}>
              <span>Branch <span className="font-medium italic text-[#7C4DFF]">Leads Directory</span></span> 
              <span className="text-xs font-semibold text-[#7C4DFF] bg-[#f3e8fd] border border-[#e9d5ff] px-2.5 py-0.5 rounded-full">
                {counts.All} Total
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5 flex items-center gap-1.5">
              <Building2 size={13} className="text-[#7C4DFF]" />
              <span>All loan and sales prospects for <strong>{branch.name}</strong>.</span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-sans">Read-Only View</span>
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4 shadow-xs space-y-3.5">
          {/* Top Row: Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {statusFilterTabs.map((tab) => {
              const isSelected = selectedStatusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#f3e8fd] text-[#7C4DFF] border border-[#e9d5ff] shadow-2xs font-bold'
                      : 'bg-[#f8fafd] text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f] border border-[#dadce0]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
                    className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full text-[10.5px] font-bold leading-none tabular-nums text-center ${
                      isSelected ? 'bg-[#7C4DFF] text-white' : 'bg-[#e0e3e7] text-[#5f6368]'
                    }`}
                  >
                    {tab.count ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Row: Pipeline Dropdown, Officer Dropdown & Search Input */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-[#f1f3f4]">
            <div className="flex flex-wrap items-center gap-3">
              {/* Pipeline Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#5f6368] whitespace-nowrap flex items-center gap-1">
                  <Layers size={13} className="text-[#7C4DFF]" />
                  <span>Pipeline:</span>
                </span>
                <div className="relative">
                  <select
                    value={selectedPipeline}
                    onChange={(e) => setSelectedPipeline(e.target.value)}
                    className="pl-3 pr-8 py-1.5 text-xs bg-[#f8fafd] border border-[#dadce0] rounded-full text-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/30 focus:border-[#7C4DFF] transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="all">All Pipelines ({counts.All})</option>
                    <option value="loans">Loans Pipeline ({counts.loans})</option>
                    <option value="sales">Sales Pipeline ({counts.sales})</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#80868b]">
                    <ChevronDown size={12} />
                  </div>
                </div>
              </div>

              {/* Officer Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#5f6368] whitespace-nowrap flex items-center gap-1">
                  <UserCheck size={13} className="text-[#7C4DFF]" />
                  <span>Officer:</span>
                </span>
                <div className="relative">
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="pl-3 pr-8 py-1.5 text-xs bg-[#f8fafd] border border-[#dadce0] rounded-full text-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/30 focus:border-[#7C4DFF] transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="all">All Branch Officers ({filteredCreators.length})</option>
                    {filteredCreators.map((creator) => (
                      <option key={creator.userId} value={creator.userId}>
                        {creator.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#80868b]">
                    <ChevronDown size={12} />
                  </div>
                </div>
              </div>
            </div>

            {/* Search Box - Matches Admin Pages Google Pill Search */}
            <div className="relative w-full lg:w-72 shrink-0">
              {isFetching ? (
                <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C4DFF] animate-spin pointer-events-none" />
              ) : (
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
              )}
              <input
                type="search"
                className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#7C4DFF] focus:ring-2 focus:ring-[#7C4DFF]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
                placeholder="Search name, phone, loan/product, officer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-xs text-[#c5221f] bg-[#fce8e6]/30">
              Failed to load branch leads. Please check your network or try refreshing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap">Applicant Name</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Pipeline</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Contact</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Location</th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">Type</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Created By</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-right">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f4]">
                  {isInitialLoading ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center">
                        <Loader2 className="animate-spin h-6 w-6 text-[#7C4DFF] mx-auto mb-2" />
                        <p className="text-xs text-[#5f6368]">Loading all branch leads...</p>
                      </td>
                    </tr>
                  ) : rawLeads.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-xs text-[#5f6368]">
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
                          className="hover:bg-[#f8fafd] transition-colors"
                        >
                          {/* Name */}
                          <td className="py-3 px-3.5 font-semibold text-[#1f1f1f] whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-[11px] shrink-0 border ${
                                  isSale
                                    ? 'bg-[#e6fffa] text-[#0d9488] border-[#b2f5ea]'
                                    : 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]'
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
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isSale
                                  ? 'bg-[#e6fffa] text-[#0d9488] border border-[#b2f5ea]'
                                  : 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]'
                              }`}
                            >
                              {isSale ? 'Sales' : 'Loans'}
                            </span>
                          </td>

                          {/* Contact */}
                          <td className="py-3 px-3.5 text-[#5f6368] whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-[#80868b]" />
                              {maskPhoneNumber(lead.phone)}
                            </span>
                          </td>

                          {/* Location - Masked */}
                          <td className="py-3 px-3.5 text-[#5f6368] max-w-[160px] truncate">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#80868b] shrink-0" />
                              <span className="truncate max-w-[145px]">{maskAddress(lead.address)}</span>
                            </span>
                          </td>

                          {/* Type */}
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            {typeText ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] bg-[#f8fafd] border border-[#e0e3e7] text-[#1f1f1f] whitespace-nowrap font-medium text-center">
                                {typeText}
                              </span>
                            ) : (
                              <span className="text-[#80868b] font-medium">-</span>
                            )}
                          </td>

                          {/* Created By */}
                          <td className="py-3 px-3.5 text-[#444746] whitespace-nowrap font-medium">
                            <span className="inline-flex items-center gap-1">
                              <UserCheck size={12} className="text-[#7C4DFF]" />
                              <span>{lead.creator_name || 'Branch Officer'}</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {getStatusBadge(lead.status)}
                          </td>

                          {/* Created Date */}
                          <td className="py-3 px-3.5 text-[#5f6368] whitespace-nowrap text-right">
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
