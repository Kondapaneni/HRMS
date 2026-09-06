import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import {
  FileText, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  X, 
  Eye, 
  ArrowRight, 
  ShieldAlert, 
  Activity, 
  User, 
  Monitor,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  Trash2,
  Clock,
  ShieldCheck,
  Globe,
  Database,
  ArrowUpRight,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    },
    red: {
      iconBg: 'bg-[#fce8e6]',
      iconColor: 'text-[#c5221f]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const AdminAuditLogs = () => {
  const [page, setPage] = useState(1);
  const limit = 15;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Selected Log for Slideover Drawer
  const [selectedLog, setSelectedLog] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const modules = [
    'Employee / User Settings',
    'Employee Work Information',
    'Attendance Regularization',
    'Leave Management',
    'Payroll Management',
    'Feature Access Roles'
  ];

  const actions = ['INSERT', 'UPDATE', 'DELETE'];

  const { data: logsResponse, isLoading: loading, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'audit-logs', page, debouncedSearch, moduleFilter, actionFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (moduleFilter) params.append('module', moduleFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (dateFilter) {
        params.append('startDate', dateFilter);
        params.append('endDate', dateFilter);
      }
      const response = await api.get(`/admin/audit-logs?${params.toString()}`);
      return response.data;
    },
    placeholderData: (previousData) => previousData,
    onError: (error) => toast.error(error.response?.data?.error || 'Failed to fetch audit logs'),
  });

  const logs = logsResponse?.data || [];
  const idMap = logsResponse?.idMap || {};
  const pagination = logsResponse?.pagination || { page: 1, limit: 15, total: 0, totalPages: 0 };

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setModuleFilter('');
    setActionFilter('');
    setDateFilter('');
    setPage(1);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'INSERT':
        return (
          <span className="px-2.5 py-0.5 bg-[#e6f4ea] text-[#137333] text-[11px] font-semibold rounded-full border border-[#ceead6] inline-flex items-center gap-1">
            CREATE
          </span>
        );
      case 'UPDATE':
        return (
          <span className="px-2.5 py-0.5 bg-[#e8f0fe] text-[#1a73e8] text-[11px] font-semibold rounded-full border border-[#d2e3fc] inline-flex items-center gap-1">
            UPDATE
          </span>
        );
      case 'DELETE':
        return (
          <span className="px-2.5 py-0.5 bg-[#fce8e6] text-[#c5221f] text-[11px] font-semibold rounded-full border border-[#fad2cf] inline-flex items-center gap-1">
            DELETE
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 bg-[#f1f3f4] text-[#5f6368] text-[11px] font-semibold rounded-full border border-[#dadce0]">
            {action}
          </span>
        );
    }
  };

  const formatJson = (json) => {
    if (!json) return 'N/A';

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
        <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] overflow-x-auto">
          <p className="text-xs font-semibold text-[#137333] mb-2 uppercase tracking-wider">New Record Payload</p>
          <pre className="text-xs font-mono text-[#137333] whitespace-pre-wrap">{formatJson(log.new_values)}</pre>
        </div>
      );
    }

    if (log.action_type === 'DELETE') {
      return (
        <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] overflow-x-auto">
          <p className="text-xs font-semibold text-[#c5221f] mb-2 uppercase tracking-wider">Deleted Record Snapshot</p>
          <pre className="text-xs font-mono text-[#c5221f] whitespace-pre-wrap">{formatJson(log.previous_values)}</pre>
        </div>
      );
    }

    if (log.action_type === 'UPDATE' && log.changed_fields) {
      return (
        <div className="bg-white rounded-2xl border border-[#e0e3e7] overflow-hidden shadow-2xs">
          <div className="grid grid-cols-3 bg-[#f8fafd] border-b border-[#e0e3e7] text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider">
            <div className="p-3 border-r border-[#e0e3e7]">Field Name</div>
            <div className="p-3 border-r border-[#e0e3e7]">Previous Value</div>
            <div className="p-3">Updated Value</div>
          </div>
          <div className="divide-y divide-[#e0e3e7] max-h-96 overflow-y-auto custom-scrollbar text-xs font-mono">
            {Object.entries(log.changed_fields).map(([field, changes]) => {
              let oldVal = changes.old;
              let newVal = changes.new;

              if (typeof oldVal === 'string' && idMap[oldVal]) oldVal = `${idMap[oldVal]} [${oldVal}]`;
              if (typeof newVal === 'string' && idMap[newVal]) newVal = `${idMap[newVal]} [${newVal}]`;

              return (
                <div key={field} className="grid grid-cols-3 text-xs">
                  <div className="p-3 border-r border-[#e0e3e7] font-sans font-semibold text-[#1f1f1f] flex items-center">
                    {field}
                  </div>
                  <div className="p-3 border-r border-[#e0e3e7] text-[#c5221f] bg-[#fce8e6]/30 break-all">
                    {JSON.stringify(oldVal) ?? 'null'}
                  </div>
                  <div className="p-3 text-[#137333] bg-[#e6f4ea]/30 break-all">
                    {JSON.stringify(newVal) ?? 'null'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return <div className="text-xs text-[#5f6368] italic p-3 bg-[#f8fafd] rounded-xl border border-[#e0e3e7]">No granular diff captured for this event.</div>;
  };

  // KPI stats calculations
  const stats = useMemo(() => {
    const total = pagination.total || logs.length;
    return {
      total,
      creates: logs.filter(l => l.action_type === 'INSERT').length,
      updates: logs.filter(l => l.action_type === 'UPDATE').length,
      deletes: logs.filter(l => l.action_type === 'DELETE').length
    };
  }, [pagination, logs]);

  if (loading && logs.length === 0 && !debouncedSearch) return <PageLoader message="Loading Security Audit Trail..." />;

  return (
    <div className="space-y-6 pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Compliance &amp; Security</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight flex items-center gap-2 font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            System Audit Logs <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{pagination.total} Logged Events</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Tamper-evident audit trail recording all administrative actions, data modifications, and security events.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#5f6368]" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Events Logged" 
          value={stats.total} 
          subtitle="System-wide audit trail" 
          icon={Activity} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Page Record Creates" 
          value={stats.creates} 
          subtitle="New entities inserted" 
          icon={ShieldAlert} 
          colorTheme="green" 
        />
        <StatCard 
          title="Page Modifications" 
          value={stats.updates} 
          subtitle="Data edits & changes" 
          icon={FileText} 
          colorTheme="purple" 
        />
        <StatCard 
          title="Page Record Deletions" 
          value={stats.deletes} 
          subtitle="Purged or removed entries" 
          icon={Trash2} 
          colorTheme="red" 
        />
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex flex-col lg:flex-row gap-3 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full lg:w-80 shrink-0">
            {isFetching ? (
              <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a73e8] animate-spin pointer-events-none" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
            )}
            <input
              type="search"
              placeholder="Search actor or target name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <select
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs bg-white border border-[#dadce0] focus:border-[#4285F4] rounded-full text-[#1f1f1f] outline-none cursor-pointer"
            >
              <option value="">All Modules</option>
              {modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs bg-white border border-[#dadce0] focus:border-[#4285F4] rounded-full text-[#1f1f1f] outline-none cursor-pointer"
            >
              <option value="">All Actions</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs bg-white border border-[#dadce0] focus:border-[#4285F4] rounded-full text-[#1f1f1f] outline-none cursor-pointer"
            />

            {(searchTerm || moduleFilter || actionFilter || dateFilter) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#fce8e6] text-[#c5221f] hover:bg-[#fad2cf] transition-all cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] uppercase font-semibold tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Action &amp; Module</th>
                <th className="px-5 py-3.5">Performed By</th>
                <th className="px-5 py-3.5">Target Employee / Entity</th>
                <th className="px-5 py-3.5 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e3e7]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-[#5f6368]">
                    <Loader2 className="w-8 h-8 text-[#1a73e8] animate-spin mx-auto mb-2" />
                    <p className="text-xs">Loading audit logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-[#5f6368]">
                    <ShieldAlert className="w-12 h-12 text-[#dadce0] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#1f1f1f]">No audit logs found</p>
                    <p className="text-xs text-[#5f6368] mt-0.5">Try adjusting your search criteria or date filters.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr 
                    key={log.audit_id} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-[#f8fafd] transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap align-top">
                      <div className="font-semibold text-xs text-[#1f1f1f]">
                        {format(new Date(log.timestamp), 'MMM d, yyyy')}
                      </div>
                      <div className="text-[11px] text-[#5f6368] font-mono mt-0.5">
                        {format(new Date(log.timestamp), 'h:mm:ss a')}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 align-top">
                      <div className="flex items-center gap-2 mb-1">
                        {getActionBadge(log.action_type)}
                        <span className="font-semibold text-xs text-[#1f1f1f]">{log.module_name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#5f6368] bg-[#f1f3f4] px-1.5 py-0.5 rounded">
                        {log.entity_type}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 align-top">
                      <div className="font-semibold text-xs text-[#1f1f1f]">{log.actor_name || 'System Auto-Agent'}</div>
                      <div className="text-[11px] text-[#5f6368] flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-[#5f6368]" />
                        <span>{log.actor_role || 'System'}</span>
                        {log.ip_address && (
                          <span className="text-[10px] text-[#1a73e8] bg-[#e8f0fe] px-1.5 py-0.2 rounded font-mono ml-1">
                            {log.ip_address}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 align-top">
                      {log.target_employee_name ? (
                        <div className="font-semibold text-xs text-[#1f1f1f]">{log.target_employee_name}</div>
                      ) : (
                        <span className="text-xs text-[#5f6368] italic">N/A (System Record)</span>
                      )}
                      {log.entity_id && (
                        <span className="text-[10px] font-mono text-[#5f6368] block truncate max-w-[160px] mt-0.5" title={log.entity_id}>
                          ID: {log.entity_id}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center align-middle" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] transition-all cursor-pointer"
                        title="View Detailed Changes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-[#5f6368]">
            Showing <span className="font-semibold text-[#1f1f1f]">{logs.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0}</span> to <span className="font-semibold text-[#1f1f1f]">{((pagination.page - 1) * pagination.limit) + logs.length}</span> of <span className="font-semibold text-[#1f1f1f]">{pagination.total}</span> audit records
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#1f1f1f] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <span className="text-xs font-semibold text-[#5f6368] px-2">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#1f1f1f] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Slideover Right Drawer: Audit Log Details (createPortal) */}
      {selectedLog && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
            onClick={() => setSelectedLog(null)} 
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              
              {/* Header */}
              <div className="p-5 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-[#1f1f1f]">Audit Log Details</h3>
                      {getActionBadge(selectedLog.action_type)}
                    </div>
                    <p className="text-xs text-[#5f6368] font-mono mt-0.5">
                      {selectedLog.audit_id} • {format(new Date(selectedLog.timestamp), 'MMM d, yyyy h:mm:ss a')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                
                {/* Event Summary & Session Context Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Event Info */}
                  <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] space-y-3 text-xs">
                    <div className="flex items-center gap-1.5 text-[#1a73e8] font-semibold uppercase tracking-wider text-[10px]">
                      <Activity className="w-3.5 h-3.5" /> Event Information
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[#5f6368] block text-[11px]">Module</span>
                        <span className="font-semibold text-[#1f1f1f]">{selectedLog.module_name}</span>
                      </div>
                      <div>
                        <span className="text-[#5f6368] block text-[11px]">Entity Type</span>
                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-[#e0e3e7] inline-block mt-0.5">
                          {selectedLog.entity_type}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#5f6368] block text-[11px]">Entity ID</span>
                        <span className="font-mono text-[#5f6368] block truncate" title={selectedLog.entity_id}>
                          {selectedLog.entity_id || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Session Context */}
                  <div className="bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7] space-y-3 text-xs">
                    <div className="flex items-center gap-1.5 text-[#8430ce] font-semibold uppercase tracking-wider text-[10px]">
                      <Monitor className="w-3.5 h-3.5" /> Session &amp; Origin
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[#5f6368] block text-[11px]">Performed By</span>
                        <span className="font-semibold text-[#1f1f1f]">{selectedLog.actor_name || 'System'}</span>
                        <span className="text-[10px] text-[#5f6368] ml-1">({selectedLog.actor_role})</span>
                      </div>
                      <div>
                        <span className="text-[#5f6368] block text-[11px]">Target Employee</span>
                        <span className="font-semibold text-[#1f1f1f]">{selectedLog.target_employee_name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[#5f6368] block text-[11px]">IP Address</span>
                        <span className="font-mono text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded border border-[#d2e3fc] inline-block mt-0.5">
                          {selectedLog.ip_address || 'Internal Network'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Diff Changes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#5f6368] flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#1a73e8]" /> Granular Data Changes
                    </h4>
                  </div>
                  {renderJsonDiff(selectedLog)}
                </div>

                {/* Technical Payload Details */}
                <div className="p-4 rounded-2xl border border-[#e0e3e7] bg-white space-y-3">
                  <h4 className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">
                    Technical Metadata &amp; Client Headers
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="text-[11px] text-[#5f6368] mb-0.5">Session ID</p>
                      <p className="font-mono text-[11px] bg-[#f8fafd] p-2 rounded-xl border border-[#e0e3e7] truncate text-[#1f1f1f]">
                        {selectedLog.session_id || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#5f6368] mb-0.5">Client User Agent</p>
                      <p className="font-mono text-[11px] bg-[#f8fafd] p-2 rounded-xl border border-[#e0e3e7] text-[#5f6368] break-all leading-relaxed" title={selectedLog.browser_information}>
                        {selectedLog.browser_information || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default AdminAuditLogs;
