import React from 'react';
import { Award } from 'lucide-react';

const EmployeeAssessments = () => {
  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
          <Award size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exams & Assessments</h1>
          <p className="text-sm text-slate-500">Your assigned employee assessments and evaluations.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm w-full">
        <Award size={56} className="text-blue-500/40 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Assessments Under Construction</h3>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          We are upgrading our assessments engine with a fresh new experience. Assigned exams will appear here soon!
        </p>
      </div>
    </div>
  );
};

export default EmployeeAssessments;
