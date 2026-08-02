import React from 'react';
import { Settings, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const MaintenanceOverlay = ({ message }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />
        
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Settings size={36} className="text-amber-600 animate-[spin_4s_linear_infinite]" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
          Under Maintenance
        </h2>
        
        <p className="text-slate-600 mb-8 leading-relaxed">
          {message || "The application is currently undergoing maintenance. Please check back later."}
        </p>

        <button 
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
        >
          <RefreshCw size={18} />
          Refresh Page
        </button>
      </motion.div>
    </div>
  );
};

export default MaintenanceOverlay;
