import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Send, Search, Check, RefreshCw, Users, Calendar, Award, Clock } from 'lucide-react';
import PageLoader from '../components/PageLoader';

const AssessmentAssignPage = () => {
  const queryClient = useQueryClient();
  const [selectedAssignExam, setSelectedAssignExam] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmps, setSelectedEmps] = useState(new Set());

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
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to assign assessment');
    }
  });

  const filteredEmps = (Array.isArray(employees) ? employees : []).filter(e => {
    const term = empSearch.toLowerCase();
    const name = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
    const dept = (e.department || '').toLowerCase();
    return name.includes(term) || dept.includes(term) || (e.email || '').toLowerCase().includes(term);
  });

  const toggleEmpSelection = (id) => {
    const next = new Set(selectedEmps);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEmps(next);
  };

  const selectAllEmps = () => {
    if (selectedEmps.size === filteredEmps.length) {
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
            Schedule exams for organizational employees or specific departments with optional completion deadlines.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-sm h-fit">
          <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
            <Award size={18} className="text-blue-600" />
            <span>1. Select Assessment</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">Available Exams *</label>
              <select
                value={selectedAssignExam}
                onChange={e => {
                  setSelectedAssignExam(e.target.value);
                  setSelectedEmps(new Set());
                }}
                className="w-full p-3 border border-slate-300 rounded-md text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              >
                <option value="">-- Choose an Assessment --</option>
                {assessments.filter(a => a.status === 'published').map(a => (
                  <option key={a.id} value={a.id}>{a.title} ({a.duration_minutes || 30} mins)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1.5">Optional Due Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={e => setAssignDueDate(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition font-medium"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center text-sm font-medium text-slate-700 mb-4 bg-slate-50 p-3 rounded-md border border-slate-200">
                <span>Selected Employees:</span>
                <span className="font-bold text-blue-600 text-sm bg-white px-2.5 py-0.5 rounded border border-slate-200 shadow-sm">{selectedEmps.size}</span>
              </div>
              <button
                onClick={() => {
                  if (!selectedAssignExam) return toast.error('Please select an assessment first');
                  if (selectedEmps.size === 0) return toast.error('Please select at least one employee');
                  assignMutation.mutate({ examId: selectedAssignExam, employeeIds: selectedEmps, dueDate: assignDueDate });
                }}
                disabled={assignMutation.isPending || !selectedAssignExam || selectedEmps.size === 0}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md font-medium text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {assignMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Assign Assessment Now</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Employee Multi-Select */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              <span>2. Select Employees ({filteredEmps.length})</span>
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={selectAllEmps}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 cursor-pointer"
              >
                {selectedEmps.size === filteredEmps.length && filteredEmps.length > 0 ? 'Deselect All' : 'Select All Filtered'}
              </button>
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, dept..."
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/30">
            {filteredEmps.map(emp => {
              const isSelected = selectedEmps.has(emp.id);
              return (
                <div
                  key={emp.id}
                  onClick={() => toggleEmpSelection(emp.id)}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                    isSelected ? 'bg-blue-50/80 hover:bg-blue-100/50' : 'hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition shadow-sm ${
                      isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check size={12} className="stroke-[3]" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-900">{emp.firstName} {emp.lastName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{emp.email} • <span className="font-medium text-slate-600">{emp.department || 'No Dept'}</span></div>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">{emp.position || 'Employee'}</span>
                </div>
              );
            })}
            {filteredEmps.length === 0 && (
              <div className="p-12 text-center text-slate-500 text-sm">
                <Users size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="font-medium">No employees match your search.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Status Table for Selected Exam */}
      {selectedAssignExam && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50">
            <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              <span>Current Assignments for Selected Assessment</span>
            </h3>
          </div>

          {loadingDetails ? (
            <div className="p-8 text-center text-slate-500">Loading assignments...</div>
          ) : !selectedExamDetails?.assignments || selectedExamDetails.assignments.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <Clock size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="font-medium text-slate-600">No employees assigned to this assessment yet</p>
              <p className="text-xs mt-1">Use the panel above to select employees and assign this exam.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Employee</th>
                    <th className="px-6 py-4 font-medium">Department</th>
                    <th className="px-6 py-4 font-medium">Assigned On</th>
                    <th className="px-6 py-4 font-medium">Due Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {selectedExamDetails.assignments.map((a, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {a.firstName} {a.lastName}
                        <div className="text-xs text-slate-500 font-normal">{a.email}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{a.department || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-500">{a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {a.due_date ? new Date(a.due_date).toLocaleDateString() : <span className="text-slate-400 font-normal">No deadline</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {a.status || 'Assigned'}
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
