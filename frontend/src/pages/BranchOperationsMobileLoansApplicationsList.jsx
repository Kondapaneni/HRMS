import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBranchLoanApplications } from '../services/loanServices';
import PageLoader from '../components/PageLoader';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Briefcase, 
  Building2, 
  XCircle, 
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { maskPhoneNumber } from '../utils/phoneUtils';

const BranchOperationsMobileLoansApplicationsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loanTypeFilter, setLoanTypeFilter] = useState('All');

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['branchOperations', 'applications', 'list'],
    queryFn: getBranchLoanApplications,
  });

  const branch = response?.branch || { name: 'Assigned Branch' };
  const applications = response?.applications || [];

  const statusCounts = useMemo(() => {
    const counts = { All: applications.length, 'Under Review': 0, Approved: 0, Created: 0, Draft: 0, Rejected: 0 };
    applications.forEach((app) => {
      if (counts[app.status] !== undefined) {
        counts[app.status] += 1;
      }
    });
    return counts;
  }, [applications]);

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const name = app.applicant_name || app.form_data?.applicant_name || '';
      const phone = app.phone_number || app.form_data?.phone_number || '';
      const appId = app.application_id || '';
      const leadId = app.lead_id || '';
      const appLoanType = app.loan_type || app.form_data?.loan_type || 'Personal Loan';

      const matchesSearch = 
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phone.includes(searchTerm) ||
        appId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(leadId).includes(searchTerm);

      const matchesStatus = statusFilter === 'All' ? true : app.status === statusFilter;
      const matchesLoanType = loanTypeFilter === 'All' ? true : appLoanType === loanTypeFilter;

      return matchesSearch && matchesStatus && matchesLoanType;
    });
  }, [applications, searchTerm, statusFilter, loanTypeFilter]);

  const formatDateSafe = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy');
    } catch (e) {
      return '—';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Created':
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
            <CheckCircle2 size={10} /> {status}
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <Clock size={10} /> Under Review
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
            <Clock size={10} /> Draft
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">
            <XCircle size={10} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
            {status || '—'}
          </span>
        );
    }
  };

  const handleViewDetails = (app) => {
    navigate('/employee/branch-operations/loans-view-applications', {
      state: {
        application: app,
        form_data: app.form_data,
        lead_id: app.lead_id,
        name: app.applicant_name || app.form_data?.applicant_name,
        phone: app.phone_number || app.form_data?.phone_number,
        from: '/employee/branch-operations/loans-applications',
      },
    });
  };

  const filterTabs = [
    { key: 'All', label: 'All', count: statusCounts.All },
    { key: 'Under Review', label: 'Under Review', count: statusCounts['Under Review'] },
    { key: 'Approved', label: 'Approved', count: statusCounts.Approved },
    { key: 'Draft', label: 'Draft', count: statusCounts.Draft },
  ];

  if (isLoading) {
    return <PageLoader message="Loading Loan Applications..." />;
  }

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Header Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs bg-gradient-to-br from-white via-[#f8fafd] to-[#e8f0fe]/30">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] ml-0.5">
              Branch Operations
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
            Loan Applications
          </h1>
          <p className="text-xs text-[#5f6368] flex items-center gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2 py-0.5 rounded-full">
              <Building2 size={11} /> {branch.name}
            </span>
            <span>&bull;</span>
            <span>{applications.length} Total Applications</span>
          </p>
        </div>
      </div>

      {/* 2. Search & Loan Type Filter */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
          <input
            type="search"
            placeholder="Search by name, phone, App ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#dadce0] rounded-full text-xs font-medium text-[#1f1f1f] placeholder:text-[#5f6368] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8] shadow-xs"
          />
        </div>

        {/* Loan Type Pill Select */}
        <div className="relative">
          <select
            value={loanTypeFilter}
            onChange={(e) => setLoanTypeFilter(e.target.value)}
            className="w-full h-10 pl-4 pr-10 rounded-full bg-white border border-[#dadce0] text-xs font-semibold text-[#1f1f1f] shadow-xs appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8]"
          >
            <option value="All">All Loan Types</option>
            <option value="Personal Loan">Personal Loans</option>
            <option value="Business Loan">Business Loans</option>
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5f6368] pointer-events-none" />
        </div>
      </div>

      {/* 3. Horizontal Status Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === tab.key
                ? 'bg-[#1a73e8] text-white shadow-xs'
                : 'bg-white text-[#444746] border border-[#dadce0] hover:bg-[#f1f3f4]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-[#f1f3f4] text-[#5f6368]'
            }`}>
              {tab.count || 0}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Applications List Cards */}
      <div className="space-y-3">
        {filteredApps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-8 text-center text-xs text-[#5f6368]">
            No loan applications found matching your search criteria.
          </div>
        ) : (
          filteredApps.map((app) => {
            const name = app.applicant_name || app.form_data?.applicant_name || 'Applicant';
            const phone = app.phone_number || app.form_data?.phone_number || '—';
            const loanType = app.loan_type || app.form_data?.loan_type || 'Personal Loan';

            return (
              <div
                key={app.id || app.application_id}
                onClick={() => handleViewDetails(app)}
                className="bg-white rounded-2xl border border-[#e0e3e7] p-4 shadow-xs hover:border-[#1a73e8] transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full border border-[#d2e3fc]">
                    {app.application_id || 'LA-PENDING'}
                  </span>
                  {getStatusBadge(app.status)}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#1f1f1f]">{name}</h3>
                  <p className="text-xs text-[#5f6368] mt-0.5">
                    {maskPhoneNumber(phone)} &bull; {loanType}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#f1f3f4] flex items-center justify-between text-[11px] text-[#5f6368]">
                  <span>By {app.creator_name || 'Branch Officer'}</span>
                  <div className="flex items-center gap-1 text-[#1a73e8] font-semibold">
                    <span>{formatDateSafe(app.created_at || app.updated_at)}</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BranchOperationsMobileLoansApplicationsList;
