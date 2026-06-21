import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Briefcase, Users, Plus, FileText, CheckCircle2, XCircle, Clock, Calendar, Mail, FileUp, X } from 'lucide-react';
import { supabase } from '../api/supabase';
import toast from 'react-hot-toast';

const AdminRecruitment = () => {
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs', 'applications'
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ['admin', 'jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    onError: () => toast.error('Failed to load jobs')
  });

  const { data: applications = [], isLoading: isLoadingApps } = useQuery({
    queryKey: ['admin', 'applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          jobs (title, department),
          users:candidate_id (email, "firstName", "lastName")
        `)
        .order('applied_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    onError: () => toast.error('Failed to load applications')
  });

  const isLoading = isLoadingJobs || isLoadingApps;

  // Job Modal State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobFormData, setJobFormData] = useState({
    title: '', department: '', location: '', type: 'Full Time', experience: '', salary_min: '', salary_max: '', vacancy: '1', skills: '', qualification: '', description: '', status: 'Draft', deadline: ''
  });
  const [jobFile, setJobFile] = useState(null);

  // View Application Modal State
  const [viewApp, setViewApp] = useState(null);
  const [viewJob, setViewJob] = useState(null);

  const [submitStatus, setSubmitStatus] = useState('Draft');

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      let description_pdf_url = null;
      if (jobFile) {
        const fileExt = jobFile.name.split('.').pop();
        const fileName = `jd-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('resumes').upload(fileName, jobFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('resumes').getPublicUrl(fileName);
        description_pdf_url = data.publicUrl;
      }

      const jobDataToInsert = { ...jobFormData, description_pdf_url, status: submitStatus };
      if (!jobDataToInsert.deadline) {
        delete jobDataToInsert.deadline;
      }

      const { error } = await supabase.from('jobs').insert([jobDataToInsert]);
      if (error) throw error;
      
      toast.success(submitStatus === 'Published' ? 'Job published successfully' : 'Draft saved successfully');
      setIsJobModalOpen(false);
      setJobFormData({ title: '', department: '', location: '', type: 'Full Time', experience: '', salary_min: '', salary_max: '', vacancy: '1', skills: '', qualification: '', description: '', status: 'Draft', deadline: '' });
      setJobFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    } catch (error) {
      console.error(error);
      toast.error('Failed to post job');
    }
  };

  const updateApplicationStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase.from('applications').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      
      // Add to timeline
      await supabase.from('application_timeline').insert([{
        application_id: id,
        status_change: newStatus,
        notes: `Application status updated to ${newStatus}`
      }]);
      
      // Queue email notification based on status
      if (viewApp?.users?.email) {
        let subject = `Update on your application for ${viewApp.jobs?.title}`;
        let bodyContent = `<p>Your application status has been updated to: <strong>${newStatus}</strong>.</p>`;
        
        if (newStatus === 'Shortlisted') {
          bodyContent = `<p>Great news! Your application for <strong>${viewApp.jobs?.title}</strong> has been shortlisted. Our recruitment team will be in touch with you shortly to schedule an interview.</p>`;
        } else if (newStatus === 'Selected') {
          bodyContent = `<p>Congratulations! We are thrilled to inform you that you have been selected for the <strong>${viewApp.jobs?.title}</strong> position. We will reach out to you soon with the next steps.</p>`;
        } else if (newStatus === 'Rejected') {
          bodyContent = `<p>Thank you for applying for the <strong>${viewApp.jobs?.title}</strong> position. After careful consideration, we have decided not to move forward with your application at this time. We wish you the best of luck in your job search.</p>`;
        }
        
        const emailBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Application Update</h2>
            <p>Hi ${viewApp.users?.firstName},</p>
            ${bodyContent}
            <p>Best regards,<br>The Acme Team</p>
          </div>
        `;
        
        await supabase.from('email_queue').insert([{
          to_email: viewApp.users.email,
          subject: subject,
          body: emailBody
        }]);
      }
      
      toast.success(`Application status updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'applications'] });
      setViewApp(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recruitment</h1>
          <p className="text-sm text-slate-500 mt-1">Manage job postings and candidate applications.</p>
        </div>
        <div>
          <button 
            onClick={() => setIsJobModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Post New Job
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`${activeTab === 'jobs' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Briefcase size={18} /> Jobs
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`${activeTab === 'applications' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Users size={18} /> Applications
          </button>
        </nav>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{activeTab === 'jobs' ? 'Job Postings' : 'Candidate Applications'}</h3>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : activeTab === 'jobs' ? (
        jobs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">No jobs posted yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <div key={job.id} onClick={() => setViewJob(job)} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-blue-300 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">{job.title}</h4>
                    <p className="text-sm text-slate-500">{job.department}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${job.status === 'Published' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {job.status}
                  </span>
                </div>
                <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5"><Briefcase size={14} className="text-slate-400" /> {job.type}</div>
                    <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> {job.location}</div>
                  </div>
                  {job.deadline && (
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <Calendar size={14} className="text-slate-400" /> Deadline: <span className="font-medium text-slate-700">{new Date(job.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        applications.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">No applications received yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => (
              <div key={app.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">{app.users?.firstName} {app.users?.lastName}</h4>
                    <p className="text-sm text-slate-500">{app.users?.email}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 border-blue-200">
                    {app.status}
                  </span>
                </div>
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-700">Applied for: {app.jobs?.title}</p>
                  <p className="text-xs text-slate-500">{app.jobs?.department}</p>
                </div>
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /> {new Date(app.applied_date).toLocaleDateString()}</span>
                  <button onClick={() => setViewApp(app)} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">Review</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* View Job Modal */}
      {viewJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800">Job Details</h2>
              <button onClick={() => setViewJob(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{viewJob.title}</h3>
                  <p className="text-slate-600 mt-1">{viewJob.department}</p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${viewJob.status === 'Published' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {viewJob.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Type</p>
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5"><Briefcase size={14} className="text-blue-500" /> {viewJob.type}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Location</p>
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> {viewJob.location}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 sm:col-span-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Application Deadline</p>
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-500" /> 
                    {viewJob.deadline ? new Date(viewJob.deadline).toLocaleDateString() : 'No Deadline specified'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Description</h4>
                <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap">
                  {viewJob.description || 'No description provided.'}
                </div>
              </div>

              {viewJob.description_pdf_url && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">Attached Document</h4>
                  <a href={viewJob.description_pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg font-medium text-sm transition-colors border border-blue-100">
                    <FileText size={16} /> View Job Description PDF
                  </a>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setViewJob(null)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Application Modal */}
      {viewApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800">Review Application</h2>
              <button onClick={() => setViewApp(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Candidate</p>
                  <p className="font-bold text-slate-900">{viewApp.users?.firstName} {viewApp.users?.lastName}</p>
                  <p className="text-sm text-slate-600">{viewApp.users?.email}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Job Details</p>
                  <p className="font-bold text-slate-900">{viewApp.jobs?.title}</p>
                  <p className="text-sm text-slate-600">{viewApp.jobs?.department}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-slate-800 mb-2">Resume</h4>
                {viewApp.resume_url ? (
                  <a href={viewApp.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg font-medium text-sm">
                    <FileText size={16} /> View Candidate Resume
                  </a>
                ) : (
                  <p className="text-slate-500 text-sm italic">No resume attached.</p>
                )}
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h4 className="font-semibold text-slate-800 mb-4">Quick Actions</h4>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => updateApplicationStatus(viewApp.id, 'Under Review')} className="bg-amber-100 text-amber-800 hover:bg-amber-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer">Mark Under Review</button>
                  <button onClick={() => updateApplicationStatus(viewApp.id, 'Shortlisted')} className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer">Shortlist</button>
                  <button onClick={() => updateApplicationStatus(viewApp.id, 'Selected')} className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer">Select Candidate</button>
                  <button onClick={() => updateApplicationStatus(viewApp.id, 'Rejected')} className="bg-rose-100 text-rose-800 hover:bg-rose-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer">Reject</button>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setViewApp(null)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Job Modal */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Post New Job</h2>
                <p className="text-sm text-slate-500 mt-1">Create a draft or publish a role directly to the candidate portal.</p>
              </div>
              <button onClick={() => setIsJobModalOpen(false)} className="p-2 border border-orange-400 rounded-md text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="post-job-form" onSubmit={handleCreateJob} className="space-y-5">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                    <input type="text" required value={jobFormData.title} onChange={e => setJobFormData({...jobFormData, title: e.target.value})} className="w-full px-3 py-2 border border-orange-400 rounded-md text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                    <input type="text" required value={jobFormData.department} onChange={e => setJobFormData({...jobFormData, department: e.target.value})} className="w-full px-3 py-2 border border-orange-400 rounded-md text-sm outline-none" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                    <input type="text" required value={jobFormData.location} onChange={e => setJobFormData({...jobFormData, location: e.target.value})} className="w-full px-3 py-2 border border-orange-400 rounded-md text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Job Type</label>
                    <select required value={jobFormData.type} onChange={e => setJobFormData({...jobFormData, type: e.target.value})} className="w-full px-3 py-2 border border-orange-400 rounded-md text-sm outline-none bg-white cursor-pointer">
                      <option>Full Time</option>
                      <option>Part Time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Experience</label>
                    <input type="text" required value={jobFormData.experience} onChange={e => setJobFormData({...jobFormData, experience: e.target.value})} className="w-full px-3 py-2 border border-orange-400 rounded-md text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Salary Min</label>
                    <input type="text" required value={jobFormData.salary_min} onChange={e => setJobFormData({...jobFormData, salary_min: e.target.value})} className="w-full px-3 py-2 border border-orange-400 rounded-md text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Salary Max</label>
                    <input type="text" required value={jobFormData.salary_max} onChange={e => setJobFormData({...jobFormData, salary_max: e.target.value})} className="w-full px-3 py-2 border border-orange-400 rounded-md text-sm outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vacancy</label>
                    <input type="number" required value={jobFormData.vacancy} onChange={e => setJobFormData({...jobFormData, vacancy: e.target.value})} className="w-full px-3 py-2 border border-orange-400 rounded-md text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Date</label>
                    <input type="date" required value={jobFormData.deadline} onChange={e => setJobFormData({...jobFormData, deadline: e.target.value})} className="w-full px-3 py-2 border border-orange-400 rounded-md text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Attachment</label>
                    <input type="file" accept="application/pdf" onChange={e => setJobFile(e.target.files[0])} className="w-full px-3 py-1.5 border border-orange-400 rounded-md text-sm outline-none file:mr-4 file:py-1 file:px-3 file:rounded file:border file:border-slate-300 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Skills</label>
                  <textarea rows={3} required value={jobFormData.skills} onChange={e => setJobFormData({...jobFormData, skills: e.target.value})} className="w-full px-3 py-2 border border-orange-400 rounded-md text-sm outline-none resize-y" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Qualification</label>
                  <textarea rows={3} required value={jobFormData.qualification} onChange={e => setJobFormData({...jobFormData, qualification: e.target.value})} className="w-full px-3 py-2 border border-orange-400 rounded-md text-sm outline-none resize-y" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea rows={4} required value={jobFormData.description} onChange={e => setJobFormData({...jobFormData, description: e.target.value})} className="w-full px-3 py-2 border border-orange-400 rounded-md text-sm outline-none resize-y" />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 flex justify-end gap-4 mt-2">
              <button type="button" onClick={() => setIsJobModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-orange-400 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="post-job-form" onClick={() => setSubmitStatus('Draft')} className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-orange-400 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
                Save Draft
              </button>
              <button type="submit" form="post-job-form" onClick={() => setSubmitStatus('Published')} className="px-6 py-2.5 text-sm font-medium text-white bg-teal-400 rounded-md hover:bg-teal-500 transition-colors cursor-pointer">
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminRecruitment;
