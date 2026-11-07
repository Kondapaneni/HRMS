import { useState } from 'react';
import SearchBar from '../components/ui/SearchBar';
import { Briefcase, CheckCircle2, ExternalLink, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const CandidateMobileJobs = ({ 
  jobs, appliedJobs, departments, jobTypes, 
  searchTerm, setSearchTerm, filterDept, setFilterDept, 
  filterType, setFilterType, isProfileComplete, setSelectedJob
}) => {
  const [expandedJobId, setExpandedJobId] = useState(null);

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
    <div className="space-y-4 pb-14 antialiased select-none font-sans md:hidden">
      {/* Header */}
      <section className="pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Sparkles size={12} className="text-[var(--accent-pink-deep)]" />
            Career Opportunities • Candidate Portal
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Open Jobs
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-[var(--brand-deep)] bg-[var(--brand-tint)] border border-[var(--brand)]/20 shrink-0">
              {jobs.length} {jobs.length === 1 ? 'role' : 'roles'}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[var(--muted)] mt-1">
            Apply directly with your verified profile
          </p>
        </div>
      </section>

      {/* Search & Filters Card */}
      <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-3">
        {/* Search Input */}
        <SearchBar
          placeholder="Search roles, department, skill..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="w-full h-9 px-3 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none cursor-pointer"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full h-9 px-3 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none cursor-pointer"
          >
            <option value="">All Job Types</option>
            {jobTypes.map(type => (
              <option key={type} value={type}>{type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>
        </div>

        {/* Active Filters / Result Summary */}
        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <span className="font-medium text-[var(--muted)]">
            {filteredJobs.length} {filteredJobs.length === 1 ? 'position found' : 'positions found'}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 font-semibold text-[var(--brand-deep)] hover:underline cursor-pointer"
            >
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      </section>

      {/* Job Openings Cards List */}
      <div className="space-y-3.5 px-0.5">
        {filteredJobs.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-[20px] border border-dashed border-[var(--line)] p-8 text-center shadow-xs space-y-2">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-alt)] text-[var(--muted)] flex items-center justify-center mx-auto border border-[var(--line)]">
              <Briefcase size={20} />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text)]">No published jobs match</h3>
            <p className="text-xs text-[var(--muted)] max-w-xs mx-auto">
              Try adjusting your keywords or clearing the active department/type filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] border border-[var(--brand)]/20"
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
                className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 sm:p-5 shadow-xs space-y-3.5 hover:border-[var(--brand)]/30 transition-all"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center font-bold text-xs border border-[var(--brand)]/20 shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-semibold text-[var(--text)] text-sm leading-snug">
                        {job.title}
                      </h3>
                      <p className="text-xs font-medium text-[var(--muted)] flex items-center gap-1.5 truncate">
                        <span>{job.department}</span>
                        <span>&bull;</span>
                        <span>{job.location}</span>
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {application ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F0FB] text-[#3B6FB6] border border-[#D2E3FC]">
                        <CheckCircle2 size={11} /> Applied
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6F6EC] text-[#1F9D55] border border-[#CEEAD6]">
                        Open
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata Pills */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[var(--surface-alt)] rounded-[10px] p-2 border border-[var(--line)] text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">Type</p>
                    <p className="text-xs font-semibold text-[var(--text)] capitalize truncate mt-0.5">{job.type || 'Full-time'}</p>
                  </div>
                  <div className="bg-[var(--surface-alt)] rounded-[10px] p-2 border border-[var(--line)] text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">Experience</p>
                    <p className="text-xs font-semibold text-[var(--text)] truncate mt-0.5">{job.experience || 'Any'}</p>
                  </div>
                  <div className="bg-[var(--surface-alt)] rounded-[10px] p-2 border border-[var(--line)] text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">Vacancies</p>
                    <p className="text-xs font-semibold text-[#1F9D55] truncate mt-0.5">{job.vacancy || 1} Open</p>
                  </div>
                </div>

                {/* Collapsible Job Description Preview */}
                {job.description && (
                  <div className="pt-0.5">
                    <div className="text-xs text-[var(--text-2)] leading-relaxed">
                      <p className={isExpanded ? 'whitespace-pre-line' : 'line-clamp-2'}>
                        {job.description}
                      </p>
                    </div>
                    {job.description.length > 100 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(job.id)}
                        className="text-[11px] font-semibold text-[var(--brand-deep)] hover:underline mt-1 cursor-pointer"
                      >
                        {isExpanded ? 'Show less' : 'Read more & requirements...'}
                      </button>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 border-t border-[var(--line)] flex items-center gap-2">
                  {job.description_pdf_url && (
                    <a 
                      href={job.description_pdf_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 h-10 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ExternalLink size={13} />
                      <span>PDF Spec</span>
                    </a>
                  )}

                  {application ? (
                    <Link
                      to="/candidate/applications"
                      className="flex-1 h-10 rounded-full bg-[#E8F0FB] text-[#3B6FB6] border border-[#D2E3FC] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
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
                      className={`flex-1 h-10 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                        isProfileComplete 
                          ? 'bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white' 
                          : 'bg-[var(--surface-alt)] text-[var(--muted)] border border-[var(--line)]'
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
