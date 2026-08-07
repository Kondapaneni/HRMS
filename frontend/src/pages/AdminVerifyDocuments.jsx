import React from 'react';
import PageLoader from '../components/PageLoader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { X, CheckCircle2, XCircle, Eye, Loader2, FileText, AlertCircle, Send, ArrowLeft, Clock, Lock } from 'lucide-react';
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

const AdminDocumentCard = ({ docType, currentDoc, onUpdateStatus, isUpdating }) => {
  const getStatusBadge = () => {
    if (!currentDoc) {
      if (docType.isRequired) {
        return <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-600 rounded-lg flex items-center gap-1"><AlertCircle size={12} /> Required</span>;
      }
      return <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 rounded-lg">Optional</span>;
    }
    
    switch (currentDoc.status) {
      case 'verified':
        return <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-600 rounded-lg flex items-center gap-1"><CheckCircle2 size={12} /> Verified</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-600 rounded-lg flex items-center gap-1"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-600 rounded-lg flex items-center gap-1"><Clock size={12} /> Pending Review</span>;
    }
  };

  return (
    <div className={`border rounded-2xl p-4 transition-all duration-300 bg-white ${docType.isSpecial ? 'border-blue-200 shadow-blue-100 shadow-lg' : 'border-slate-200 shadow-sm'} ${isUpdating ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className={`font-semibold ${docType.isSpecial ? 'text-blue-700 text-lg' : 'text-slate-800'}`}>
            {docType.label}
          </h3>
          {docType.description && <p className="text-xs text-slate-500 mt-1">{docType.description}</p>}
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {currentDoc ? (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex flex-col gap-3 mt-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div className="truncate">
              <p className="text-sm font-medium text-slate-700 truncate">{currentDoc.file_name}</p>
              <p className="text-xs text-slate-500">Uploaded {new Date(currentDoc.uploaded_at).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2 border-t border-slate-200 pt-3">
            <a 
              href={currentDoc.file_path} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 flex justify-center items-center gap-2 p-2 text-sm font-medium text-blue-600 hover:bg-blue-50 bg-white border border-blue-200 rounded-lg transition-colors"
            >
              <Eye size={16} /> View
            </a>
            
            {currentDoc.status !== 'verified' && (
              <button 
                onClick={() => onUpdateStatus(currentDoc.id, 'verified')}
                className="p-2 text-emerald-600 hover:bg-emerald-50 bg-white border border-emerald-200 rounded-lg transition-colors"
                title="Verify Document"
              >
                <CheckCircle2 size={18} />
              </button>
            )}
            
            {currentDoc.status !== 'rejected' && (
              <button 
                onClick={() => onUpdateStatus(currentDoc.id, 'rejected')}
                className="p-2 text-rose-600 hover:bg-rose-50 bg-white border border-rose-200 rounded-lg transition-colors"
                title="Reject Document"
              >
                <XCircle size={18} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`mt-4 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 border-slate-200`}>
          <div className="w-12 h-12 bg-white shadow-sm rounded-full flex items-center justify-center text-slate-400 mb-3">
            <FileText size={24} />
          </div>
          <p className="text-sm font-medium text-slate-500">
            Not uploaded yet
          </p>
        </div>
      )}
    </div>
  );
};

const AdminVerifyDocuments = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  const [updatingDocId, setUpdatingDocId] = React.useState(null);

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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ docId, status }) => {
      const { error } = await supabase
        .from('candidate_documents')
        .update({ status })
        .eq('id', docId);
      if (error) throw error;
    },
    onMutate: ({ docId }) => {
      setUpdatingDocId(docId);
    },
    onSettled: () => {
      setUpdatingDocId(null);
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

  if (isAppLoading || isDocsLoading) return <PageLoader message="Loading Documents..." />;

  if (!application) {
    return <div className="p-8 text-center text-slate-500">Application not found</div>;
  }

  const userInfo = candidatesInfo.find(u => u.id === application.candidate_id);

  const hasNotified = Array.isArray(application?.application_timeline) && 
    application.application_timeline.some(t => t.status_change === 'Documents Verified');

  const specialDoc = documentTypes.find(d => d.isSpecial);
  const requiredDocs = documentTypes.filter(d => d.isRequired && !d.isSpecial);
  const optionalDocs = documentTypes.filter(d => !d.isRequired);

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Verify Candidate Documents</h1>
            <p className="text-sm md:text-base font-medium text-slate-500 flex items-center gap-2 mt-1">
              <span className="text-blue-600 font-semibold">{userInfo?.firstName || 'Candidate'} {userInfo?.lastName || ''}</span>
              <span className="text-slate-300">•</span>
              <span>{application.jobs?.title}</span>
            </p>
          </div>
        </div>
        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => sendEmailMutation.mutate()} 
            disabled={!allRequiredVerified || sendEmailMutation.isPending || hasNotified}
            className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium shadow-sm transition-all ${
              hasNotified 
                ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed opacity-100' 
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {hasNotified ? <CheckCircle2 size={18} /> : sendEmailMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {hasNotified ? 'Candidate Notified' : 'Notify Candidate'}
          </button>
          <button 
            onClick={() => navigate('/admin/recruitment')} 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft size={18} />
            Back to Recruitment
          </button>
        </div>
      </div>

      <div className="space-y-10 pb-12">
        {/* Special Offer Letter Section */}
        {specialDoc && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold text-slate-800">Offer Letter Acceptance</h2>
            </div>
            <div className="max-w-md">
              <AdminDocumentCard 
                docType={specialDoc} 
                currentDoc={getDoc(specialDoc.id)} 
                onUpdateStatus={handleUpdateStatus}
                isUpdating={updatingDocId === getDoc(specialDoc.id)?.id}
              />
            </div>
          </section>
        )}

        {/* Required Documents Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-amber-500" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Required Documents</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {requiredDocs.map(doc => (
              <AdminDocumentCard 
                key={doc.id}
                docType={doc} 
                currentDoc={getDoc(doc.id)} 
                onUpdateStatus={handleUpdateStatus}
                isUpdating={updatingDocId === getDoc(doc.id)?.id}
              />
            ))}
          </div>
        </section>

        {/* Optional Documents Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-slate-400" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Optional Documents</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {optionalDocs.map(doc => (
              <AdminDocumentCard 
                key={doc.id}
                docType={doc} 
                currentDoc={getDoc(doc.id)} 
                onUpdateStatus={handleUpdateStatus}
                isUpdating={updatingDocId === getDoc(doc.id)?.id}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminVerifyDocuments;
