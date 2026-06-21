import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Briefcase, Clock, ChevronRight, Filter, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../api/supabase';
import { useAuth } from '../contexts/AuthContext';

const CandidateJobs = () => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  
  const [jobs, setJobs] = useState([]);
  const [departments, setDepartments] = useState(['All']);
  const [isLoading, setIsLoading] = useState(true);

  // Application Modal State
  const [selectedJob, setSelectedJob] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeUrl, setSelectedResumeUrl] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    fetchJobs();
    if (profile?.id) {
      fetchResumes();
    }
  }, [profile]);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'Published')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setJobs(data || []);
      
      const depts = new Set(['All']);
      (data || []).forEach(job => depts.add(job.department));
      setDepartments(Array.from(depts));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResumes = async () => {
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('resume_url')
        .eq('user_id', profile.id)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      
      const resumesArr = Array.isArray(data?.resume_url) ? data.resume_url : [];
      setResumes(resumesArr);
      
      const primary = resumesArr.find(r => r.isPrimary);
      if (primary) setSelectedResumeUrl(primary.url);
      else if (resumesArr.length > 0) setSelectedResumeUrl(resumesArr[0].url);
      
    } catch (error) {
      console.error('Error fetching resumes:', error);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = filterDept === 'All' || job.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedResumeUrl) {
      toast.error('Please select a resume to apply.');
      return;
    }
    
    setIsApplying(true);
    try {
      // Check if already applied
      const { data: existingApp, error: checkError } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', selectedJob.id)
        .eq('candidate_id', profile.id)
        .single();
        
      if (existingApp) {
        toast.error('You have already applied for this position.');
        setSelectedJob(null);
        return;
      }
      
      // Submit Application
      const { error } = await supabase
        .from('applications')
        .insert([{
          job_id: selectedJob.id,
          candidate_id: profile.id,
          resume_url: selectedResumeUrl,
          status: 'Applied'
        }]);
        
      if (error) throw error;
      
      // Also log the timeline
      const { data: newApp } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', selectedJob.id)
        .eq('candidate_id', profile.id)
        .single();
        
      if (newApp) {
         await supabase.from('application_timeline').insert([{
           application_id: newApp.id,
           status_change: 'Applied',
           notes: 'Application submitted successfully',
           updated_by: profile.id
         }]);

         // Queue email notification
         const emailBody = `
           <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
             <h2 style="color: #2563eb;">Application Received</h2>
             <p>Hi ${profile.firstName},</p>
             <p>Thank you for applying for the <strong>${selectedJob.title}</strong> position at Acme HRMS.</p>
             <p>Your application has been successfully received and is currently under review by our recruitment team. You can track your application status anytime from your Candidate Dashboard.</p>
             <p>Best regards,<br>The Acme Team</p>
           </div>
         `;
         
         await supabase.from('email_queue').insert([{
           to_email: profile.email,
           subject: `Application Received: ${selectedJob.title}`,
           body: emailBody
         }]);
      }
      
      toast.success(`Successfully applied for the ${selectedJob.title} position!`);
      setSelectedJob(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsApplying(false);
    }
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
                
                <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1 line-clamp-3">
                  {job.description}
                </p>
                
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                  <span className="text-xs font-medium text-slate-400">Posted {new Date(job.created_at).toLocaleDateString()}</span>
                  <div className="flex gap-2">
                    {job.description_pdf_url && (
                      <a 
                        href={job.description_pdf_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-semibold text-sm transition-colors shadow-sm active:scale-95 flex items-center justify-center"
                      >
                        JD
                      </a>
                    )}
                    <button 
                      onClick={() => setSelectedJob(job)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-blue-600/20 active:scale-95"
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Application Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800">Apply for {selectedJob.title}</h2>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="apply-job-form" onSubmit={handleApplySubmit} className="space-y-4">
                <p className="text-sm text-slate-500 mb-6">{selectedJob.department} &bull; {selectedJob.location}</p>
                
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Resume</label>
                  {resumes.length === 0 ? (
                    <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 text-sm">
                      You don't have any resumes uploaded. Please go to your <a href="/candidate/profile" className="font-bold underline">Profile</a> to upload a resume first.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {resumes.map((resume, index) => (
                        <label key={index} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${selectedResumeUrl === resume.url ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <div className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              name="resumeSelection" 
                              value={resume.url}
                              checked={selectedResumeUrl === resume.url}
                              onChange={(e) => setSelectedResumeUrl(e.target.value)}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                            />
                            <div className="flex flex-col">
                              <span className={`font-medium ${selectedResumeUrl === resume.url ? 'text-blue-900' : 'text-slate-800'}`}>{resume.name}</span>
                              {resume.isPrimary && <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-0.5">Primary</span>}
                            </div>
                          </div>
                          <FileText className={`w-5 h-5 ${selectedResumeUrl === resume.url ? 'text-blue-500' : 'text-slate-400'}`} />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setSelectedJob(null)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button 
                type="submit" 
                form="apply-job-form"
                disabled={isApplying || resumes.length === 0 || !selectedResumeUrl}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isApplying ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CandidateJobs;
