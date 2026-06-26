import React from 'react';
import { FileText, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const CandidateMobileApplications = ({ 
  applications, getStatusBadge, setIsTimelineModalOpen, setTimelineApp 
}) => {
  return (
    <div className="space-y-6 pb-2 md:hidden">
      {/* Hero Section with Animated Motion Graphics (Purple/Pink Theme) */}
      <section className="-mx-4 -mt-6 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-pink-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-fuchsia-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2">
          <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">My Activity</p>
          <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Applications</h2>
          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">{applications.length} submitted</p>
        </div>
      </section>

      {/* Applications List */}
      <div className="space-y-4 px-1 pb-6 -mt-12 relative z-20">
        {applications.length === 0 ? (
          <div className="bg-white rounded-[24px] shadow-sm border border-slate-100/50 p-8 text-center">
            <p className="text-slate-500 text-sm">You haven't submitted any applications yet.</p>
          </div>
        ) : (
          applications.map(app => {
            const latestUpdate = app.timeline.length > 0 ? app.timeline[0].created_at : app.appliedDate;

            return (
              <section key={app.id} className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative active:scale-[0.99] transition-transform">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{app.jobTitle}</h3>
                  <p className="text-sm font-medium text-slate-500 mb-4">{app.department} • {app.location}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                       <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Applied On</p>
                       <p className="text-xs font-semibold text-slate-700 mt-0.5">{new Date(app.appliedDate).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                       <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Update</p>
                       <p className="text-xs font-semibold text-slate-700 mt-0.5">{new Date(latestUpdate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setTimelineApp(app);
                      setIsTimelineModalOpen(true);
                    }}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-semibold py-3 flex items-center justify-center gap-2 text-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
                  >
                    <Clock className="w-4 h-4" />
                    View Timeline
                  </button>
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CandidateMobileApplications;
