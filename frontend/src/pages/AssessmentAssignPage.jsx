import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Send, Search, Check, RefreshCw, Users, Calendar, Award, Clock, Filter, CheckSquare, Square, ChevronDown, UserCheck, AlertCircle } from 'lucide-react';
import PageLoader from '../components/PageLoader';

const AssessmentAssignPage = () => {
  const queryClient = useQueryClient();
  const [selectedAssignExam, setSelectedAssignExam] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [selectedEmps, setSelectedEmps] = useState(new Set());
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'history'

  const { data: assessments = [], isLoading: loadingA } = useQuery({
    queryKey: ['adminAssessments'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments');
      return res.data?.data || res.data || [];
    }
  });

  const { data: employees = [], isLoading: loadingE } = useQuery({
    queryKey: ['adminEmployees'],
    queryFn: async () => {
      const res = await api.get('/admin/employees');
      return res.data?.data || res.data || [];
    }
  });

  const { data: selectedExamDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['adminAssessmentDetails', selectedAssignExam],
    queryFn: async () => {
      if (!selectedAssignExam) return null;
      const res = await api.get(`/admin/assessments/${selectedAssignExam}`);
      return res.data?.data || res.data || null;
    },
    enabled: Boolean(selectedAssignExam)
  });

  const assignMutation = useMutation({
    mutationFn: async ({ examId, employeeIds, dueDate }) => {
      return await api.post(`/admin/assessments/${examId}/assign`, {
        employee_ids: Array.from(employeeIds),
        due_date: dueDate || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAssessmentDetails'] });
      toast.success('Assessment assigned successfully!');
      setSelectedEmps(new Set());
      setAssignDueDate('');
      setActiveTab('history');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to assign assessment');
    }
  });

  const publishedAssessments = (Array.isArray(assessments) ? assessments : []).filter(a => a.status === 'published');
  const departments = ['ALL', ...new Set((Array.isArray(employees) ? employees : []).map(e => e.department).filter(Boolean))];

  const filteredEmps = (Array.isArray(employees) ? employees : []).filter(e => {
    const term = empSearch.toLowerCase();
    const name = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
    const dept = (e.department || '').toLowerCase();
    const email = (e.email || '').toLowerCase();
    const matchesSearch = name.includes(term) || dept.includes(term) || email.includes(term);
    const matchesDept = deptFilter === 'ALL' || e.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const toggleEmpSelection = (id) => {
    const next = new Set(selectedEmps);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEmps(next);
  };

  const selectAllEmps = () => {
    if (selectedEmps.size === filteredEmps.length && filteredEmps.length > 0) {
      setSelectedEmps(new Set());
    } else {
      setSelectedEmps(new Set(filteredEmps.map(e => e.id)));
    }
  };

  if (loadingA || loadingE) return <PageLoader />;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Assign & Schedule Assessments</h1>
          <p className="text-sm text-slate-500">
            Select an assessment, pick your employees from the organizational directory, and schedule completion deadlines.
          </p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Award size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Published Assessments</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{publishedAssessments.length}</div>
            <div className="text-xs text-slate-400">Available to assign</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Employees</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{employees.length}</div>
            <div className="text-xs text-slate-400">Active directory users</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <UserCheck size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Selected to Assign</div>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">{selectedEmps.size}</div>
            <div className="text-xs text-slate-400">Employees checked</div>
          </div>
        </div>
      </div>

      {/* Zoho-Style Horizontal Control Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                1. Select Assessment Exam *
              </label>
              <div className="relative">
                <select
                  value={selectedAssignExam}
                  onChange={e => {
                    setSelectedAssignExam(e.target.value);
                    setSelectedEmps(new Set());
                  }}
                  className="w-full p-2.5 pl-3 pr-8 border border-slate-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition appearance-none"
                >
                  <option value="">-- Choose an Assessment --</option>
                  {publishedAssessments.map(a => (
                    <option key={a.id} value={a.id}>{a.title} ({a.duration_minutes || 30} mins)</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                2. Optional Due Date
              </label>
              <input
                type="date"
                value={assignDueDate}
                onChange={e => setAssignDueDate(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="flex items-end justify-end pt-2 lg:pt-0">
            <button
              onClick={() => {
                if (!selectedAssignExam) return toast.error('Please select an assessment from the dropdown first');
                if (selectedEmps.size === 0) return toast.error('Please select at least one employee below');
                assignMutation.mutate({ examId: selectedAssignExam, employeeIds: selectedEmps, dueDate: assignDueDate });
              }}
              disabled={assignMutation.isPending || !selectedAssignExam || selectedEmps.size === 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {assignMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              <span>Assign Assessment ({selectedEmps.size})</span>
            </button>
          </div>
        </div>

        {!selectedAssignExam && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50/80 px-3 py-2 rounded-md border border-amber-200/60 font-medium">
            <AlertCircle size={14} />
            <span>Please select a published assessment above to enable employee assignment and view current progress.</span>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('directory')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'directory'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Users size={16} />
            <span>Employee Directory ({filteredEmps.length})</span>
            {selectedEmps.size > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-bold">
                {selectedEmps.size} selected
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Calendar size={16} />
            <span>Assignment Tracking & History</span>
            {selectedExamDetails?.assignments && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-bold">
                {selectedExamDetails.assignments.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab 1: Full-Width Employee Directory Table */}
      {activeTab === 'directory' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAllEmps}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer shadow-2xs"
              >
                {selectedEmps.size === filteredEmps.length && filteredEmps.length > 0 ? (
                  <>
                    <CheckSquare size={14} className="text-blue-600" />
                    <span>Deselect All Filtered</span>
                  </>
                ) : (
                  <>
                    <Square size={14} className="text-slate-400" />
                    <span>Select All Filtered ({filteredEmps.length})</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="p-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Departments ({departments.length - 1})</option>
                  {departments.filter(d => d !== 'ALL').map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee by name, email..."
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="w-12 px-6 py-4 font-medium">
                    <input
                      type="checkbox"
                      checked={selectedEmps.size === filteredEmps.length && filteredEmps.length > 0}
                      onChange={selectAllEmps}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 font-medium">Employee Name</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium">Position / Role</th>
                  <th className="px-6 py-4 font-medium">Email Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmps.map(emp => {
                  const isSelected = selectedEmps.has(emp.id);
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => toggleEmpSelection(emp.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/70 hover:bg-blue-100/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEmpSelection(emp.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {emp.firstName} {emp.lastName}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {emp.department || 'General Staff'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{emp.position || 'Employee'}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{emp.email}</td>
                    </tr>
                  );
                })}
                {filteredEmps.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                      <Users size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="font-medium">No employees match your filter or search query.</p>
                      <p className="text-xs mt-1 text-slate-400">Try adjusting the search keywords or department dropdown above.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Assignment Tracking & History */}
      {activeTab === 'history' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 text-base">
                {selectedAssignExam ? `Assigned Employees for: ${selectedExamDetails?.title || 'Selected Assessment'}` : 'Assignment History'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Track completion progress, scores, and due dates for assigned staff members.
              </p>
            </div>
            {selectedAssignExam && (
              <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {selectedExamDetails?.assignments?.length || 0} Total Assigned
              </span>
            )}
          </div>

          {!selectedAssignExam ? (
            <div className="p-12 text-center text-slate-500">
              <Clock size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700 text-base">No assessment selected</p>
              <p className="text-xs mt-1 text-slate-500 max-w-sm mx-auto">
                Please select an assessment from the top dropdown bar to view its active employee assignments and completion progress.
              </p>
            </div>
          ) : loadingDetails ? (
            <div className="p-12 text-center text-slate-500 font-medium">Loading assignments...</div>
          ) : !selectedExamDetails?.assignments || selectedExamDetails.assignments.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Calendar size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700 text-base">No employees assigned yet</p>
              <p className="text-xs mt-1 text-slate-500">
                Switch to the "Employee Directory" tab to check employees and assign this assessment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Employee Name</th>
                    <th className="px-6 py-4 font-medium">Department</th>
                    <th className="px-6 py-4 font-medium">Assigned On</th>
                    <th className="px-6 py-4 font-medium">Due Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedExamDetails.assignments.map((a, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <div>{a.firstName} {a.lastName}</div>
                        <div className="text-xs text-slate-500 font-normal">{a.email}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {a.department || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {a.due_date ? new Date(a.due_date).toLocaleDateString() : <span className="text-slate-400 font-normal">No deadline</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                          a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {a.status === 'completed' && <Check size={12} />}
                          <span>{a.status || 'Assigned'}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssessmentAssignPage;

