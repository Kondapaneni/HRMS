import React from 'react';
import OriginationMobileDashboard from './OriginationMobileDashboard';

const OriginationDashboard = () => {
  return (
    <>
      <div className="md:hidden">
        <OriginationMobileDashboard />
      </div>

      <div className="hidden md:block p-4 md:p-6 space-y-6">
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Loans Origination</h1>
          <div className="bg-blue-50 text-blue-700 px-6 py-3 rounded-full font-medium border border-blue-100 shadow-sm">
            Coming Soon
          </div>
          <p className="text-slate-500 mt-6 max-w-md">
            We are working hard to bring you the new Loan Origination experience. Stay tuned!
          </p>
        </div>
      </div>
    </>
  );
};

export default OriginationDashboard;
