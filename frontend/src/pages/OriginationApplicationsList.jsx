import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLoanApplications } from '../services/loanServices';
import { Search, CheckCircle2, Briefcase, Loader2, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';
import OriginationMobileApplicationsList from './OriginationMobileApplicationsList';

const OriginationApplicationsList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['origination', 'applications', 'list'],
    queryFn: getLoanApplications,
  });

  const applications = response?.applications || [];

  const filteredApps = applications.filter((app) => {
    const name = app.applicant_name || app.form_data?.applicant_name || '';
    const phone = app.phone_number || app.form_data?.phone_number || '';
    const appId = app.application_id || '';
    const leadId = app.lead_id || '';
    const matchesSearch = 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      appId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(leadId).includes(searchTerm);

    const matchesStatus = statusFilter === 'All' ? true : app.status === statusFilter;
    return matchesSearch && matchesStatus;
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
    navigate('/employee/loans/business-loan', {
      state: {
        application: app,
        form_data: app.form_data,
        lead_id: app.lead_id,
        name: app.applicant_name || app.form_data?.applicant_name,
        phone: app.phone_number || app.form_data?.phone_number,
        readOnly: true,
        isReadOnly: true,
        from: '/employee/loans/origination/applications',
      },
    });
  };

  return (
    <>
      {/* Mobile Screen View */}
      <div className="md:hidden">
        <OriginationMobileApplicationsList />
      </div>

      {/* Desktop Screen View */}
      <div className="hidden md:block p-4 md:p-6 space-y-6 md:pb-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Applications</h1>
            <p className="text-sm text-slate-500 mt-1">View and manage all submitted and draft loan applications.</p>
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
                    Applications Directory
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">A comprehensive list of all your submitted and draft loan applications.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-64 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="search"
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      placeholder="Search applications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {['All', 'Submitted', 'Draft'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                          statusFilter === st
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {st} {st === 'All' ? `(${applications.length})` : `(${applications.filter(a => a.status === st).length})`}
                      </button>
                    ))}
                  </div>
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
                        <th className="p-3">Status</th>
                        <th className="p-3">Submitted Date</th>
                        <th className="p-3 text-center whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="whitespace-nowrap">
                      {isLoading ? (
                        <tr>
                          <td colSpan="7" className="p-12 text-center">
                            <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
                            <p className="text-slate-500 mt-4">Searching applications...</p>
                          </td>
                        </tr>
                      ) : filteredApps.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-12 text-slate-500">
                            No applications found.
                          </td>
                        </tr>
                      ) : (
                        filteredApps.map((app) => {
                          const name = app.applicant_name || app.form_data?.applicant_name || 'N/A';
                          const phone = app.phone_number || app.form_data?.phone_number || 'N/A';
                          const isSubmitted = app.status === 'Submitted';

                          return (
                            <tr key={app.id || app.application_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                              <td className="p-3 text-slate-700 whitespace-nowrap">
                                <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-100">
                                  {app.application_id || 'LA-DRAFT'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700 whitespace-nowrap">
                                <div className="font-medium text-slate-900">{name}</div>
                              </td>
                              <td className="p-3 text-slate-700 whitespace-nowrap">{phone}</td>
                              <td className="p-3 text-slate-700 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium border border-slate-200">
                                  {app.loan_type}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                                  isSubmitted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {isSubmitted ? <CheckCircle2 size={12} /> : <Clock size={12} />} {app.status}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700 text-xs whitespace-nowrap">
                                {formatDateSafe(app.created_at || app.updated_at)}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <button 
                                  onClick={() => handleViewDetails(app)}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
                                >
                                  <Eye size={14} /> View Details
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

export default OriginationApplicationsList;
