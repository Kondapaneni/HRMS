import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { X, CheckCircle2, XCircle, Eye, Loader2, FileText, AlertCircle, Send, ArrowLeft, Check, ChevronRight, Clock, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import documentVerifiedEmailTemplateHtml from "../../../backend/src/Templates/candidate_documents_verified_email.html?raw";
import { useAuth } from '../contexts/AuthContext';

const documentTypes = [
  { id: 'signed_offer_letter', label: 'Signed Offer Letter', isRequired: true, isSpecial: true },
  { id: 'aadhaar_pan', label: 'Aadhaar Card & PAN Card', isRequired: true },
  { id: 'photo', label: 'Passport Size Photo', isRequired: true },
  { id: 'community_certificate', label: 'Community & Nativity', isRequired: true },
  { id: 'academic_certificates', label: 'Academic Certificates', isRequired: true },
  { id: 'police_verification', label: 'Police Verification', isRequired: true },
  { id: 'family_aadhaar_pan', label: 'Family Aadhaar & PAN', isRequired: true },
  { id: 'nominee_esi', label: 'Nominee Details (ESI)', isRequired: true },
  { id: 'bank_cheques', label: 'Bank Cheques', isRequired: true },
  { id: 'fitness_certificate', label: 'Physical Fitness', isRequired: true },
  { id: 'pf_history', label: 'PF Service History', isRequired: false },
  { id: 'previous_offer_letters', label: 'Previous Offers', isRequired: false },
  { id: 'promotion_letters', label: 'Promotion Letters', isRequired: false },
  { id: 'salary_hike_letters', label: 'Salary Hike Letters', isRequired: false },
  { id: 'pay_slips', label: 'Pay Slips (3 Months)', isRequired: false },
  { id: 'relieving_letter', label: 'Relieving Letter', isRequired: false },
];

const AdminVerifyDocuments = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [selectedDocTypeId, setSelectedDocTypeId] = useState(null);

  const stateApp = location.state?.application;

  const { data: application, isLoading: isAppLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*, jobs(*), users(*), application_timeline(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: candidatesInfo = [] } = useQuery({
    queryKey: ['admin', 'candidates_info'],
    queryFn: async () => {
      const res = await api.get('/admin/candidates');
      return res.data.candidates || [];
    }
  });

  const { data: documents = [], isLoading: isDocsLoading } = useQuery({
    queryKey: ['admin_documents', application?.candidate_id],
    queryFn: async () => {
      if (!application?.candidate_id) return [];
      const { data, error } = await supabase
        .from('candidate_documents')
        .select('*')
        .eq('candidate_id', application.candidate_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!application?.candidate_id
  });

  // Automatically select the first uploaded document if none is selected
  useEffect(() => {
    if (!isDocsLoading && documents.length > 0 && !selectedDocTypeId) {
      // Find the first documentType that has an uploaded document
      const firstUploaded = documentTypes.find(dt => documents.some(d => d.document_type === dt.id));
      if (firstUploaded) {
        setSelectedDocTypeId(firstUploaded.id);
      }
    }
  }, [isDocsLoading, documents, selectedDocTypeId]);

  const isLoading = isAppLoading || isDocsLoading;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ docId, status }) => {
      const { error } = await supabase
        .from('candidate_documents')
        .update({ status })
        .eq('id', docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin_documents', application?.candidate_id]);
      toast.success('Document status updated');
    },
    onError: () => toast.error('Failed to update status')
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const userInfo = candidatesInfo.find(u => u.id === application?.candidate_id);
      const frontendUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const dashboardLink = frontendUrl + "/candidate/applications";
      
      const emailBody = documentVerifiedEmailTemplateHtml
        .replace(/{{firstName}}/g, userInfo?.firstName || 'Candidate')
        .replace(/{{jobTitle}}/g, application?.jobs?.title || 'the')
        .replace(/{{dashboardLink}}/g, dashboardLink)
        .replace(/{{currentYear}}/g, new Date().getFullYear().toString());

      const res = await api.post('/admin/send-email', {
        to: userInfo?.email || application?.users?.email,
        subject: 'Document Verification Successful',
        body: emailBody
      });

      // Add to timeline
      await supabase.from('application_timeline').insert({
        application_id: id,
        status_change: 'Documents Verified',
        notes: 'Sent document verification confirmation email to candidate',
        updated_by: profile?.id
      });

      return res.data;
    },
    onSuccess: () => {
      toast.success('Email sent to candidate');
      queryClient.invalidateQueries(['application', id]);
    },
    onError: () => toast.error('Failed to send email')
  });

  const handleUpdateStatus = (docId, status) => {
    updateStatusMutation.mutate({ docId, status });
  };

  const getDoc = (typeId) => documents.find(d => d.document_type === typeId);

  const allRequiredVerified = documentTypes
    .filter(d => d.isRequired)
    .every(d => getDoc(d.id)?.status === 'verified');

  if (isAppLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
  }

  if (!application) {
    return <div className="p-8 text-center text-slate-500">Application not found</div>;
  }

  const selectedDocType = documentTypes.find(dt => dt.id === selectedDocTypeId);
  const selectedDocument = selectedDocType ? getDoc(selectedDocType.id) : null;

  const userInfo = candidatesInfo.find(u => u.id === application.candidate_id);

  const hasNotified = Array.isArray(application?.application_timeline) && 
    application.application_timeline.some(t => t.status_change === 'Documents Verified');

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100dvh-8rem)] flex flex-col space-y-4">
      {/* Header Area */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/recruitment')} className="p-2 text-slate-500 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verify Candidate Documents</h1>
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2 mt-0.5">
              <span className="text-blue-600 font-semibold">{userInfo?.firstName || 'Candidate'} {userInfo?.lastName || ''}</span>
              <span className="text-slate-300">•</span>
              <span>{application.jobs?.title}</span>
            </p>
          </div>
        </div>
        <div>
          <button 
            onClick={() => sendEmailMutation.mutate()} 
            disabled={!allRequiredVerified || sendEmailMutation.isPending || hasNotified}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all ${
              hasNotified 
                ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed opacity-100' 
                : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {hasNotified ? <CheckCircle2 size={18} /> : sendEmailMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {hasNotified ? 'Candidate Notified' : 'Notify Candidate'}
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Document List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Checklist</h2>
            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {documents.filter(d => d.status === 'verified').length} Verified
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isDocsLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : (
              <div className="p-3 space-y-1">
                {documentTypes.map(docType => {
                  const doc = getDoc(docType.id);
                  const isSelected = selectedDocTypeId === docType.id;
                  
                  let statusColor = "bg-slate-100 text-slate-400";
                  let statusBorder = "border-transparent";
                  let statusIcon = null;
                  
                  if (doc) {
                    if (doc.status === 'verified') {
                      statusColor = "bg-emerald-50 text-emerald-600";
                      statusBorder = "border-emerald-200";
                      statusIcon = <CheckCircle2 size={14} className="text-emerald-500" />;
                    } else if (doc.status === 'rejected') {
                      statusColor = "bg-rose-50 text-rose-600";
                      statusBorder = "border-rose-200";
                      statusIcon = <XCircle size={14} className="text-rose-500" />;
                    } else {
                      statusColor = "bg-blue-50 text-blue-600";
                      statusBorder = "border-blue-200";
                      statusIcon = <Clock size={14} className="text-blue-500" />;
                    }
                  } else if (docType.isRequired) {
                    statusColor = "bg-amber-50 text-amber-600";
                    statusIcon = <AlertCircle size={14} className="text-amber-500" />;
                  }

                  return (
                    <button
                      key={docType.id}
                      onClick={() => setSelectedDocTypeId(docType.id)}
                      className={`w-full text-left px-3 py-3 rounded-xl transition-all border flex items-center gap-3 ${
                        isSelected 
                          ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-500/10' 
                          : 'border-transparent hover:bg-slate-100/80 hover:border-slate-200'
                      }`}
                    >
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${statusColor} ${statusBorder}`}>
                        {doc ? <FileText size={16} /> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                            {docType.label}
                          </p>
                          {statusIcon}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[11px] text-slate-500 truncate">
                            {doc ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : (docType.isRequired ? 'Required - Missing' : 'Optional')}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Content Area - Viewer & Actions */}
        <div className="flex-1 flex flex-col bg-slate-100 relative overflow-hidden">
          {selectedDocType ? (
            <>
              {/* Toolbar */}
              <div className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">{selectedDocType.label}</h3>
                  {selectedDocument && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <FileText size={12} /> {selectedDocument.file_name}
                    </p>
                  )}
                </div>
                
                {selectedDocument && (
                  <div className="flex items-center gap-3">
                    {application?.status === 'Converted to Employee' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-sm font-medium">
                        <Lock size={14} /> Read-only (Converted)
                      </span>
                    ) : (
                      <>
                        {selectedDocument.status !== 'verified' && (
                          <button 
                            onClick={() => handleUpdateStatus(selectedDocument.id, 'verified')} 
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200 rounded-lg font-medium text-sm transition-colors shadow-sm"
                          >
                            <Check size={16} />
                            Approve Document
                          </button>
                        )}
                        {selectedDocument.status !== 'rejected' && (
                          <button 
                            onClick={() => handleUpdateStatus(selectedDocument.id, 'rejected')} 
                            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border border-rose-200 rounded-lg font-medium text-sm transition-colors shadow-sm"
                          >
                            <X size={16} />
                            Reject
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Document Preview */}
              <div className="flex-1 p-6 overflow-hidden flex flex-col">
                {selectedDocument ? (
                  <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                    <iframe 
                      src={selectedDocument.file_path} 
                      className="absolute inset-0 w-full h-full" 
                      title={selectedDocType.label} 
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                    <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-6">
                      <AlertCircle size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Not Uploaded Yet</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      The candidate has not provided this {selectedDocType.isRequired ? 'required' : 'optional'} document yet. You can remind them to complete their submission.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-4">
                <FileText size={24} className="text-slate-300" />
              </div>
              <p className="text-lg font-semibold text-slate-600 mb-1">Select a document</p>
              <p className="text-sm">Choose an item from the checklist to review it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVerifyDocuments;
