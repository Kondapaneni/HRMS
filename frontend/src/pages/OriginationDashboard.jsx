import React from 'react';
import OriginationMobileDashboard from './OriginationMobileDashboard';

const OriginationDashboard = () => {
  return (
    <>
      <div className="md:hidden">
        <OriginationMobileDashboard />
      </div>

      <div className="hidden md:block p-4 md:p-6 space-y-6">
        {/* Desktop Dashboard content will go here */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Loans Origination</h1>
        <p className="text-slate-500">Welcome to the desktop dashboard.</p>
      </div>
    </>
  );
};

export default OriginationDashboard;
