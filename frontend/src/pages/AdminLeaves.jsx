import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Calendar, CheckCircle2, XCircle, Clock, Search, ChevronLeft, ChevronRight, User } from 'lucide-react';

const AdminLeaves = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  // Pagination and search
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: leavesResponse, isLoading: loading } = useQuery({
    queryKey: ['admin', 'leaves', page, search],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      const response = await api.get(`/admin/leaves?limit=${limit}&offset=${offset}&search=${search}`);
      return response.data;
    },
  });

  const leaves = leavesResponse?.leaves || [];
  const stats = leavesResponse?.stats || { approved: 0, pending: 0, rejected: 0, total: 0 };
  const totalCount = leavesResponse?.total || 0;

  const handleAction = async (id, action) => {
    const queryKey = ['admin', 'leaves', page, search];
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
      
      // Refresh the real data in the background
      queryClient.invalidateQueries({ queryKey: ['admin', 'leaves'] });
    } catch (err) {
      // Rollback to previous state if the request actually failed
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
      console.error(`Error performing ${action} on leave:`, err);
      alert(`Failed to ${action} leave request.`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-600 border border-green-200">Approved</span>;
      case 'pending':
        return <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-semibold text-yellow-600 border border-yellow-200">Pending</span>;
      case 'rejected':
        return <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 border border-red-200">Rejected</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Leave Management</h1>
        <p className="text-slate-500 mt-1">Manage employee leave requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
          <p className="text-sm text-slate-500 mt-1 font-medium">Approved</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-sm text-slate-500 mt-1 font-medium">Pending</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
          <p className="text-sm text-slate-500 mt-1 font-medium">Rejected</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" /> Leave Requests
          </h3>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="search" 
              placeholder="Search employee..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium">Days</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p>Loading leave requests...</p>
                    </div>
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Calendar className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-600">No leave requests found</p>
                      <p className="text-sm mt-1">Try adjusting your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                          {leave.employeeName?.charAt(0) || <User size={14} />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{leave.employeeName}</p>
                          <p className="text-xs text-slate-500">{leave.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize font-medium text-slate-700">{leave.leaveType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-slate-900">{leave.startDate}</p>
                      {leave.endDate !== leave.startDate && (
                        <p className="text-xs text-slate-500">to {leave.endDate}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{leave.days}</td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <p className="truncate text-slate-600" title={leave.reason}>{leave.reason || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(leave.status)}
                      {leave.status !== 'pending' && leave.approvedByName && (
                        <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[120px]">
                          by {leave.approvedByName}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {leave.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleAction(leave.id, 'approve')}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 h-10 px-4 py-2 transition-colors cursor-pointer shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                          </button>
                          <button 
                            onClick={() => handleAction(leave.id, 'reject')}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 h-10 px-4 py-2 transition-colors cursor-pointer shadow-sm"
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Actioned</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-900">{((page - 1) * limit) + 1}</span> to <span className="font-medium text-slate-900">{Math.min(page * limit, totalCount)}</span> of <span className="font-medium text-slate-900">{totalCount}</span> results
            </p>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-3 py-1 text-sm font-medium text-slate-700">
                Page {page} of {totalPages}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLeaves;
