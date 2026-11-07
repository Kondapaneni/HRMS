import { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Calendar, Check, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { StatCard, StatusBadge, Button, Avatar, SearchBar } from '../components/ui';

const AdminLeaves = () => {
  const queryClient = useQueryClient();
  
  // Pagination and search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: leavesResponse, isLoading: initialLoading, isFetching } = useQuery({
    queryKey: ['admin', 'leaves', page, debouncedSearch],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      const response = await api.get(`/admin/leaves?limit=${limit}&offset=${offset}&search=${encodeURIComponent(debouncedSearch)}`);
      return response.data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
  });

  const leaves = leavesResponse?.leaves || [];
  const stats = leavesResponse?.stats || { approved: 0, pending: 0, rejected: 0, total: 0 };
  const totalCount = leavesResponse?.total || 0;

  const handleAction = async (id, action) => {
    const queryKey = ['admin', 'leaves', page, debouncedSearch];
    const previousData = queryClient.getQueryData(queryKey);

    // Optimistically update the UI instantly
    if (previousData) {
      queryClient.setQueryData(queryKey, {
        ...previousData,
        leaves: previousData.leaves.map(leave => 
          leave.id === id 
            ? { ...leave, status: action === 'approve' ? 'approved' : 'rejected' } 
            : leave
        )
      });
    }

    try {
      await api.post(`/admin/leaves/${id}/${action}`);
      toast.success(`Leave request ${action === 'approve' ? 'approved' : 'rejected'}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'leaves'] });
    } catch (err) {
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
      toast.error(err.response?.data?.error || `Failed to ${action} leave request.`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <StatusBadge status="Approved" variant="success" />;
      case 'pending':
        return <StatusBadge status="Pending" variant="warning" />;
      case 'rejected':
        return <StatusBadge status="Rejected" variant="danger" />;
      default:
        return <StatusBadge status={status || 'Unknown'} variant="neutral" />;
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  if (initialLoading && !leaves.length && !debouncedSearch) return <PageLoader message="Loading Leave Requests..." />;

  return (
    <div className="space-y-4 font-sans antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Leave Management
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Review and approve or reject employee leave applications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-[9px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
            {totalCount} Total Requests
          </span>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-3">
        <StatCard
          title="Approved Leaves"
          value={stats.approved}
          badgeText="Granted"
          badgeType="success"
        />
        <StatCard
          title="Pending Action"
          value={stats.pending}
          badgeText="Awaiting decision"
          badgeType="warning"
        />
        <StatCard
          title="Rejected Leaves"
          value={stats.rejected}
          badgeText="Declined"
          badgeType="danger"
        />
      </div>

      {/* Main Table Card */}
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px] flex flex-col">
        {/* Table Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--line)] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">Leave Applications</h3>
              <p className="text-xs text-[var(--muted)]">All submitted employee leave requests</p>
            </div>
          </div>
          
          {/* Search Box */}
          <SearchBar
            placeholder="Search by employee name or code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            isFetching={isFetching}
            wrapperClassName="w-full sm:w-72"
          />
        </div>

        <div className="overflow-x-auto custom-scrollbar min-h-[300px] relative">
          {initialLoading && leaves.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                  <th className="h-10 px-4 font-normal text-xs whitespace-nowrap">Employee</th>
                  <th className="h-10 px-4 font-normal text-xs whitespace-nowrap">Type</th>
                  <th className="h-10 px-4 font-normal text-xs whitespace-nowrap">Duration</th>
                  <th className="h-10 px-4 font-normal text-xs whitespace-nowrap">Days</th>
                  <th className="h-10 px-4 font-normal text-xs min-w-[160px]">Reason</th>
                  <th className="h-10 px-4 font-normal text-xs whitespace-nowrap">Status</th>
                  <th className="h-10 px-4 font-normal text-xs text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-14 text-center text-[var(--muted)]">
                      <div className="flex flex-col items-center justify-center">
                        <Calendar size={28} className="text-[var(--icon-muted)] mb-2" />
                        <p className="text-xs font-semibold text-[var(--text)]">No leave requests found</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">Try adjusting your search criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-[var(--surface-alt)]/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[var(--text)] whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={leave.employeeName} size="sm" />
                          <div>
                            <p className="font-semibold text-xs text-[var(--text)]">{leave.employeeName}</p>
                            <p className="text-[11px] text-[var(--muted)]">{leave.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="capitalize font-medium text-xs text-[var(--text-2)] bg-[var(--surface-alt)] px-2.5 py-1 rounded-[8px] inline-block whitespace-nowrap">
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-semibold text-[var(--text)]">{leave.startDate}</p>
                        {leave.endDate !== leave.startDate && (
                          <p className="text-[11px] text-[var(--muted)]">to {leave.endDate}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center whitespace-nowrap bg-[var(--brand-tint)] text-[var(--brand-deep)] px-2.5 py-0.5 rounded-[9px] font-semibold text-xs">
                          {leave.days} {leave.days === 1 ? 'day' : 'days'}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="text-xs text-[var(--text-2)] break-words line-clamp-2" title={leave.reason}>{leave.reason || '-'}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          {getStatusBadge(leave.status)}
                          {leave.status !== 'pending' && leave.approvedByName && (
                            <p className="text-[10px] text-[var(--muted)] mt-1 whitespace-nowrap">
                              by {leave.approvedByName}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {leave.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAction(leave.id, 'approve')}
                              className="text-xs text-[var(--status-success-text)] hover:bg-[var(--status-success-bg)] border-[var(--status-success-text)]/20"
                            >
                              <Check size={13} className="mr-1" /> Approve
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAction(leave.id, 'reject')}
                              className="text-xs text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)] border-[var(--status-danger-text)]/20"
                            >
                              <X size={13} className="mr-1" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)] font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pt-4 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted)]">
            <p>
              Showing <span className="font-semibold text-[var(--text)]">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-[var(--text)]">{Math.min(page * limit, totalCount)}</span> of <span className="font-semibold text-[var(--text)]">{totalCount}</span> results
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="px-2 text-xs font-semibold text-[var(--text)]">
                {page} / {totalPages}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLeaves;