import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBranchLoanApplications } from '../services/branchOperationsServices';
import PageLoader from '../components/PageLoader';
import { Search, CheckCircle2, Clock, Phone, Briefcase, Eye, Loader2, ChevronDown, Building2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

const BranchOperationsMobileApplicationsList = () => {
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

  const filteredApps = applications.filter((app) => {
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

  const formatDateSafe = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'N/A' : format(d, 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'N/A';
    }
  };

  const handleViewDetails = (app) => {
    navigate('/employee/loans/view-application', {
      state: {
        application: app,
        form_data: app.form_data,
        lead_id: app.lead_id,
        name: app.applicant_name || app.form_data?.applicant_name,
        phone: app.phone_number || app.form_data?.phone_number,
        from: '/employee/branch-operations/applications',
      },
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Created':
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap">
            <CheckCircle2 size={10} /> {status}
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">
            <Clock size={10} /> Under Review
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 whitespace-nowrap">
            <Clock size={10} /> Draft
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 whitespace-nowrap">
            <XCircle size={10} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading Applications..." />;
  }

  return (
    <div className="w-full pb-5">
      {/* Hero Header */}
      <section className="relative px-6 pt-12 pb-20 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        <div className="relative z-10 px-2 flex justify-between items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-2 backdrop-blur-md">
              <Building2 size={12} className="text-indigo-300" />
              <span>{branch.name}</span>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Applications</h2>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Branch processed applications</p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="relative z-20 -mt-14 px-4 space-y-4">
        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-3 flex items-center">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="search"
              placeholder="Search by name, phone, App ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="relative">
            <select
              value={loanTypeFilter}
              onChange={(e) => setLoanTypeFilter(e.target.value)}
              className="w-full h-11 pl-3 pr-8 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 shadow-xs appearance-none cursor-pointer"
            >
              <option value="All">All Types ({applications.length})</option>
              <option value="Personal Loan">
                Personal ({applications.filter(a => (a.loan_type || a.form_data?.loan_type || 'Personal Loan') === 'Personal Loan').length})
              </option>
              <option value="Business Loan">
                Business ({applications.filter(a => (a.loan_type || a.form_data?.loan_type) === 'Business Loan').length})
              </option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 pl-3 pr-8 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 shadow-xs appearance-none cursor-pointer"
            >
              <option value="All">All Status ({applications.length})</option>
              <option value="Created">
                Created ({applications.filter(a => a.status === 'Created').length})
              </option>
              <option value="Under Review">
                Under Review ({applications.filter(a => a.status === 'Under Review').length})
              </option>
              <option value="Draft">
                Draft ({applications.filter(a => a.status === 'Draft').length})
              </option>
              <option value="Approved">
                Approved ({applications.filter(a => a.status === 'Approved').length})
              </option>
              <option value="Rejected">
                Rejected ({applications.filter(a => a.status === 'Rejected').length})
              </option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* List Content */}
        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center border border-red-100 shadow-sm mt-4">
            Failed to load loan applications.
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-20 text-center text-slate-500 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mt-4">
            No applications found for this branch.
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {filteredApps.map((app) => {
              const name = app.applicant_name || app.form_data?.applicant_name || 'N/A';
              const phone = app.phone_number || app.form_data?.phone_number || 'N/A';

              return (
                <div
                  key={app.id || app.application_id}
                  onClick={() => handleViewDetails(app)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3 active:scale-[0.99] transition-transform cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md text-xs border border-blue-100">
                        {app.application_id || 'LA-PENDING'}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-2">{name}</h3>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-b border-slate-50 py-2">
                    <div className="flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400" />
                      <span>{phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <Briefcase size={13} className="text-slate-400" />
                      <span className="truncate">{app.loan_type}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 pt-0.5">
                    <span>{formatDateSafe(app.created_at || app.updated_at)}</span>
                    <span className="flex items-center gap-1 text-blue-600 font-semibold">
                      <Eye size={14} /> View Details
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchOperationsMobileApplicationsList;
