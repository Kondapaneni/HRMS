import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLoanApplications } from '../services/loanServices';
import { Search, CheckCircle2, Briefcase, Loader2, Clock, User, Phone, MapPin, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import OriginationMobileApplicationsList from './OriginationMobileApplicationsList';

const OriginationApplicationsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedApp, setSelectedApp] = useState(null);

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

  return (
    <>
      {/* Mobile Screen View */}
      <div className="md:hidden">
        <OriginationMobileApplicationsList />
      </div>

      {/* Desktop Screen View - Exactly matched with Members Page Styling */}
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
                                  onClick={() => setSelectedApp(app)}
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

      {/* Desktop Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                  {selectedApp.application_id || 'LA-DRAFT'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedApp.applicant_name || selectedApp.form_data?.applicant_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1.5 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase">Loan Type</p>
                  <p className="font-bold text-slate-900 text-base">{selectedApp.loan_type}</p>
                </div>
                <span className={`px-2.5 py-1 rounded text-xs font-medium border ${
                  selectedApp.status === 'Submitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {selectedApp.status}
                </span>
              </div>

              {/* Applicant Personal Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User size={15} className="text-blue-600" /> Primary Applicant Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500 font-medium">Applicant Name</p>
                    <p className="font-semibold text-slate-800">{selectedApp.form_data?.applicant_name || selectedApp.applicant_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Phone Number</p>
                    <p className="font-semibold text-slate-800">{selectedApp.form_data?.phone_number || selectedApp.phone_number}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Aadhaar Number</p>
                    <p className="font-semibold text-slate-800">{selectedApp.form_data?.aadhaar_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-medium">Age / Gender</p>
                    <p className="font-semibold text-slate-800">{selectedApp.form_data?.age || 'N/A'} / {selectedApp.form_data?.gender || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Co-Applicant Details */}
              {selectedApp.form_data?.has_co_applicant === 'Yes' && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User size={15} className="text-indigo-600" /> Co-Applicant Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 font-medium">Co-Applicant Name</p>
                      <p className="font-semibold text-slate-800">{selectedApp.form_data.co_applicant_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Relation with Applicant</p>
                      <p className="font-semibold text-slate-800">{selectedApp.form_data.co_relation_with_applicant || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Phone Number</p>
                      <p className="font-semibold text-slate-800">{selectedApp.form_data.co_phone_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Aadhaar Number</p>
                      <p className="font-semibold text-slate-800">{selectedApp.form_data.co_aadhaar_number || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Guarantors */}
              <div className="space-y-3 pt-2">
                <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User size={15} className="text-emerald-600" /> Guarantors (3 Required)
                </h4>
                <div className="space-y-2">
                  {[1, 2, 3].map((gIdx) => {
                    const pfx = `guarantor_${gIdx}_`;
                    const gName = selectedApp.form_data?.[`${pfx}name`];
                    const gPhone = selectedApp.form_data?.[`${pfx}phone_number`];
                    const gAadhaar = selectedApp.form_data?.[`${pfx}aadhaar_number`];

                    if (!gName) return null;

                    return (
                      <div key={gIdx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
                        <p className="font-bold text-slate-900">Guarantor {gIdx}: {gName}</p>
                        <p className="text-slate-600">Phone: {gPhone || 'N/A'} | Aadhaar: {gAadhaar || 'N/A'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OriginationApplicationsList;
