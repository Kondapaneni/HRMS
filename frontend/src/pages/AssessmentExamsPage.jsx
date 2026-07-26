import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Award, Plus, Trash2, Edit2, Clock } from 'lucide-react';
import PageLoader from '../components/PageLoader';

const AssessmentExamsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: assessments = [], isLoading: loadingA } = useQuery({
    queryKey: ['adminAssessments'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments');
      return res.data?.data || res.data || [];
    }
  });

  const deleteAMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/admin/assessments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAssessments'] });
      toast.success('Assessment deleted successfully!');
    },
    onError: () => toast.error('Failed to delete assessment')
  });

  if (loadingA) return <PageLoader />;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Exams & Assessments</h1>
          <p className="text-sm text-slate-500">
            Build and manage assessments with configurable timing and grading rules.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/assessments/create')}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Assessment
        </button>
      </div>

      {/* Assessments List Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Assessment Title</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium">Pass Criteria</th>
                <th className="px-6 py-4 font-medium">Attempts</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {assessments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <div>{a.title}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className="flex items-center gap-1"><Clock size={15} className="text-slate-400" /> {a.duration_minutes || 30} mins</span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {a.passing_percentage || 70}%
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {a.max_attempts == 0 ? 'Unlimited' : `${a.max_attempts} max`}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => navigate('/admin/assessments/edit/' + a.id)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit Assessment"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this assessment?')) {
                          deleteAMutation.mutate(a.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Delete Assessment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {assessments.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Award size={40} className="text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">No assessments created yet</p>
                      <p className="text-xs mt-1">Click "Create Assessment" above to build your first exam.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AssessmentExamsPage;
