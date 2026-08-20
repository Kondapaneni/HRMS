import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBranchLoanApplications } from '../services/loanServices';
import PageLoader from '../components/PageLoader';
import { Search, CheckCircle2, Briefcase, Clock, Building2, XCircle, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import BranchOperationsMobileLoansApplicationsList from './BranchOperationsMobileLoansApplicationsList';
import { maskPhoneNumber } from '../utils/phoneUtils';

const BranchOperationsLoansApplicationsList = () => {
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

  const getStatusBadge = (status) => {
    const isCreated = status === 'Created' || status === 'Approved';
    const isUnderReview = status === 'Under Review';
    const isRejected = status === 'Rejected';

    if (isCreated) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
          <CheckCircle2 size={12} /> {status}
        </span>
      );
    }
    if (isUnderReview) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
          <Clock size={12} /> Under Review
        </span>
      );
    }
    if (isRejected) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
          <XCircle size={12} /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
        <Clock size={12} /> {status}
      </span>
    );
  };

  if (isLoading) {
    return <PageLoader message="Loading Applications..." />;
  }

  return (
    <>
      {/* Mobile Screen View */}
      <div className="md:hidden">
        <BranchOperationsMobileLoansApplicationsList />
      </div>

      {/* Desktop Screen View */}
      <div className="hidden md:block p-4 md:p-6 space-y-6 md:pb-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="mb-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Loan Applications</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">View and manage all loan applications processed through this branch.</p>
          </div>
        </div>

        {/* Data State */}
        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center border border-red-100">
            Failed to load applications. Please try again.
          </div>
        ) : (
          <div>
            {/* Table View Card */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm mb-6">
              <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                    <Briefcase className="h-5 w-5 text-slate-500" />
                    Loan Applications Directory
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">A comprehensive list of all loan applications handled by this branch.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-full sm:w-56 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search applications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] bg-slate-50 focus:bg-white"
                    />
                  </div>

                  {/* Loan Type Filter Dropdown */}
                  <select
                    value={loanTypeFilter}
                    onChange={(e) => setLoanTypeFilter(e.target.value)}
                    className="h-10 w-full sm:w-auto rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] bg-white text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="All">All Types ({applications.length})</option>
                    <option value="Personal Loan">
                      Personal Loan ({applications.filter(a => (a.loan_type || a.form_data?.loan_type) === 'Personal Loan').length})
                    </option>
                    <option value="Business Loan">
                      Business Loan ({applications.filter(a => (a.loan_type || a.form_data?.loan_type) === 'Business Loan').length})
                    </option>
                  </select>

                  {/* Status Filter Dropdown */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 w-full sm:w-auto rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C4DFF] bg-white text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="All">All Status ({applications.length})</option>
                    <option value="Under Review">
                      Under Review ({applications.filter(a => a.status === 'Under Review').length})
                    </option>
                    <option value="Approved">
                      Approved ({applications.filter(a => a.status === 'Approved').length})
                    </option>
                    <option value="Rejected">
                      Rejected ({applications.filter(a => a.status === 'Rejected').length})
                    </option>
                  </select>
                </div>
              </div>

              <div className="p-6 pt-0">
                <div className="rounded-md border border-slate-200 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium whitespace-nowrap">
                      <tr>
                        <th className="p-3">App ID</th>
                        <th className="p-3">Applicant Name</th>
                        <th className="p-3">Contact</th>
                        <th className="p-3">Loan Type</th>
                        <th className="p-3">Created By</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Created At</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-12 text-slate-500">
                            No applications found for this branch.
                          </td>
                        </tr>
                      ) : (
                        filteredApps.map((app) => {
                          const name = app.applicant_name || app.form_data?.applicant_name || 'N/A';
                          const phone = app.phone_number || app.form_data?.phone_number || 'N/A';

                          return (
                            <tr key={app.id || app.application_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                              <td className="p-3 text-slate-700 whitespace-nowrap">
                                <span className="font-semibold text-[#7C4DFF] bg-[#7C4DFF]/10 px-2 py-0.5 rounded text-xs border border-[#7C4DFF]/20">
                                  {app.application_id || 'LA-PENDING'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700 whitespace-nowrap">
                                <div className="font-medium text-slate-900">{name}</div>
                              </td>
                              <td className="p-3 text-slate-700 whitespace-nowrap">{maskPhoneNumber(phone)}</td>
                              <td className="p-3 text-slate-700 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium border border-slate-200">
                                  {app.loan_type}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700 whitespace-nowrap text-xs font-medium">
                                {app.creator_name || 'Branch Officer'}
                              </td>
                              <td className="p-3 text-slate-700 whitespace-nowrap">
                                {getStatusBadge(app.status)}
                              </td>
                              <td className="p-3 text-slate-700 text-xs whitespace-nowrap">
                                {formatDateSafe(app.created_at || app.updated_at)}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <button 
                                  onClick={() => handleViewDetails(app)}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                  title="View Application Details"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BranchOperationsLoansApplicationsList;
