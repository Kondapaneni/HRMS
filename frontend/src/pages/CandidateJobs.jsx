import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Briefcase, Clock, ChevronRight, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const CandidateJobs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('All');

  // Mock data for demonstration
  const mockJobs = [
    { id: 1, title: 'Senior Frontend Engineer', department: 'Engineering', location: 'Remote', type: 'Full-time', description: 'We are looking for an experienced React developer to help build scalable UI architectures for our core product.' },
    { id: 2, title: 'Product Manager', department: 'Product', location: 'New York, NY', type: 'Full-time', description: 'Lead the product strategy and execution for our upcoming mobile app releases. Work closely with engineering and design.' },
    { id: 3, title: 'UX Designer', department: 'Design', location: 'San Francisco, CA', type: 'Full-time', description: 'Create beautiful, intuitive, and user-centric interfaces. Strong portfolio in SaaS web applications required.' },
    { id: 4, title: 'HR Coordinator', department: 'Human Resources', location: 'Chicago, IL', type: 'Contract', description: 'Assist with onboarding, employee relations, and maintaining our HRMS records. Great entry-level opportunity.' },
    { id: 5, title: 'Backend Engineer (Go)', department: 'Engineering', location: 'Remote', type: 'Full-time', description: 'Design and build high-performance microservices using Go and PostgreSQL. Experience with cloud infrastructure is a plus.' },
  ];

  const departments = ['All', 'Engineering', 'Product', 'Design', 'Human Resources'];

  const filteredJobs = mockJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === 'All' || job.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const handleApply = (title) => {
    toast.success(`Successfully applied for the ${title} position!`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Open Positions</h1>
          <p className="text-sm text-slate-500 mt-1">Discover your next career opportunity at Acme.</p>
        </motion.div>
      </div>

      {/* Search and Filter Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row gap-4 relative z-20"
      >
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            placeholder="Search for job titles or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="w-full md:w-64 relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-4 w-4 text-slate-400" />
          </div>
          <select
            className="block w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors appearance-none cursor-pointer text-slate-700"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
            <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" />
          </div>
        </div>
      </motion.div>

      {/* Job List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-1 md:col-span-2 lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">No jobs found</h3>
            <p className="text-slate-500">We couldn't find any open positions matching your current filters.</p>
          </motion.div>
        ) : (
          filteredJobs.map((job, index) => (
            <motion.div 
              key={job.id}
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 + (index * 0.1) }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{job.title}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {job.department}
                  </span>
                </div>
                
                <div className="flex flex-col gap-2 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-2"><MapPin size={16} /> {job.location}</span>
                  <span className="flex items-center gap-2"><Clock size={16} /> {job.type}</span>
                  <span className="flex items-center gap-2"><Briefcase size={16} /> Mid-Senior Level</span>
                </div>
                
                <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1">
                  {job.description}
                </p>
                
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                  <span className="text-xs font-medium text-slate-400">Posted 2 days ago</span>
                  <button 
                    onClick={() => handleApply(job.title)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-blue-600/20 active:scale-95"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default CandidateJobs;
