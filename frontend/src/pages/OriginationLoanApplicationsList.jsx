import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import SearchBar from '../components/ui/SearchBar';
import { 
  Search, 
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
  FileEdit,
  Loader2
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

// Premium Stat Card
const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme = 'blue' }) => {
  const themeClasses = {
    blue: {
      bg: 'bg-[var(--brand-tint)]',
      text: 'text-[var(--brand-deep)]',
    },
    green: {
      bg: 'bg-[var(--badge-success-bg)]',
      text: 'text-[var(--badge-success-text)]',
    },
    amber: {
      bg: 'bg-[var(--badge-warning-bg)]',
      text: 'text-[var(--badge-warning-text)]',
    },
    purple: {
      bg: 'bg-[var(--brand-tint)]',
      text: 'text-[var(--brand-deep)]',
    },
    red: {
      bg: 'bg-[var(--badge-danger-bg)]',
      text: 'text-[var(--badge-danger-text)]',
    }
  }[colorTheme] || {
    bg: 'bg-[var(--brand-tint)]',
    text: 'text-[var(--brand-deep)]',
  };

  return (
    <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">
            {title}
          </span>
          <h3 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-2.5 rounded-[12px] ${themeClasses.bg} ${themeClasses.text} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {subtitle && (
        <div className="mt-3 pt-2.5 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted)]">
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

  const { data: response, isLoading, error, isFetching } = useQuery({
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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </span>
      );
    }
    if (s === 'under review' || s === 'under_review') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] whitespace-nowrap">
          <Clock className="w-3 h-3" /> Under Review
        </span>
      );
    }
    if (s === 'created') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3" /> Created
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] whitespace-nowrap">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[8px] text-[11px] font-semibold bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] whitespace-nowrap">
        <Clock className="w-3 h-3" /> {status || 'Draft'}
      </span>
    );
  };

  const getLoanTypeBadge = (loanType) => {
    const isBusiness = String(loanType).toLowerCase().includes('business');
    return (
      <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-[8px] text-[11px] font-medium whitespace-nowrap text-center ${
        isBusiness 
          ? 'bg-[var(--brand-tint)] text-[var(--brand-deep)]' 
          : 'bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--line)]'
      }`}>
        {isBusiness ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3 text-[var(--muted)]" />}
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

      {/* Web Desktop View */}
      <div className="hidden md:block space-y-6 pb-12 font-sans text-[var(--text)]">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Origination Loan Pipeline
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2.5">
              <span>Loan Applications Directory</span>
              <span className="text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-full">
                {applications.length} Total
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
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
            colorTheme="cyan" 
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
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                    ? 'bg-[var(--ink)] text-white border-transparent shadow-xs'
                    : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] border-[var(--line)]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[var(--surface-alt)] text-[var(--muted)]'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Loan Type & Sort Toolbar */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-3.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <SearchBar
            placeholder="Search by name, phone, App ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            isFetching={isFetching}
            wrapperClassName="w-full md:w-80"
          />

          {/* Controls */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
            {/* Loan Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[var(--muted)]">Type:</span>
              <select
                value={loanTypeFilter}
                onChange={(e) => {
                  setLoanTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="h-8 px-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface-alt)] text-xs font-semibold text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 cursor-pointer"
              >
                <option value="All">All Types ({applications.length})</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Business Loan">Business Loan</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[var(--muted)]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-8 px-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface-alt)] text-xs font-semibold text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 cursor-pointer"
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
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-xs text-[var(--badge-danger-text)] bg-[var(--badge-danger-bg)]">
              Failed to load loan applications. Please verify server connection.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Application ID</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Applicant</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-center">Loan Product</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-center">Status</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Submitted On</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="p-14 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <RefreshCw className="animate-spin h-6 w-6 text-[var(--brand-deep)] mb-2" />
                          <p className="text-xs text-[var(--muted)]">Loading loan applications directory...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedApps.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-14 text-center text-xs text-[var(--muted)]">
                        <div className="flex flex-col items-center justify-center">
                          <Briefcase className="w-8 h-8 text-[var(--icon-muted)] mb-2" />
                          <p className="text-xs font-semibold text-[var(--text)]">No applications match your criteria</p>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5">Try clearing search filters or create a new application</p>
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
                          className="hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                        >
                          {/* Application ID */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-1 rounded-[6px]">
                              {appId}
                            </span>
                          </td>

                          {/* Applicant */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] font-semibold flex items-center justify-center text-xs shrink-0">
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-xs text-[var(--text)]">{name}</p>
                                <p className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-[var(--icon-muted)]" />
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
                          <td className="py-3.5 px-4 whitespace-nowrap text-[var(--muted)]">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-[var(--icon-muted)]" />
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
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] hover:bg-[var(--brand-tint)]/80 rounded-full transition-colors cursor-pointer"
                                    title="Continue Filling Draft Application"
                                  >
                                    <FileEdit className="w-3.5 h-3.5" />
                                    <span>Edit Draft</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSelectedApp(app)}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] border border-[var(--line)] rounded-full transition-colors cursor-pointer"
                                    title="Quick Overview"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-[var(--icon-muted)]" />
                                    <span>Preview</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedApp(app)}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] border border-[var(--line)] rounded-full transition-colors cursor-pointer"
                                    title="Quick Overview"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-[var(--icon-muted)]" />
                                    <span>Preview</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenStudio(app)}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] hover:bg-[var(--brand-tint)]/80 rounded-full transition-colors cursor-pointer"
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
            <div className="p-4 border-t border-[var(--line)] bg-[var(--surface-alt)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <p className="text-[var(--muted)]">
                Showing <span className="font-semibold text-[var(--text)]">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-[var(--text)]">{Math.min(page * limit, totalFilteredCount)}</span> of <span className="font-semibold text-[var(--text)]">{totalFilteredCount}</span> applications
              </p>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-full text-[var(--muted)] hover:bg-[var(--line)] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-[var(--line)] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-xs font-medium text-[var(--text)] bg-[var(--surface)] border border-[var(--line)] rounded-[8px]">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-full text-[var(--muted)] hover:bg-[var(--line)] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-[var(--line)] cursor-pointer"
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
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs"
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-[var(--surface)] shadow-2xl w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[var(--line)]"
          >
            {/* Drawer Header */}
            <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
              <div>
                <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  LOAN ORIGINATION
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
                  Application Details
                  <span className="text-xs font-mono font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2 py-0.5 rounded-[6px]">
                    {selectedApp.application_id || 'LA-DRAFT'}
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Applicant Overview Card */}
              <div className="bg-[var(--surface-alt)] p-4 rounded-[16px] border border-[var(--line)] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] font-semibold flex items-center justify-center text-sm shrink-0">
                    {(selectedApp.applicant_name || selectedApp.form_data?.applicant_name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">
                      {selectedApp.applicant_name || selectedApp.form_data?.applicant_name || 'Unnamed Applicant'}
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {maskPhoneNumber(selectedApp.phone_number || selectedApp.form_data?.phone_number)}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(selectedApp.status)}
                  </div>
                </div>

                {/* Extended Contact / Identity Details */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--line)] text-xs">
                  <div>
                    <span className="text-[var(--muted)] block">Gender & Age</span>
                    <span className="font-semibold text-[var(--text)] block">
                      {selectedApp.form_data?.gender || '—'} {selectedApp.form_data?.age ? `(${selectedApp.form_data.age} yrs)` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block">Marital Status</span>
                    <span className="font-semibold text-[var(--text)] block">
                      {selectedApp.form_data?.marital_status ? (selectedApp.form_data.marital_status === 'Yes' ? 'Married' : 'Single') : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block">Own House</span>
                    <span className="font-semibold text-[var(--text)] block">
                      {selectedApp.form_data?.own_house || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block">Co-Applicant</span>
                    <span className="font-semibold text-[var(--text)] block">
                      {selectedApp.form_data?.has_co_applicant === 'Yes' ? 'Yes (Added)' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Category & Submission Highlights */}
              <div className="bg-[var(--brand-tint)]/60 border border-[var(--line)] rounded-[16px] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-[var(--brand-deep)] uppercase tracking-wider block">Product Category</span>
                    <span className="text-base font-semibold text-[var(--text)] mt-0.5 block">
                      {selectedApp.loan_type || selectedApp.form_data?.loan_type || 'Personal Loan'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-[var(--brand-deep)] uppercase tracking-wider block">Application Status</span>
                    <div className="mt-1">
                      {getStatusBadge(selectedApp.status)}
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[var(--line)] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block">Application ID</span>
                    <p className="font-mono font-semibold text-[var(--text)] mt-0.5">
                      {selectedApp.application_id || 'LA-DRAFT'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block">Employment Mode</span>
                    <p className="font-semibold text-[var(--text)] mt-0.5">
                      {selectedApp.form_data?.employment || (selectedApp.loan_type === 'Business Loan' ? 'Business' : 'Salaried / Job')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Details (If Business Loan) */}
              {(selectedApp.form_data?.business_name || selectedApp.loan_type === 'Business Loan') && (
                <div className="bg-[var(--surface-alt)] p-4 rounded-[16px] border border-[var(--line)] space-y-2.5">
                  <span className="font-semibold text-[var(--text)] text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[var(--brand-deep)]" /> Business Information
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-[var(--muted)] block">Enterprise Name</span>
                      <span className="font-semibold text-[var(--text)] block">
                        {selectedApp.form_data?.business_name || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)] block">Monthly Income</span>
                      <span className="font-semibold text-[var(--text)] block">
                        {selectedApp.form_data?.business_income_per_month ? `₹${selectedApp.form_data?.business_income_per_month}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Supporting Documents Checklist */}
              <div className="bg-[var(--surface-alt)] p-4 rounded-[16px] border border-[var(--line)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text)] text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--badge-success-text)]" /> KYC & Document Checklist
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--muted)]">
                    {Object.keys(selectedApp.form_data?.documents || selectedApp.documents || {}).length} Attached
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  {Object.entries(selectedApp.form_data?.documents || selectedApp.documents || {}).length === 0 ? (
                    <p className="text-[var(--muted)] italic text-xs py-1">No digital documents attached to this application.</p>
                  ) : (
                    Object.entries(selectedApp.form_data?.documents || selectedApp.documents || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between py-1.5 px-2.5 rounded-[10px] bg-[var(--surface)] border border-[var(--line)]">
                        <span className="font-medium text-[var(--text)] capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        {typeof val === 'string' && val.startsWith('http') ? (
                          <a
                            href={val}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[var(--brand-deep)] hover:underline font-semibold text-[11px]"
                          >
                            <ExternalLink size={12} /> View File
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[var(--badge-success-text)] font-semibold text-[11px]">
                            <Check size={12} /> Uploaded
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Timestamp & Metadata */}
              <div className="bg-[var(--surface-alt)] p-4 rounded-[16px] border border-[var(--line)] space-y-2 text-xs">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[var(--muted)]">Created At</span>
                  <span className="font-semibold text-[var(--text)]">{formatDateSafe(selectedApp.created_at, 'MMM d, yyyy h:mm a')}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[var(--muted)]">Last Modified</span>
                  <span className="font-semibold text-[var(--text)]">{formatDateSafe(selectedApp.updated_at, 'MMM d, yyyy h:mm a')}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0 items-center">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
              >
                Close
              </button>
              {selectedApp.status === 'Draft' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedApp;
                      setSelectedApp(null);
                      handleOpenStudio(target);
                    }}
                    className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Studio</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedApp;
                      setSelectedApp(null);
                      handleEditForm(target);
                    }}
                    className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <FileEdit className="w-4 h-4" />
                    <span>Continue / Edit Draft</span>
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
                  className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Open in Loan Application Studio</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
};

export default OriginationLoanApplicationsList;