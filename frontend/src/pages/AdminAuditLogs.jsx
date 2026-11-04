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
  Activity,
  User,
  Monitor,
  ShieldCheck,
  Trash2,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';

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

  const { data: logsResponse, isLoading: loading, isFetching } = useQuery({
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
        return <StatusBadge status="Success">Create</StatusBadge>;
      case 'UPDATE':
        return <StatusBadge status="Info">Update</StatusBadge>;
      case 'DELETE':
        return <StatusBadge status="Danger">Delete</StatusBadge>;
      default:
        return <StatusBadge status="Neutral">{action}</StatusBadge>;
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
        <div className="bg-[var(--surface-alt)] p-4 rounded-[16px] overflow-x-auto">
          <p className="text-xs font-medium text-[#1F9D55] mb-2">New record payload</p>
          <pre className="text-xs font-mono text-[#1F9D55] whitespace-pre-wrap">{formatJson(log.new_values)}</pre>
        </div>
      );
    }

    if (log.action_type === 'DELETE') {
      return (
        <div className="bg-[var(--surface-alt)] p-4 rounded-[16px] overflow-x-auto">
          <p className="text-xs font-medium text-[#D64550] mb-2">Deleted record snapshot</p>
          <pre className="text-xs font-mono text-[#D64550] whitespace-pre-wrap">{formatJson(log.previous_values)}</pre>
        </div>
      );
    }

    if (log.action_type === 'UPDATE' && log.changed_fields) {
      return (
        <div className="bg-[var(--surface)] rounded-[16px] border border-[var(--line)] overflow-hidden">
          <div className="grid grid-cols-3 bg-[var(--surface-alt)] border-b border-[var(--line)] text-xs font-medium text-[var(--muted)]">
            <div className="p-3 border-r border-[var(--line)]">Field name</div>
            <div className="p-3 border-r border-[var(--line)]">Previous value</div>
            <div className="p-3">Updated value</div>
          </div>
          <div className="divide-y divide-[var(--line)] max-h-96 overflow-y-auto custom-scrollbar text-xs font-mono">
            {Object.entries(log.changed_fields).map(([field, changes]) => {
              let oldVal = changes.old;
              let newVal = changes.new;

              if (typeof oldVal === 'string' && idMap[oldVal]) oldVal = `${idMap[oldVal]} [${oldVal}]`;
              if (typeof newVal === 'string' && idMap[newVal]) newVal = `${idMap[newVal]} [${newVal}]`;

              return (
                <div key={field} className="grid grid-cols-3 text-xs">
                  <div className="p-3 border-r border-[var(--line)] font-sans font-medium text-[var(--text)] flex items-center">
                    {field}
                  </div>
                  <div className="p-3 border-r border-[var(--line)] text-[#D64550] bg-[#FDE8EA]/30 break-all">
                    {JSON.stringify(oldVal) ?? 'null'}
                  </div>
                  <div className="p-3 text-[#1F9D55] bg-[#E6F6EC]/30 break-all">
                    {JSON.stringify(newVal) ?? 'null'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="text-xs text-[var(--muted)] italic p-3 bg-[var(--surface-alt)] rounded-[12px]">
        No granular diff captured for this event.
      </div>
    );
  };

  const stats = useMemo(() => {
    const total = pagination.total || logs.length;
    return {
      total,
      creates: logs.filter((l) => l.action_type === 'INSERT').length,
      updates: logs.filter((l) => l.action_type === 'UPDATE').length,
      deletes: logs.filter((l) => l.action_type === 'DELETE').length
    };
  }, [pagination, logs]);

  if (loading && logs.length === 0 && !debouncedSearch) {
    return <PageLoader message="Loading audit logs..." />;
  }

  return (
    <div className="space-y-5 pb-12 antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
              Audit logs
            </h1>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              {pagination.total} events logged
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Tamper-evident audit trail recording all administrative actions, data modifications, and security events
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total events"
          value={stats.total}
          caption="System-wide trail"
          icon={<Activity size={18} />}
        />
        <StatCard
          title="Page creates"
          value={stats.creates}
          caption="New entities inserted"
          icon={<ShieldAlert size={18} />}
        />
        <StatCard
          title="Page modifications"
          value={stats.updates}
          caption="Data edits & changes"
          icon={<FileText size={18} />}
        />
        <StatCard
          title="Page deletions"
          value={stats.deletes}
          caption="Removed entries"
          icon={<Trash2 size={18} />}
        />
      </div>

      {/* Main Table Card */}
      <div className="rounded-[24px] bg-[var(--surface)] overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--line)] bg-[var(--surface-alt)] flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full lg:w-80 shrink-0">
            {isFetching ? (
              <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-deep)] animate-spin pointer-events-none" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
            )}
            <input
              type="search"
              placeholder="Search actor or target name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] rounded-full text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] rounded-full text-[var(--text)] outline-none cursor-pointer"
            >
              <option value="">All modules</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] rounded-full text-[var(--text)] outline-none cursor-pointer"
            >
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] rounded-full text-[var(--text)] outline-none cursor-pointer"
            />

            {(searchTerm || moduleFilter || actionFilter || dateFilter) && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#FDE8EA] text-[#D64550] hover:bg-[#fad2cf] transition-all cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[var(--muted)] font-normal text-[13px]">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Action &amp; module</th>
                <th className="px-5 py-3.5">Performed by</th>
                <th className="px-5 py-3.5">Target employee / entity</th>
                <th className="px-5 py-3.5 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] text-[13px]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-[var(--muted)]">
                    <Loader2 className="w-8 h-8 text-[var(--brand-deep)] animate-spin mx-auto mb-2" />
                    <p className="text-xs">Loading audit logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-[var(--muted)]">
                    <ShieldAlert className="w-12 h-12 text-[var(--muted)] opacity-30 mx-auto mb-2" />
                    <p className="text-sm font-medium text-[var(--text)]">No audit logs found</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">Try adjusting your search criteria or date filters</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.audit_id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-[var(--brand-tint)]/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap align-top">
                      <div className="font-medium text-xs text-[var(--text)]">
                        {format(new Date(log.timestamp), 'MMM d, yyyy')}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] font-mono mt-0.5">
                        {format(new Date(log.timestamp), 'h:mm:ss a')}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 align-top">
                      <div className="flex items-center gap-2 mb-1">
                        {getActionBadge(log.action_type)}
                        <span className="font-medium text-xs text-[var(--text)]">{log.module_name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--surface-alt)] px-1.5 py-0.5 rounded">
                        {log.entity_type}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 align-top">
                      <div className="font-medium text-xs text-[var(--text)]">
                        {log.actor_name || 'System Auto-Agent'}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-[var(--muted)]" />
                        <span>{log.actor_role || 'System'}</span>
                        {log.ip_address && (
                          <span className="text-[10px] text-[var(--brand-deep)] bg-[var(--brand-tint)] px-1.5 py-0.2 rounded font-mono ml-1">
                            {log.ip_address}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 align-top">
                      {log.target_employee_name ? (
                        <div className="font-medium text-xs text-[var(--text)]">{log.target_employee_name}</div>
                      ) : (
                        <span className="text-xs text-[var(--muted)] italic">N/A (System record)</span>
                      )}
                      {log.entity_id && (
                        <span
                          className="text-[10px] font-mono text-[var(--muted)] block truncate max-w-[160px] mt-0.5"
                          title={log.entity_id}
                        >
                          ID: {log.entity_id}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] hover:bg-[var(--brand-tint)]/80 transition-all cursor-pointer"
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
        <div className="p-4 border-t border-[var(--line)] bg-[var(--surface-alt)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-[var(--muted)]">
            Showing{' '}
            <span className="font-medium text-[var(--text)]">
              {logs.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-medium text-[var(--text)]">
              {(pagination.page - 1) * pagination.limit + logs.length}
            </span>{' '}
            of <span className="font-medium text-[var(--text)]">{pagination.total}</span> audit records
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-xs font-medium text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <span className="text-xs font-medium text-[var(--muted)] px-2">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-xs font-medium text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Slideover Right Drawer: Audit Log Details */}
      {selectedLog &&
        createPortal(
          <div className="fixed inset-0 z-50 overflow-hidden antialiased">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setSelectedLog(null)}
            />
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-2xl bg-[var(--surface)] shadow-[0_24px_60px_rgba(19,19,21,0.18)] flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface-alt)]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-medium text-[var(--text)] tracking-tight">
                          Audit log details
                        </h3>
                        {getActionBadge(selectedLog.action_type)}
                      </div>
                      <p className="text-xs text-[var(--muted)] font-mono mt-0.5">
                        {selectedLog.audit_id} &bull;{' '}
                        {format(new Date(selectedLog.timestamp), 'MMM d, yyyy h:mm:ss a')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="p-1.5 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
                  {/* Event Summary & Session Context Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Event Info */}
                    <div className="bg-[var(--surface-alt)] p-4 rounded-[16px] space-y-2.5 text-xs">
                      <div className="flex items-center gap-1.5 text-[var(--brand-deep)] font-medium text-[11px]">
                        <Activity className="w-3.5 h-3.5" /> Event information
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[var(--muted)] block text-[11px]">Module</span>
                          <span className="font-medium text-[var(--text)]">{selectedLog.module_name}</span>
                        </div>
                        <div>
                          <span className="text-[var(--muted)] block text-[11px]">Entity type</span>
                          <span className="font-mono bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--line)] inline-block mt-0.5">
                            {selectedLog.entity_type}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--muted)] block text-[11px]">Entity ID</span>
                          <span
                            className="font-mono text-[var(--muted)] block truncate"
                            title={selectedLog.entity_id}
                          >
                            {selectedLog.entity_id || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Session Context */}
                    <div className="bg-[var(--surface-alt)] p-4 rounded-[16px] space-y-2.5 text-xs">
                      <div className="flex items-center gap-1.5 text-[var(--accent-pink-deep)] font-medium text-[11px]">
                        <Monitor className="w-3.5 h-3.5" /> Session &amp; origin
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[var(--muted)] block text-[11px]">Performed by</span>
                          <span className="font-medium text-[var(--text)]">
                            {selectedLog.actor_name || 'System'}
                          </span>
                          <span className="text-[10px] text-[var(--muted)] ml-1">
                            ({selectedLog.actor_role})
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--muted)] block text-[11px]">Target employee</span>
                          <span className="font-medium text-[var(--text)]">
                            {selectedLog.target_employee_name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--muted)] block text-[11px]">IP address</span>
                          <span className="font-mono text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2 py-0.5 rounded inline-block mt-0.5">
                            {selectedLog.ip_address || 'Internal network'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Data Diff Changes */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-medium text-[var(--text)] flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[var(--brand-deep)]" /> Granular data changes
                    </h4>
                    {renderJsonDiff(selectedLog)}
                  </div>

                  {/* Technical Payload Details */}
                  <div className="p-4 rounded-[16px] border border-[var(--line)] bg-[var(--surface)] space-y-2.5">
                    <h4 className="text-[11px] font-medium text-[var(--muted)]">
                      Technical metadata &amp; client headers
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="text-[11px] text-[var(--muted)] mb-0.5">Session ID</p>
                        <p className="font-mono text-[11px] bg-[var(--surface-alt)] p-2 rounded-[10px] truncate text-[var(--text)]">
                          {selectedLog.session_id || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[var(--muted)] mb-0.5">Client user agent</p>
                        <p
                          className="font-mono text-[11px] bg-[var(--surface-alt)] p-2 rounded-[10px] text-[var(--muted)] break-all leading-relaxed"
                          title={selectedLog.browser_information}
                        >
                          {selectedLog.browser_information || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--line)] bg-[var(--surface-alt)] flex justify-end items-center shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedLog(null)}
                    className="h-9 px-5 rounded-[12px] text-xs font-medium"
                  >
                    Close inspector
                  </Button>
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
