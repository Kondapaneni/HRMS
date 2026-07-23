import React, { useState } from 'react';
import PageLoader from '../components/PageLoader';
import {
  FileText, Search, Filter, ChevronLeft, ChevronRight,
  X, Eye, ArrowRight, ShieldAlert, Activity, User, Monitor
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AdminAuditLogs = () => {
  const [page, setPage] = useState(1);
  const limit = 15;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const modules = [
    'Employee / User Settings',
    'Employee Work Information',
    'Attendance Regularization',
    'Leave Management',
    'Payroll Management',
    'Feature Access Roles'
  ];

  const actions = ['INSERT', 'UPDATE', 'DELETE'];

  const { data: logsResponse, isLoading: loading } = useQuery({
    queryKey: ['admin', 'audit-logs', page, appliedSearch, moduleFilter, actionFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit });
      if (appliedSearch) params.append('search', appliedSearch);
      if (moduleFilter) params.append('module', moduleFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (dateFilter) {
        params.append('startDate', dateFilter);
        params.append('endDate', dateFilter);
      }
      const response = await api.get(`/admin/audit-logs?${params.toString()}`);
      return response.data;
    },
    onError: (error) => toast.error(error.response?.data?.error || 'Failed to fetch audit logs'),
  });

  const logs = logsResponse?.data || [];
  const idMap = logsResponse?.idMap || {};
  const pagination = logsResponse?.pagination || { page: 1, limit: 15, total: 0, totalPages: 0 };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setPage(1);
      setAppliedSearch(searchTerm);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setAppliedSearch('');
    setModuleFilter('');
    setActionFilter('');
    setDateFilter('');
    setPage(1);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'INSERT': return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded border border-green-200">CREATE</span>;
      case 'UPDATE': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded border border-blue-200">UPDATE</span>;
      case 'DELETE': return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded border border-red-200">DELETE</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded border border-slate-200">{action}</span>;
    }
  };

  const formatJson = (json) => {
    if (!json) return 'N/A';

    // Deeply traverse JSON and append names to any string values that match a UUID in the idMap
    const enhanceWithNames = (obj) => {
      if (Array.isArray(obj)) return obj.map(enhanceWithNames);
      if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && idMap[value]) {
            newObj[key] = `${idMap[value]} [${value}]`;
          } else {
            newObj[key] = enhanceWithNames(value);
          }
        }
        return newObj;
      }
      return obj;
    };

    return JSON.stringify(enhanceWithNames(json), null, 2);
  };

  const renderJsonDiff = (log) => {
    if (log.action_type === 'INSERT') {
      return (
        <div className="bg-slate-50 p-4 rounded-md border border-slate-200 overflow-x-auto">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">New Record Data</p>
          <pre className="text-xs text-green-700">{formatJson(log.new_values)}</pre>
        </div>
      );
    }

    if (log.action_type === 'DELETE') {
      return (
        <div className="bg-slate-50 p-4 rounded-md border border-slate-200 overflow-x-auto">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Deleted Record Data</p>
          <pre className="text-xs text-red-700">{formatJson(log.previous_values)}</pre>
        </div>
      );
    }

    if (log.action_type === 'UPDATE' && log.changed_fields) {
      return (
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
            <div className="p-3 border-r border-slate-200">Field</div>
            <div className="p-3 border-r border-slate-200">Old Value</div>
            <div className="p-3">New Value</div>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {Object.entries(log.changed_fields).map(([field, changes]) => {
              // Add name labels if old/new values are known UUIDs
              let oldVal = changes.old;
              let newVal = changes.new;

              if (typeof oldVal === 'string' && idMap[oldVal]) oldVal = `${idMap[oldVal]} [${oldVal}]`;
              if (typeof newVal === 'string' && idMap[newVal]) newVal = `${idMap[newVal]} [${newVal}]`;

              return (
                <div key={field} className="grid grid-cols-3 text-sm">
                  <div className="p-3 border-r border-slate-100 font-medium text-slate-700 flex items-center">{field}</div>
                  <div className="p-3 border-r border-slate-100 text-red-600 bg-red-50/30 break-all">{JSON.stringify(oldVal) ?? 'null'}</div>
                  <div className="p-3 text-green-600 bg-green-50/30 break-all">{JSON.stringify(newVal) ?? 'null'}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return <div className="text-sm text-slate-500 italic">No detailed changes available.</div>;
  };

  if (loading) return <PageLoader message="Loading Audit Logs..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Audit Logs</h1>
        <p className="text-slate-500 mt-1">Track and monitor all administrative actions across the system</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        {/* Filters Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search actor or target name... (Press Enter)"
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
            </div>

            <div className="w-48">
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Module</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                value={moduleFilter}
                onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Modules</option>
                {modules.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="w-36">
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Action</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Actions</option>
                {actions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="w-40">
              <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              />
            </div>

            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-2"
            >
              <Filter size={16} />
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Performed By</th>
                <th className="px-6 py-4 font-medium">Target Employee</th>
                <th className="px-6 py-4 font-medium text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Loading logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <ShieldAlert className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                    <p className="text-base font-medium text-slate-600">No audit logs found</p>
                    <p className="text-sm mt-1">Try adjusting your search filters</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.audit_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {format(new Date(log.timestamp), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {format(new Date(log.timestamp), 'h:mm:ss a')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getActionBadge(log.action_type)}
                        <span className="text-sm font-medium text-slate-700">{log.module_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{log.actor_name || 'System'}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <User size={12} /> {log.actor_role}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.target_employee_name ? (
                        <div className="text-sm text-slate-700">{log.target_employee_name}</div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors inline-flex"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-200 px-6 py-4 bg-white flex items-center justify-between shrink-0">
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{logs.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0}</span> to <span className="font-semibold text-slate-900">{((pagination.page - 1) * pagination.limit) + logs.length}</span> of <span className="font-semibold text-slate-900">{pagination.total}</span> entries
          </p>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                  Audit Log Details
                  {getActionBadge(selectedLog.action_type)}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedLog.audit_id} • {format(new Date(selectedLog.timestamp), 'MMM d, yyyy h:mm:ss a')}
                </p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity size={14} /> Event Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500">Module</span>
                      <span className="col-span-2 font-medium text-slate-900">{selectedLog.module_name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500">Entity Type</span>
                      <span className="col-span-2 font-medium text-slate-900 font-mono text-xs px-1.5 py-0.5 bg-slate-100 rounded inline-flex w-max">{selectedLog.entity_type}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500">Entity ID</span>
                      <span className="col-span-2 font-medium text-slate-900 font-mono text-xs">{selectedLog.entity_id}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Monitor size={14} /> Session Context
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500">Actor</span>
                      <span className="col-span-2 font-medium text-slate-900">{selectedLog.actor_name || 'System'} ({selectedLog.actor_role})</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500">Target</span>
                      <span className="col-span-2 font-medium text-slate-900">{selectedLog.target_employee_name || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-slate-500">IP Address</span>
                      <span className="col-span-2 font-medium text-slate-900 font-mono text-xs">{selectedLog.ip_address || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" /> Data Changes
                </h4>
                {renderJsonDiff(selectedLog)}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Raw Payload Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Session ID</p>
                    <p className="text-xs font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 truncate">{selectedLog.session_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Browser User Agent</p>
                    <p className="text-xs font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 truncate" title={selectedLog.browser_information}>{selectedLog.browser_information || 'N/A'}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;
