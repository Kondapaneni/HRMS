import React from 'react';
import OriginationMobileSalesDashboard from './OriginationMobileSalesDashboard';

const OriginationSalesDashboard = () => {
  return (
    <>
      <div className="md:hidden">
        <OriginationMobileSalesDashboard />
      </div>

      <div className="hidden md:block min-h-screen bg-slate-50 p-6">
      </div>
    </>
  );
};

export default OriginationSalesDashboard;
