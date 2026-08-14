import React from 'react';
import { motion } from 'framer-motion';
import { Building2, FileCheck, Clock, CheckCircle2, AlertCircle, ArrowRight, Sparkles, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BranchOperationsDashboard = () => {
  const { profile } = useAuth();

  return (
    <div className="w-full space-y-6">
      {/* Mobile Animated Hero Header */}
      <section className="md:hidden relative px-6 pt-12 pb-24 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 40, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -30, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-violet-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />

        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 backdrop-blur-md border border-indigo-400/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles size={12} />
            Branch Operations
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-1 drop-shadow-sm">
            Operations
          </h2>
          <p className="text-sm font-medium text-indigo-100 drop-shadow-sm opacity-90">
            Branch loan file processing & workflow
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="p-4 md:p-6 space-y-6 md:pb-6 relative z-20 -mt-16 md:mt-0">
        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center mb-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles size={12} />
              Branch Operations Module
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Loan Branch Operations</h1>
            <p className="text-sm text-slate-500 mt-1">Manage, process, and track loan branch operations.</p>
          </div>
        </div>

        {/* Welcome Card */}
        <div className="bg-white rounded-2xl md:rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Branch Operations Workspace Active</h3>
              <p className="text-sm text-slate-500 mt-1">
                You have been granted access to the Loan Branch Operations module. Ready for branch loan workflows, verification queues, and operational dashboards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchOperationsDashboard;
