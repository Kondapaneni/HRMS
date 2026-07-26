import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { BarChart2, CheckCircle, XCircle, Award, Users, TrendingUp, Activity } from 'lucide-react';
import PageLoader from '../components/PageLoader';

const AssessmentAnalyticsPage = () => {
  const { data: analyticsData, isLoading: anaLoading } = useQuery({
    queryKey: ['adminAssessmentAnalytics'],
    queryFn: async () => {
      const res = await api.get('/admin/assessments/analytics');
      return res.data?.data || res.data || {};
    }
  });

  if (anaLoading) return <PageLoader />;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Analytics & Reports</h1>
          <p className="text-sm text-slate-500">
            Monitor organizational assessment performance, pass rates, and employee submission logs.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Award size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Assessments</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{analyticsData?.stats?.total_assessments || 0}</div>
            <div className="text-xs text-slate-400">Published & Draft</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Assigned</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{analyticsData?.stats?.total_assigned || 0}</div>
            <div className="text-xs text-slate-400">Employee assignments</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overall Pass Rate</div>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">{analyticsData?.stats?.overall_pass_rate || 0}%</div>
            <div className="text-xs text-slate-400">Across completed attempts</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average Score</div>
            <div className="text-2xl font-bold text-blue-600 mt-0.5">{analyticsData?.stats?.avg_score || 0}%</div>
            <div className="text-xs text-slate-400">Mean percentage score</div>
          </div>
        </div>
      </div>

      {/* Recent Attempts Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <span className="font-semibold text-slate-800 text-lg">Recent Employee Submission Logs</span>
          <span className="text-xs font-medium text-slate-500">Showing latest completions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Assessment</th>
                <th className="px-6 py-4 font-medium">Score</th>
                <th className="px-6 py-4 font-medium">Percentage</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Completed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {(analyticsData?.recent_attempts || []).map((ra, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <div>{ra.firstName} {ra.lastName}</div>
                    <div className="text-xs text-slate-500 font-normal">{ra.department || 'No Dept'}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{ra.assessment_title}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{ra.total_score} / {ra.max_score} pts</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{ra.percentage}%</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                      ra.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {ra.passed ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      <span>{ra.passed ? 'PASSED' : 'FAILED'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-slate-500">
                    {ra.end_time ? new Date(ra.end_time).toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))}
              {(analyticsData?.recent_attempts || []).length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <BarChart2 size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">No completed assessment attempts recorded yet</p>
                    <p className="text-xs mt-1">Once employees complete their assigned exams, their scores and status will appear here.</p>
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

export default AssessmentAnalyticsPage;
