import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Calendar, CheckCircle2, XCircle, Clock, Search, ChevronLeft, ChevronRight, User, Check, X, ArrowUpRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminLeaves = () => {
  const { profile } = useAuth();
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
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <Check size={11} className="stroke-[3]" /> Approved
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fef7e0] text-[#b06000] border border-[#feefc3] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <Clock size={11} className="stroke-[2.5]" /> Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <X size={11} className="stroke-[3]" /> Rejected
          </span>
        );
      default:
        return (
          <span className="capitalize inline-flex items-center rounded-full bg-[#f1f3f4] text-[#5f6368] border border-[#e0e3e7] px-2.5 py-0.5 text-[10px] font-semibold">
            {status}
          </span>
        );
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  if (initialLoading && !leaves.length && !debouncedSearch) return <PageLoader message="Loading Leave Requests..." />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Leave Requests & Approvals</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight">
            Leave Management <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full align-middle ml-1.5">{totalCount} Total</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Review and approve or reject employee leave applications.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-3">
        {/* Approved Card */}
        <div className="rounded-2xl border border-[#ceead6] bg-[#e6f4ea]/40 p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#137333]">Approved Leaves</p>
            <p className="text-2xl sm:text-3xl font-normal text-[#137333] tracking-tight mt-1">{stats.approved}</p>
            <p className="text-[10.5px] text-[#137333]/80 mt-0.5">Granted applications</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#e6f4ea] text-[#137333] border border-[#ceead6] flex items-center justify-center shadow-xs">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Pending Card */}
        <div className="rounded-2xl border border-[#feefc3] bg-[#fef7e0]/40 p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#b06000]">Pending Action</p>
            <p className="text-2xl sm:text-3xl font-normal text-[#b06000] tracking-tight mt-1">{stats.pending}</p>
            <p className="text-[10.5px] text-[#b06000]/80 mt-0.5">Awaiting decision</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#fef7e0] text-[#b06000] border border-[#feefc3] flex items-center justify-center shadow-xs">
            <Clock size={20} />
          </div>
        </div>

        {/* Rejected Card */}
        <div className="rounded-2xl border border-[#fad2cf] bg-[#fce8e6]/40 p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#c5221f]">Rejected Leaves</p>
            <p className="text-2xl sm:text-3xl font-normal text-[#c5221f] tracking-tight mt-1">{stats.rejected}</p>
            <p className="text-[10.5px] text-[#c5221f]/80 mt-0.5">Declined requests</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] flex items-center justify-center shadow-xs">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
        {/* Table Header Bar */}
        <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
              <Calendar size={15} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Leave Applications</h3>
              <p className="text-[11px] text-[#5f6368]">All submitted employee leave requests</p>
            </div>
          </div>
          
          {/* Google Pill Search */}
          <div className="relative w-full sm:w-72">
            {isFetching ? (
              <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a73e8] animate-spin pointer-events-none" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
            )}
            <input 
              type="search" 
              placeholder="Search by employee name or code..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar min-h-[300px] relative">
          {initialLoading && leaves.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-7 w-7 animate-spin text-[#4285F4]" />
            </div>
          ) : (
            <table className="w-full text-xs text-left">
            <thead className="bg-[#f8fafd] border-b border-[#e0e3e7]">
              <tr>
                <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider whitespace-nowrap">Employee</th>
                <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider whitespace-nowrap">Type</th>
                <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider whitespace-nowrap">Duration</th>
                <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider whitespace-nowrap">Days</th>
                <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider min-w-[160px]">Reason</th>
                <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="h-10 px-4 font-semibold text-[#5f6368] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f4]">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-14 text-center text-[#5f6368]">
                    <div className="flex flex-col items-center justify-center">
                      <Calendar size={28} className="text-[#dadce0] mb-2" />
                      <p className="text-xs font-semibold text-[#1f1f1f]">No leave requests found</p>
                      <p className="text-[11px] text-[#5f6368] mt-0.5">Try adjusting your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-[#f8fafd] transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#1f1f1f] whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center font-bold text-[10px] shrink-0 border border-[#d2e3fc]">
                          {leave.employeeName?.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2) || <User size={12} />}
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-[#1f1f1f]">{leave.employeeName}</p>
                          <p className="text-[10px] text-[#5f6368]">{leave.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="capitalize font-medium text-xs text-[#444746] bg-[#f1f3f4] px-2.5 py-0.5 rounded-full inline-block whitespace-nowrap">
                        {leave.leaveType}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-semibold text-[#1f1f1f]">{leave.startDate}</p>
                      {leave.endDate !== leave.startDate && (
                        <p className="text-[10px] text-[#5f6368]">to {leave.endDate}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center whitespace-nowrap bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                        {leave.days} {leave.days === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <p className="text-xs text-[#5f6368] break-words line-clamp-2" title={leave.reason}>{leave.reason || '-'}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        {getStatusBadge(leave.status)}
                        {leave.status !== 'pending' && leave.approvedByName && (
                          <p className="text-[9.5px] text-[#5f6368] mt-1 whitespace-nowrap">
                            by {leave.approvedByName}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {leave.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => handleAction(leave.id, 'approve')}
                            className="inline-flex items-center justify-center rounded-full text-[10.5px] font-semibold border border-[#ceead6] bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333] h-7 px-3 transition-colors cursor-pointer gap-1 shadow-2xs"
                          >
                            <Check size={12} className="stroke-[3]" /> Approve
                          </button>
                          <button 
                            onClick={() => handleAction(leave.id, 'reject')}
                            className="inline-flex items-center justify-center rounded-full text-[10.5px] font-semibold border border-[#fad2cf] bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] h-7 px-3 transition-colors cursor-pointer gap-1 shadow-2xs"
                          >
                            <X size={12} className="stroke-[3]" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#9aa0a6] font-medium italic">Completed</span>
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
          <div className="p-4 border-t border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center justify-between text-xs text-[#5f6368]">
            <p>
              Showing <span className="font-semibold text-[#1f1f1f]">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-[#1f1f1f]">{Math.min(page * limit, totalCount)}</span> of <span className="font-semibold text-[#1f1f1f]">{totalCount}</span> results
            </p>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#444746] font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-[11px]"
              >
                Previous
              </button>
              <div className="px-2 text-xs font-semibold text-[#1f1f1f]">
                {page} / {totalPages}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3.5 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#444746] font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-[11px]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLeaves;
