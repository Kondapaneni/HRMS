import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Users, Plus, FileText, CheckCircle2, XCircle, Clock, Calendar, Mail, FileUp } from 'lucide-react';
import { supabase } from '../api/supabase';
import toast from 'react-hot-toast';

const AdminRecruitment = () => {
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs', 'applications'
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Job Modal State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobFormData, setJobFormData] = useState({
    title: '', department: 'Engineering', location: 'Remote', type: 'Full-time', description: '', status: 'Draft'
  });
  const [jobFile, setJobFile] = useState(null);

  // View Application Modal State
  const [viewApp, setViewApp] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // Fetch Applications with Joins (Job Title & Candidate Details)
      // Since we don't have views set up, we'll fetch them separately or use a join if foreign keys are standard
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          jobs (title, department),
          users:candidate_id (email, "firstName", "lastName")
        `)
        .order('applied_date', { ascending: false });
      
      if (appsError) throw appsError;
      setApplications(appsData || []);

    } catch (error) {
      console.error(error);
      toast.error('Failed to load recruitment data');
    } finally {
      setIsLoading(false);
    }
  };

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

      const { error } = await supabase.from('jobs').insert([{ ...jobFormData, description_pdf_url }]);
      if (error) throw error;
      
      toast.success('Job posted successfully');
      setIsJobModalOpen(false);
      setJobFormData({ title: '', department: 'Engineering', location: 'Remote', type: 'Full-time', description: '', status: 'Draft' });
      setJobFile(null);
      fetchData();
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
      fetchData();
      setViewApp(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recruitment</h1>
          <p className="text-sm text-slate-500 mt-1">Manage job postings and candidate applications.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <button 
            onClick={() => setIsJobModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm"
          >
            <Plus size={16} /> Post New Job
          </button>
        </motion.div>
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

      {isLoading ? (
        <div className="text-center py-12 text-slate-500 animate-pulse">Loading data...</div>
      ) : activeTab === 'jobs' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Title</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type / Location</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{job.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">{job.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">{job.type} &bull; {job.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${job.status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                      {job.status}
                    </span>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-slate-500">No jobs posted yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Job</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Applied On</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{app.users?.firstName} {app.users?.lastName}</div>
                    <div className="text-sm text-slate-500">{app.users?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{app.jobs?.title}</div>
                    <div className="text-sm text-slate-500">{app.jobs?.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                    {new Date(app.applied_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => setViewApp(app)} className="text-blue-600 hover:text-blue-900">Review</button>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-500">No applications received yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View Application Modal */}
      {viewApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setViewApp(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-xl leading-6 font-bold text-slate-900 mb-4" id="modal-title">Review Application</h3>
                    
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
                        <button onClick={() => updateApplicationStatus(viewApp.id, 'Under Review')} className="bg-amber-100 text-amber-800 hover:bg-amber-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors">Mark Under Review</button>
                        <button onClick={() => updateApplicationStatus(viewApp.id, 'Shortlisted')} className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors">Shortlist</button>
                        <button onClick={() => updateApplicationStatus(viewApp.id, 'Selected')} className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors">Select Candidate</button>
                        <button onClick={() => updateApplicationStatus(viewApp.id, 'Rejected')} className="bg-rose-100 text-rose-800 hover:bg-rose-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors">Reject</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200">
                <button type="button" onClick={() => setViewApp(null)} className="mt-3 w-full inline-flex justify-center rounded-xl border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Job Modal */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsJobModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleCreateJob}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-xl leading-6 font-bold text-slate-900 mb-6">Post New Job</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                      <input type="text" required value={jobFormData.title} onChange={e => setJobFormData({...jobFormData, title: e.target.value})} className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2 border" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                        <select value={jobFormData.department} onChange={e => setJobFormData({...jobFormData, department: e.target.value})} className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2 border">
                          <option>Engineering</option>
                          <option>Product</option>
                          <option>Design</option>
                          <option>Human Resources</option>
                          <option>Marketing</option>
                          <option>Sales</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                        <select value={jobFormData.type} onChange={e => setJobFormData({...jobFormData, type: e.target.value})} className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2 border">
                          <option>Full-time</option>
                          <option>Part-time</option>
                          <option>Contract</option>
                          <option>Internship</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                      <input type="text" value={jobFormData.location} onChange={e => setJobFormData({...jobFormData, location: e.target.value})} className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2 border" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description (Short)</label>
                      <textarea rows={3} value={jobFormData.description} onChange={e => setJobFormData({...jobFormData, description: e.target.value})} className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2 border" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Detailed Job Description (PDF)</label>
                      <input type="file" accept="application/pdf" onChange={e => setJobFile(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                      <select value={jobFormData.status} onChange={e => setJobFormData({...jobFormData, status: e.target.value})} className="w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2 border">
                        <option>Draft</option>
                        <option>Published</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200">
                  <button type="submit" className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-6 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                    Post Job
                  </button>
                  <button type="button" onClick={() => setIsJobModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-xl border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminRecruitment;
