import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Briefcase, 
  ChevronRight, 
  MapPin, 
  Clock, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles, 
  Filter, 
  ArrowRight,
  UserCheck,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const CandidateMobileJobs = ({ 
  jobs, appliedJobs, departments, jobTypes, 
  searchTerm, setSearchTerm, filterDept, setFilterDept, 
  filterType, setFilterType, isProfileComplete, setSelectedJob,
  getStatusBadge
}) => {
  const { profile } = useAuth();
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = filterDept === '' || job.department === filterDept;
    const matchesType = filterType === '' || (job.type && job.type.toLowerCase().replace(' ', '-') === filterType);
    return matchesSearch && matchesDept && matchesType;
  });

  const toggleExpand = (id) => {
    setExpandedJobId(prev => prev === id ? null : id);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDept('');
    setFilterType('');
  };

  const hasActiveFilters = searchTerm !== '' || filterDept !== '' || filterType !== '';

  return (
    <div className="space-y-4 pb-12 md:hidden">
      {/* 1. Hero Section with Animated Motion Graphics (Soft Emerald Theme) */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        {/* Soft Glowing Emerald, Teal, and Cyan Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-teal-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-cyan-400 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 px-2">
          <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md flex items-center gap-1.5">
            <Sparkles size={12} className="text-emerald-300" />
            Career Opportunities &bull; Candidate Portal
          </p>
          <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">
            Open Jobs
          </h2>
          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
            {jobs.length} {jobs.length === 1 ? 'role' : 'roles'} published &bull; Apply in minutes
          </p>
        </div>
      </section>

      {/* 2. Floating Search & Filters Card */}
      <section className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs relative -mt-8 z-20 mx-0.5 space-y-3.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
          <input
            type="search"
            placeholder="Search roles, department, skill..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-full border border-[#dadce0] bg-[#f8fafd] text-xs text-[#1f1f1f] placeholder:text-[#5f6368] focus:bg-white focus:border-[#137333] focus:ring-2 focus:ring-[#137333]/20 transition-all outline-none"
          />
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 gap-2.5">
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="w-full h-10 px-4 rounded-full border border-[#dadce0] bg-[#f8fafd] text-xs font-semibold text-[#1f1f1f] focus:bg-white focus:border-[#137333] focus:ring-2 focus:ring-[#137333]/20 transition-all outline-none cursor-pointer"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full h-10 px-4 rounded-full border border-[#dadce0] bg-[#f8fafd] text-xs font-semibold text-[#1f1f1f] focus:bg-white focus:border-[#137333] focus:ring-2 focus:ring-[#137333]/20 transition-all outline-none cursor-pointer"
          >
            <option value="">All Job Types</option>
            {jobTypes.map(type => (
              <option key={type} value={type}>{type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>
        </div>

        {/* Active Filters / Result Summary */}
        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <span className="font-semibold text-[#5f6368]">
            {filteredJobs.length} {filteredJobs.length === 1 ? 'position found' : 'positions found'}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 font-bold text-[#137333] hover:underline cursor-pointer"
            >
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      </section>

      {/* 3. Job Openings Cards List */}
      <div className="space-y-3.5 px-0.5">
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-[#dadce0] p-8 text-center shadow-xs space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#f8fafd] text-[#5f6368] flex items-center justify-center mx-auto border border-[#e0e3e7]">
              <Briefcase size={20} />
            </div>
            <h3 className="text-sm font-bold text-[#1f1f1f]">No published jobs match</h3>
            <p className="text-xs text-[#5f6368] max-w-xs mx-auto">
              Try adjusting your keywords or clearing the active department/type filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-[#137333] bg-[#e6f4ea] border border-[#ceead6]"
            >
              Reset Search
            </button>
          </div>
        ) : (
          filteredJobs.map(job => {
            const application = appliedJobs[job.id];
            const isExpanded = expandedJobId === job.id;
            const initials = job.title.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'JB';

            return (
              <section 
                key={job.id} 
                className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-4 hover:border-[#dadce0] transition-all"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#e6f4ea] text-[#137333] flex items-center justify-center font-bold text-sm border border-[#ceead6] shrink-0 shadow-2xs">
                      {initials}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-bold text-[#1f1f1f] text-sm leading-snug">
                        {job.title}
                      </h3>
                      <p className="text-xs font-medium text-[#5f6368] flex items-center gap-1.5 truncate">
                        <span>{job.department}</span>
                        <span>&bull;</span>
                        <span>{job.location}</span>
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {application ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] shadow-2xs">
                        <CheckCircle2 size={11} /> Applied
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] shadow-2xs">
                        Open
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata Pills */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#f8fafd] rounded-xl p-2.5 border border-[#e0e3e7] text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#5f6368]">Type</p>
                    <p className="text-xs font-bold text-[#1f1f1f] capitalize truncate mt-0.5">{job.type || 'Full-time'}</p>
                  </div>
                  <div className="bg-[#f8fafd] rounded-xl p-2.5 border border-[#e0e3e7] text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#5f6368]">Experience</p>
                    <p className="text-xs font-bold text-[#1f1f1f] truncate mt-0.5">{job.experience || 'Any'}</p>
                  </div>
                  <div className="bg-[#f8fafd] rounded-xl p-2.5 border border-[#e0e3e7] text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#5f6368]">Vacancies</p>
                    <p className="text-xs font-bold text-[#137333] truncate mt-0.5">{job.vacancy || 1} Open</p>
                  </div>
                </div>

                {/* Collapsible Job Description Preview */}
                {job.description && (
                  <div className="pt-0.5">
                    <div className="text-xs text-[#444746] leading-relaxed">
                      <p className={isExpanded ? 'whitespace-pre-line' : 'line-clamp-2'}>
                        {job.description}
                      </p>
                    </div>
                    {job.description.length > 100 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(job.id)}
                        className="text-[11px] font-bold text-[#137333] hover:underline mt-1 cursor-pointer"
                      >
                        {isExpanded ? 'Show less' : 'Read more & requirements...'}
                      </button>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 border-t border-[#f1f3f4] flex items-center gap-2">
                  {job.description_pdf_url && (
                    <a 
                      href={job.description_pdf_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 h-11 rounded-full border border-[#dadce0] bg-white hover:bg-[#f8fafd] text-xs font-semibold text-[#5f6368] hover:text-[#1f1f1f] flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                    >
                      <ExternalLink size={13} />
                      <span>PDF Spec</span>
                    </a>
                  )}

                  {application ? (
                    <Link
                      to="/candidate/applications"
                      className="flex-1 h-11 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                    >
                      <CheckCircle2 size={14} />
                      <span>View Application</span>
                    </Link>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => {
                        if (!isProfileComplete) {
                          toast.error('Please complete your profile to 100% to apply for jobs.');
                          return;
                        }
                        setSelectedJob(job);
                      }}
                      className={`flex-1 h-11 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                        isProfileComplete 
                          ? 'bg-[#137333] hover:bg-[#0f5b28] active:bg-[#0b4820] text-white' 
                          : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
                      }`}
                    >
                      <Briefcase size={14} />
                      <span>{isProfileComplete ? 'Apply for Position' : 'Complete Profile First'}</span>
                    </button>
                  )}
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
