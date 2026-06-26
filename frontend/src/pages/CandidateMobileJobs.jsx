import React from 'react';
import { Search, Briefcase, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const CandidateMobileJobs = ({ 
  jobs, appliedJobs, departments, jobTypes, 
  searchTerm, setSearchTerm, filterDept, setFilterDept, 
  filterType, setFilterType, isProfileComplete, setSelectedJob,
  getStatusBadge
}) => {
  const { profile } = useAuth();

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = filterDept === '' || job.department === filterDept;
    const matchesType = filterType === '' || (job.type && job.type.toLowerCase().replace(' ', '-') === filterType);
    return matchesSearch && matchesDept && matchesType;
  });

  return (
    <div className="space-y-6 pb-2 md:hidden">
      {/* Hero Section with Animated Motion Graphics (Green Theme) */}
      <section className="-mx-4 -mt-6 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-teal-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-lime-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2">
          <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">Find Opportunities</p>
          <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Open Jobs</h2>
          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">{jobs.length} published roles</p>
        </div>
      </section>

      {/* Filters Section */}
      <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative mx-1 -mt-12 z-20">
        <div className="p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-600 appearance-none"
            >
              <option value="">All Depts</option>
              {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-600 appearance-none"
            >
              <option value="">All Types</option>
              {jobTypes.map(type => <option key={type} value={type}>{type.replace('-', ' ')}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Job List */}
      <div className="space-y-4 px-1 pb-6">
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-[24px] shadow-sm border border-slate-100/50 p-8 text-center">
            <p className="text-slate-500 text-sm">No jobs match your filters.</p>
          </div>
        ) : (
          filteredJobs.map(job => {
            const application = appliedJobs[job.id];
            
            return (
              <section key={job.id} className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative active:scale-[0.99] transition-transform">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5 text-emerald-600" />
                    </div>
                    {application ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                        Applied
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                        New
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{job.title}</h3>
                  <p className="text-sm font-medium text-slate-500 mb-4">{job.department} • {job.location}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-5">
                    <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold border border-slate-100">
                      {job.type}
                    </span>
                    <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold border border-slate-100">
                      {job.experience || 'Any Exp'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {application ? (
                      <button disabled className="col-span-2 w-full rounded-xl bg-slate-100 text-slate-400 font-semibold py-3 text-sm flex items-center justify-center gap-2">
                        Already Applied
                      </button>
                    ) : (
                      <>
                        <a 
                          href={job.description_pdf_url || '#'} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-full rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-semibold py-3 flex items-center justify-center gap-2 text-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
                        >
                          Details
                        </a>
                        <button 
                          onClick={() => {
                            if (!isProfileComplete) {
                              toast.error('Please complete your profile to 100% to apply for jobs.');
                              return;
                            }
                            setSelectedJob(job);
                          }}
                          className={`w-full rounded-xl font-semibold py-3 flex items-center justify-center gap-2 text-sm active:scale-[0.98] transition-all ${
                            isProfileComplete 
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20' 
                              : 'bg-slate-200 text-slate-500 opacity-80'
                          }`}
                        >
                          {isProfileComplete ? 'Apply' : 'Incomplete'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CandidateMobileJobs;
