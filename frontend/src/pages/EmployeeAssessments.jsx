import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
  Award, Clock, CheckCircle2, PlayCircle, 
  Calendar, Building2, BarChart2, ShieldAlert
} from 'lucide-react';
import PageLoader from '../components/PageLoader';

const EmployeeAssessments = () => {
  const navigate = useNavigate();

  const { data: assessments = [], isLoading, isError } = useQuery({
    queryKey: ['employeeAssessments'],
    queryFn: async () => {
      const res = await api.get('/employee/assessments');
      return res.data;
    }
  });

  if (isLoading) return <PageLoader />;
  if (isError) return (
    <div className="w-full space-y-6">
      <div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-200 flex items-center gap-3">
        <ShieldAlert size={20} />
        <p className="font-semibold text-sm">Failed to load assessments. Please try again.</p>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Exams & Assessments</h1>
          <p className="text-sm text-slate-500 mt-1">Your assigned employee assessments and evaluations.</p>
        </div>
        <div className="text-sm font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
          {assessments.length} Available
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm w-full">
          <Award size={56} className="text-blue-500/40 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Assessments Found</h3>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            You currently have no active assessments assigned to you. When new exams are published, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {assessments.map((assessment) => {
            const isCompleted = assessment.attempts_remaining <= 0;
            const inProgressId = assessment.in_progress_attempt_id;
            const canStart = !isCompleted;
            
            // Format date if present
            const isScheduledToday = assessment.assessment_date && assessment.assessment_date === new Date().toISOString().split('T')[0];
            const isBlockedByDate = assessment.assessment_date && !isScheduledToday;

            return (
              <div key={assessment.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-800 text-base leading-tight">
                      {assessment.title}
                    </h3>
                    {assessment.has_passed && (
                      <span className="shrink-0 bg-emerald-100 text-emerald-700 p-1 rounded-md">
                        <CheckCircle2 size={16} />
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Building2 size={14} className="text-slate-400" />
                      <span>{assessment.department || 'General'}</span>
                    </div>
                    {assessment.assessment_date ? (
                      <div className={`flex items-center gap-2 text-xs font-bold ${isScheduledToday ? 'text-indigo-600' : 'text-amber-600'}`}>
                        <Calendar size={14} />
                        <span>Scheduled: {assessment.assessment_date}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Calendar size={14} className="text-slate-400" />
                        <span>Anytime Access</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Duration</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5 flex items-center justify-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        {assessment.duration_minutes}m
                      </p>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Questions</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{assessment.questions_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Marks</p>
                      <p className="text-xs font-bold text-blue-600 mt-0.5">{assessment.total_marks}</p>
                    </div>
                  </div>

                  {/* Score & Attempts Info */}
                  {assessment.attempts_used > 0 && (
                    <div className="flex items-center justify-between text-xs font-semibold p-2 bg-blue-50/50 rounded-lg">
                      <span className="text-blue-800 flex items-center gap-1.5">
                        <BarChart2 size={14} /> 
                        Highest Score: {assessment.highest_score !== null ? `${assessment.highest_score}%` : 'N/A'}
                      </span>
                      <span className="text-slate-500">
                        {assessment.attempts_used} / {assessment.max_attempts} attempts
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  {isCompleted ? (
                    <button disabled className="w-full py-2.5 rounded-lg bg-slate-200 text-slate-500 font-bold text-sm cursor-not-allowed">
                      Max Attempts Reached
                    </button>
                  ) : isBlockedByDate ? (
                    <button disabled className="w-full py-2.5 rounded-lg bg-amber-100 text-amber-700 font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2">
                      <Calendar size={16} /> Scheduled for {assessment.assessment_date}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/employee/assessments/instructions', { state: { assessmentId: assessment.id } })}
                      className={`w-full py-2.5 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${
                        inProgressId 
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                    >
                      <PlayCircle size={16} />
                      {inProgressId ? 'Resume Assessment' : 'Start Assessment'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeeAssessments;
