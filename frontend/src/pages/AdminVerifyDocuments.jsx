import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../api/supabase';
import { X, CheckCircle2, XCircle, Eye, Loader2, FileText, AlertCircle, Send, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const documentTypes = [
  { id: 'signed_offer_letter', label: 'Signed Offer Letter', isRequired: true, isSpecial: true },
  { id: 'aadhaar_pan', label: 'Aadhaar Card & PAN Card', isRequired: true },
  { id: 'photo', label: 'Passport Size Photo (White Background)', isRequired: true },
  { id: 'community_certificate', label: 'Community/Residence and Nativity Certificate', isRequired: true },
  { id: 'academic_certificates', label: 'Academic Certificates (SSC, Inter, Degree & PG)', isRequired: true },
  { id: 'police_verification', label: 'Police Verification Certificate', isRequired: true },
  { id: 'family_aadhaar_pan', label: 'Family Aadhaar Card & PAN Card', isRequired: true },
  { id: 'nominee_esi', label: 'Nominee Details for ESI', isRequired: true },
  { id: 'bank_cheques', label: '5 Nationalised Bank Cheques', isRequired: true },
  { id: 'fitness_certificate', label: 'Physical Fitness Certificate', isRequired: true },
  { id: 'pf_history', label: 'PF Service History & Passbook', isRequired: false },
  { id: 'previous_offer_letters', label: 'Previous Employment Offer Letters', isRequired: false },
  { id: 'promotion_letters', label: 'Promotion Letters', isRequired: false },
  { id: 'salary_hike_letters', label: 'Salary Hike Letters', isRequired: false },
  { id: 'pay_slips', label: 'Pay Slips (Latest 3 Months) & Account Statement', isRequired: false },
  { id: 'relieving_letter', label: 'Relieving Letter', isRequired: false },
];

const AdminVerifyDocuments = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState(null);

  const stateApp = location.state?.application;

  const { data: application, isLoading: isAppLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: async () => {
      if (stateApp) return stateApp;
      const { data, error } = await supabase
        .from('applications')
        .select('*, jobs(*), users(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    initialData: stateApp
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
      const res = await api.post('/admin/send-email', {
        to: application?.users?.email,
        subject: 'All Documents Verified Successfully',
        body: `<p>Dear Candidate,</p><p>We have successfully reviewed and verified all your submitted documents. Welcome aboard!</p>`
      });
      return res.data;
    },
    onSuccess: () => toast.success('Email sent to candidate'),
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/recruitment')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verify Candidate Documents</h1>
          <p className="text-sm text-slate-500">
            {application.users?.first_name || 'Candidate'} {application.users?.last_name || ''} - {application.jobs?.title}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col xl:flex-row gap-6">
          <div className="flex-1 space-y-6 overflow-y-auto">
            {isDocsLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : (
              <div className="space-y-4">
                {documentTypes.map(docType => {
                  const doc = getDoc(docType.id);
                  return (
                    <div key={docType.id} className={`p-4 border rounded-xl ${docType.isRequired ? 'border-slate-200' : 'border-slate-100 border-dashed bg-slate-50/50'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{docType.label}</span>
                            {!docType.isRequired && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase font-bold">Optional</span>}
                          </div>
                          {doc ? (
                            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                              <FileText size={14} /> {doc.file_name}
                            </p>
                          ) : (
                            <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                              <AlertCircle size={14} /> Not uploaded yet
                            </p>
                          )}
                        </div>
                        
                        {doc && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedDoc(doc.file_path)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg" title="Preview">
                              <Eye size={16} />
                            </button>
                            {doc.status !== 'verified' && (
                              <button onClick={() => handleUpdateStatus(doc.id, 'verified')} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg" title="Approve">
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                            {doc.status !== 'rejected' && (
                              <button onClick={() => handleUpdateStatus(doc.id, 'rejected')} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg" title="Reject">
                                <XCircle size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {doc && (
                        <div className="mt-2 text-xs font-medium">
                          Status: <span className={
                            doc.status === 'verified' ? 'text-emerald-600' : 
                            doc.status === 'rejected' ? 'text-rose-600' : 'text-blue-600'
                          }>{doc.status.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="w-full xl:w-1/2 flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden min-h-[500px]">
            {selectedDoc ? (
              <iframe src={selectedDoc} className="w-full h-full flex-1" title="Document Preview" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                <FileText size={48} className="mb-4 opacity-50" />
                <p>Select a document to preview it here</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="text-sm text-slate-600">
            {allRequiredVerified ? (
              <span className="flex items-center gap-2 text-emerald-600 font-semibold"><CheckCircle2 size={18} /> All required documents verified</span>
            ) : (
              <span className="flex items-center gap-2 text-amber-600"><AlertCircle size={18} /> Pending required documents verification</span>
            )}
          </div>
          
          <button 
            onClick={() => sendEmailMutation.mutate()} 
            disabled={!allRequiredVerified || sendEmailMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {sendEmailMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Notify Candidate
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminVerifyDocuments;
