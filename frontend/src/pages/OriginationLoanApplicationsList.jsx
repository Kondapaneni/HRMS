import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Briefcase, 
  Building2, 
  User, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  ArrowUpRight, 
  RefreshCw, 
  ExternalLink, 
  Calendar, 
  ShieldCheck, 
  Phone, 
  X,
  Check,
  FileEdit
} from 'lucide-react';
import { format } from 'date-fns';
import { getLoanApplications } from '../services/loanServices';
import OriginationMobileLoanApplicationsList from './OriginationMobileLoanApplicationsList';
import { maskPhoneNumber } from '../utils/phoneUtils';

// Helper: Safe date formatter
const formatDateSafe = (dateStr, formatPattern = 'MMM d, yyyy') => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : format(d, formatPattern);
  } catch (e) {
    return '—';
  }
};

// Google Workspace KPI Stat Card
const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme = 'blue' }) => {
  const themeClasses = {
    blue: {
      bg: 'bg-[#e8f0fe]',
      text: 'text-[#1a73e8]',
      border: 'border-[#d2e3fc]',
    },
    green: {
      bg: 'bg-[#e6f4ea]',
      text: 'text-[#137333]',
      border: 'border-[#ceead6]',
    },
    amber: {
      bg: 'bg-[#fef7e0]',
      text: 'text-[#b06000]',
      border: 'border-[#feefc3]',
    },
    purple: {
      bg: 'bg-[#f3e8fd]',
      text: 'text-[#8430ce]',
      border: 'border-[#e9d5ff]',
    },
    red: {
      bg: 'bg-[#fce8e6]',
      text: 'text-[#c5221f]',
      border: 'border-[#fad2cf]',
    }
  }[colorTheme] || {
    bg: 'bg-[#e8f0fe]',
    text: 'text-[#1a73e8]',
    border: 'border-[#d2e3fc]',
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4.5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider block mb-1">
            {title}
          </span>
          <h3 className="text-2xl font-normal text-[#1f1f1f] tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-2.5 rounded-2xl ${themeClasses.bg} ${themeClasses.text} border ${themeClasses.border} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {subtitle && (
        <div className="mt-3 pt-2.5 border-t border-[#f1f3f4] flex items-center justify-between text-xs text-[#5f6368]">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
};

const OriginationLoanApplicationsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loanTypeFilter, setLoanTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selected application for slideover drawer
  const [selectedApp, setSelectedApp] = useState(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: response, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['origination', 'applications', 'list'],
    queryFn: getLoanApplications,
    staleTime: 2 * 60 * 1000,
  });

  const applications = response?.applications || [];

  // Compute Metrics & Stats across all applications
  const stats = useMemo(() => {
    let approvedCount = 0;
    let inReviewCount = 0;
    let draftCount = 0;

    applications.forEach((app) => {
      const st = (app.status || '').toLowerCase();
      if (st === 'approved') {
        approvedCount += 1;
      } else if (st === 'under review' || st === 'under_review' || st === 'created') {
        inReviewCount += 1;
      } else if (st === 'draft') {
        draftCount += 1;
      }
    });

    return {
      totalCount: applications.length,
      approvedCount,
      inReviewCount,
      draftCount,
    };
  }, [applications]);

  // Filter and Sort applications
  const filteredApps = useMemo(() => {
    const filtered = applications.filter((app) => {
      const name = app.applicant_name || app.form_data?.applicant_name || app.form_data?.name || '';
      const phone = app.phone_number || app.form_data?.phone_number || app.form_data?.phone || '';
      const appId = app.application_id || '';
      const leadId = app.lead_id || '';
      const appLoanType = app.loan_type || app.form_data?.loan_type || 'Personal Loan';
      const status = app.status || 'Draft';

      const matchesSearch = 
        name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        phone.includes(debouncedSearch) ||
        appId.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        String(leadId).includes(debouncedSearch) ||
        appLoanType.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesStatus = 
        statusFilter === 'All' 
          ? true 
          : statusFilter === 'Under Review'
          ? (status === 'Under Review' || status === 'under_review')
          : status === statusFilter;

      const matchesLoanType = loanTypeFilter === 'All' ? true : appLoanType === loanTypeFilter;

      return matchesSearch && matchesStatus && matchesLoanType;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at || a.updated_at || 0) - new Date(b.created_at || b.updated_at || 0);
      }
      if (sortBy === 'name_asc') {
        const nameA = a.applicant_name || a.form_data?.applicant_name || '';
        const nameB = b.applicant_name || b.form_data?.applicant_name || '';
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'name_desc') {
        const nameA = a.applicant_name || a.form_data?.applicant_name || '';
        const nameB = b.applicant_name || b.form_data?.applicant_name || '';
        return nameB.localeCompare(nameA);
      }
      return 0;
    });

    return filtered;
  }, [applications, debouncedSearch, statusFilter, loanTypeFilter, sortBy]);

  // Paginate list
  const totalFilteredCount = filteredApps.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / limit));
  const paginatedApps = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredApps.slice(start, start + limit);
  }, [filteredApps, page, limit]);

  // Direct Application Studio Navigator
  const handleOpenStudio = (app) => {
    navigate('/employee/loans/view-application', {
      state: {
        application: app,
        form_data: app.form_data,
        lead_id: app.lead_id,
        name: app.applicant_name || app.form_data?.applicant_name || app.form_data?.name,
        phone: app.phone_number || app.form_data?.phone_number || app.form_data?.phone,
        from: '/employee/loans/origination/applications',
      },
    });
  };

  // Direct Loan Form Editor (for drafts or modifications)
  const handleEditForm = (app) => {
    navigate('/employee/loans/form', {
      state: {
        loan_type: app.loan_type || 'Business Loan',
        loanType: app.loan_type || 'Business Loan',
        application: app,
        form_data: app.form_data,
        id: app.id,
        lead_id: app.lead_id,
        mode: 'edit',
        isEdit: true,
        from: '/employee/loans/origination/applications',
      },
    });
  };

  const getStatusBadge = (status) => {
    const s = String(status || 'Draft').toLowerCase();
    if (s === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </span>
      );
    }
    if (s === 'under review' || s === 'under_review') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] whitespace-nowrap">
          <Clock className="w-3 h-3" /> Under Review
        </span>
      );
    }
    if (s === 'created') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd] whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3" /> Created
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] whitespace-nowrap">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] whitespace-nowrap">
        <Clock className="w-3 h-3" /> {status || 'Draft'}
      </span>
    );
  };

  const getLoanTypeBadge = (loanType) => {
    const isBusiness = String(loanType).toLowerCase().includes('business');
    return (
      <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap text-center ${
        isBusiness 
          ? 'bg-[#f3e8fd] text-[#8430ce] border-[#e9d5ff]' 
          : 'bg-[#f1f3f4] text-[#3c4043] border-[#dadce0]'
      }`}>
        {isBusiness ? <Building2 className="w-3 h-3 text-[#8430ce]" /> : <User className="w-3 h-3 text-[#5f6368]" />}
        <span className="text-center">{loanType || 'Personal Loan'}</span>
      </span>
    );
  };

  // Status Filter options with counts
  const statusTabs = [
    { key: 'All', label: 'All Applications', count: applications.length },
    { key: 'Created', label: 'Created', count: applications.filter(a => (a.status || '').toLowerCase() === 'created').length },
    { key: 'Under Review', label: 'Under Review', count: applications.filter(a => (a.status || '').toLowerCase() === 'under review' || (a.status || '').toLowerCase() === 'under_review').length },
    { key: 'Approved', label: 'Approved', count: applications.filter(a => (a.status || '').toLowerCase() === 'approved').length },
    { key: 'Rejected', label: 'Rejected', count: applications.filter(a => (a.status || '').toLowerCase() === 'rejected').length },
    { key: 'Draft', label: 'Drafts', count: applications.filter(a => (a.status || '').toLowerCase() === 'draft').length },
  ];

  return (
    <>
      {/* Mobile Screen View */}
      <div className="md:hidden">
        <OriginationMobileLoanApplicationsList />
      </div>

      {/* Web Desktop View (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Origination Loan Pipeline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2.5">
              Loan Applications
              <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">
                {applications.length} Total Applications
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Review and manage loan proposals, inspect applicant KYC & supporting documents, and track approval lifecycle.
            </p>
          </div>
        </div>

        {/* KPI Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Applications" 
            value={stats.totalCount} 
            subtitle="All submitted & drafts" 
            icon={Briefcase} 
            colorTheme="blue" 
          />
          <StatCard 
            title="Approved Loans" 
            value={stats.approvedCount} 
            subtitle="Sanctioned applications" 
            icon={CheckCircle2} 
            colorTheme="green" 
          />
          <StatCard 
            title="Under Review" 
            value={stats.inReviewCount} 
            subtitle="Active in pipeline" 
            icon={Clock} 
            colorTheme="purple" 
          />
          <StatCard 
            title="Draft Submissions" 
            value={stats.draftCount} 
            subtitle="Incomplete drafts" 
            icon={FileText} 
            colorTheme="amber" 
          />
        </div>

        {/* Filter Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#1a73e8] text-white border-[#1a73e8] shadow-2xs'
                    : 'bg-white text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] border-[#dadce0]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#f1f3f4] text-[#5f6368]'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Loan Type & Sort Toolbar */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#80868b]" />
            <input
              type="search"
              placeholder="Search by name, phone, App ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-8 py-2 text-xs bg-[#f8fafd] border border-[#dadce0] rounded-full focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 focus:border-[#1a73e8] transition-all text-[#1f1f1f] placeholder:text-[#80868b]"
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

          {/* Controls */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
            {/* Loan Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#5f6368]">Type:</span>
              <select
                value={loanTypeFilter}
                onChange={(e) => {
                  setLoanTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="h-8 px-3 rounded-full border border-[#dadce0] bg-[#f8fafd] text-xs font-semibold text-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 cursor-pointer"
              >
                <option value="All">All Types ({applications.length})</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Business Loan">Business Loan</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#5f6368]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-8 px-3 rounded-full border border-[#dadce0] bg-[#f8fafd] text-xs font-semibold text-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Applicant (A - Z)</option>
                <option value="name_desc">Applicant (Z - A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-xs text-[#c5221f] bg-[#fce8e6]/30">
              Failed to load loan applications. Please verify server connection.
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Application ID</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Applicant</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-center">Loan Product</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-center">Status</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Submitted On</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f4]">
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="p-14 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <RefreshCw className="animate-spin h-6 w-6 text-[#1a73e8] mb-2" />
                          <p className="text-xs text-[#5f6368]">Loading loan applications directory...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedApps.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-14 text-center text-xs text-[#5f6368]">
                        <div className="flex flex-col items-center justify-center">
                          <Briefcase className="w-8 h-8 text-[#dadce0] mb-2" />
                          <p className="text-xs font-semibold text-[#1f1f1f]">No applications match your criteria</p>
                          <p className="text-[11px] text-[#5f6368] mt-0.5">Try clearing search filters or create a new application</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedApps.map((app) => {
                      const name = app.applicant_name || app.form_data?.applicant_name || app.form_data?.name || 'Unnamed Applicant';
                      const phone = app.phone_number || app.form_data?.phone_number || app.form_data?.phone;
                      const appId = app.application_id || 'LA-DRAFT';
                      const loanType = app.loan_type || app.form_data?.loan_type || 'Personal Loan';
                      const createdAt = app.created_at || app.updated_at;

                      return (
                        <tr
                          key={app.id || app.application_id}
                          onClick={() => setSelectedApp(app)}
                          className="hover:bg-[#f8fafd] transition-colors cursor-pointer"
                        >
                          {/* Application ID */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-1 rounded-md border border-[#d2e3fc]">
                              {appId}
                            </span>
                          </td>

                          {/* Applicant */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold flex items-center justify-center text-xs shrink-0 border border-[#d2e3fc]">
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-xs text-[#1f1f1f]">{name}</p>
                                <p className="text-[11px] text-[#5f6368] flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-[#80868b]" />
                                  {maskPhoneNumber(phone)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Loan Product */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-center">
                            {getLoanTypeBadge(loanType)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-center">
                            {getStatusBadge(app.status)}
                          </td>

                          {/* Submitted Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-[#5f6368]">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-[#80868b]" />
                              {formatDateSafe(createdAt, 'MMM d, yyyy')}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {app.status === 'Draft' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditForm(app)}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] border border-[#d2e3fc] rounded-full transition-colors cursor-pointer"
                                    title="Continue Filling Draft Application"
                                  >
                                    <FileEdit className="w-3.5 h-3.5" />
                                    <span>Edit Draft</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSelectedApp(app)}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#1f1f1f] bg-white hover:bg-[#f1f3f4] border border-[#dadce0] rounded-full transition-colors cursor-pointer shadow-none hover:shadow-xs"
                                    title="Quick Overview"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-[#5f6368]" />
                                    <span>Preview</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedApp(app)}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#1f1f1f] bg-white hover:bg-[#f1f3f4] border border-[#dadce0] rounded-full transition-colors cursor-pointer shadow-none hover:shadow-xs"
                                    title="Quick Overview"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-[#5f6368]" />
                                    <span>Preview</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenStudio(app)}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] border border-[#d2e3fc] rounded-full transition-colors cursor-pointer"
                                    title="Open Full Loan Application Studio"
                                  >
                                    <span>Studio</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <p className="text-[#5f6368]">
                Showing <span className="font-semibold text-[#1f1f1f]">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-[#1f1f1f]">{Math.min(page * limit, totalFilteredCount)}</span> of <span className="font-semibold text-[#1f1f1f]">{totalFilteredCount}</span> applications
              </p>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-[#dadce0] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-xs font-medium text-[#1f1f1f] bg-white border border-[#dadce0] rounded-full">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-[#dadce0] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slideover Application Quick Details Drawer (Desktop) */}
      {selectedApp && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedApp(null); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-white shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[#e0e3e7]"
          >
            {/* Top 4-Color Google Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                  <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Loan Origination</span>
                </div>
                <h2 className="text-lg font-semibold text-[#1f1f1f] flex items-center gap-2">
                  Application Details
                  <span className="text-xs font-mono font-normal text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2 py-0.5 rounded">
                    {selectedApp.application_id || 'LA-DRAFT'}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-xs">
              {/* Applicant Overview Card */}
              <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold flex items-center justify-center text-sm border border-[#d2e3fc] shrink-0">
                    {(selectedApp.applicant_name || selectedApp.form_data?.applicant_name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1f1f1f] truncate">
                      {selectedApp.applicant_name || selectedApp.form_data?.applicant_name || 'Unnamed Applicant'}
                    </p>
                    <p className="text-xs text-[#5f6368] mt-0.5">
                      {maskPhoneNumber(selectedApp.phone_number || selectedApp.form_data?.phone_number)}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(selectedApp.status)}
                  </div>
                </div>

                {/* Extended Contact / Identity Details */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#e0e3e7]/80 text-xs">
                  <div>
                    <span className="text-[#5f6368] block">Gender & Age</span>
                    <span className="font-semibold text-[#1f1f1f] block">
                      {selectedApp.form_data?.gender || '—'} {selectedApp.form_data?.age ? `(${selectedApp.form_data.age} yrs)` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5f6368] block">Marital Status</span>
                    <span className="font-semibold text-[#1f1f1f] block">
                      {selectedApp.form_data?.marital_status ? (selectedApp.form_data.marital_status === 'Yes' ? 'Married' : 'Single') : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5f6368] block">Own House</span>
                    <span className="font-semibold text-[#1f1f1f] block">
                      {selectedApp.form_data?.own_house || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5f6368] block">Co-Applicant</span>
                    <span className="font-semibold text-[#1f1f1f] block">
                      {selectedApp.form_data?.has_co_applicant === 'Yes' ? 'Yes (Added)' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Category & Submission Highlights */}
              <div className="bg-[#e8f0fe] border border-[#d2e3fc] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#1a73e8] uppercase tracking-wider block">Product Category</span>
                    <span className="text-base font-bold text-[#1f1f1f] mt-0.5 block">
                      {selectedApp.loan_type || selectedApp.form_data?.loan_type || 'Personal Loan'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-[#1a73e8] uppercase tracking-wider block">Application Status</span>
                    <div className="mt-1">
                      {getStatusBadge(selectedApp.status)}
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#d2e3fc]/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-[#1a73e8] uppercase tracking-wider block">Application ID</span>
                    <p className="font-mono font-semibold text-[#1f1f1f] mt-0.5">
                      {selectedApp.application_id || 'LA-DRAFT'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[#1a73e8] uppercase tracking-wider block">Employment Mode</span>
                    <p className="font-semibold text-[#1f1f1f] mt-0.5">
                      {selectedApp.form_data?.employment || (selectedApp.loan_type === 'Business Loan' ? 'Business' : 'Salaried / Job')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Details (If Business Loan) */}
              {(selectedApp.form_data?.business_name || selectedApp.loan_type === 'Business Loan') && (
                <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] space-y-2.5">
                  <span className="font-semibold text-[#1f1f1f] text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#1a73e8]" /> Business Information
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-[#5f6368] block">Enterprise Name</span>
                      <span className="font-semibold text-[#1f1f1f] block">
                        {selectedApp.form_data?.business_name || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#5f6368] block">Monthly Income</span>
                      <span className="font-semibold text-[#1f1f1f] block">
                        {selectedApp.form_data?.business_income_per_month ? `₹${selectedApp.form_data?.business_income_per_month}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Supporting Documents Checklist */}
              <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1f1f1f] text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#137333]" /> KYC & Document Checklist
                  </span>
                  <span className="text-[10px] font-semibold text-[#5f6368]">
                    {Object.keys(selectedApp.form_data?.documents || selectedApp.documents || {}).length} Attached
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {Object.entries(selectedApp.form_data?.documents || selectedApp.documents || {}).length === 0 ? (
                    <p className="text-[#80868b] italic text-xs py-1">No digital documents attached to this application.</p>
                  ) : (
                    Object.entries(selectedApp.form_data?.documents || selectedApp.documents || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-white border border-[#dadce0]">
                        <span className="font-medium text-[#1f1f1f] capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        {typeof val === 'string' && val.startsWith('http') ? (
                          <a
                            href={val}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#1a73e8] hover:underline font-semibold text-[11px]"
                          >
                            <ExternalLink size={12} /> View File
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#137333] font-semibold text-[11px]">
                            <Check size={12} /> Uploaded
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Timestamp & Metadata */}
              <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] space-y-2 text-xs">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[#5f6368]">Created At</span>
                  <span className="font-semibold text-[#1f1f1f]">{formatDateSafe(selectedApp.created_at, 'MMM d, yyyy h:mm a')}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[#5f6368]">Last Modified</span>
                  <span className="font-semibold text-[#1f1f1f]">{formatDateSafe(selectedApp.updated_at, 'MMM d, yyyy h:mm a')}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex items-center gap-2.5 shrink-0 flex-wrap">
              {selectedApp.status === 'Draft' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedApp;
                      setSelectedApp(null);
                      handleEditForm(target);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer"
                  >
                    <FileEdit className="w-4 h-4" />
                    <span>Continue / Edit Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedApp;
                      setSelectedApp(null);
                      handleOpenStudio(target);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
                  >
                    <span>Studio</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedApp;
                    setSelectedApp(null);
                    handleOpenStudio(target);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer"
                >
                  <span>Open in Loan Application Studio</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2.5 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
};

export default OriginationLoanApplicationsList;
