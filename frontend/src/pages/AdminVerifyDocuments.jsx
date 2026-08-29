import React, { useState, useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Loader2, 
  FileText, 
  AlertCircle, 
  Send, 
  ArrowLeft, 
  Clock, 
  Lock,
  Building2,
  User,
  ShieldCheck,
  Award,
  Sparkles,
  ExternalLink,
  Check,
  Search,
  Filter,
  FileCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import documentVerifiedEmailTemplateHtml from "../../../backend/src/Templates/candidate_documents_verified_email.html?raw";
import { useAuth } from '../contexts/AuthContext';

const documentTypes = [
  { id: 'signed_offer_letter', label: 'Signed Offer Letter', isRequired: true, isSpecial: true, category: 'Offer & Contract' },
  { id: 'aadhaar_pan', label: 'Aadhaar Card & PAN Card', isRequired: true, category: 'Identity & Legal' },
  { id: 'photo', label: 'Passport Size Photo', isRequired: true, category: 'Identity & Legal' },
  { id: 'community_certificate', label: 'Community & Nativity', isRequired: true, category: 'Identity & Legal' },
  { id: 'academic_certificates', label: 'Academic Certificates', isRequired: true, category: 'Academic' },
  { id: 'police_verification', label: 'Police Verification', isRequired: true, category: 'Compliance' },
  { id: 'family_aadhaar_pan', label: 'Family Aadhaar & PAN', isRequired: true, category: 'Identity & Legal' },
  { id: 'nominee_esi', label: 'Nominee Details (ESI)', isRequired: true, category: 'Compliance' },
  { id: 'bank_cheques', label: 'Bank Cheques (Cancelled)', isRequired: true, category: 'Banking' },
  { id: 'fitness_certificate', label: 'Physical Fitness Certificate', isRequired: true, category: 'Medical' },
  { id: 'pf_history', label: 'PF Service History', isRequired: false, category: 'Past Employment' },
  { id: 'previous_offer_letters', label: 'Previous Offers', isRequired: false, category: 'Past Employment' },
  { id: 'promotion_letters', label: 'Promotion Letters', isRequired: false, category: 'Past Employment' },
  { id: 'salary_hike_letters', label: 'Salary Hike Letters', isRequired: false, category: 'Past Employment' },
  { id: 'pay_slips', label: 'Pay Slips (3 Months)', isRequired: false, category: 'Past Employment' },
  { id: 'relieving_letter', label: 'Relieving Letter', isRequired: false, category: 'Past Employment' },
];

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const AdminDocumentCard = ({ docType, currentDoc, onUpdateStatus, isUpdating, isConverted }) => {
  const getStatusBadge = () => {
    if (!currentDoc) {
      if (docType.isRequired) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fef7e0] text-[#b06000] border border-[#feefc3] whitespace-nowrap shrink-0">
            <AlertCircle className="w-3 h-3 shrink-0" /> Mandatory
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] whitespace-nowrap shrink-0">
          Optional
        </span>
      );
    }
    
    switch (currentDoc.status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#137333] border border-[#ceead6] whitespace-nowrap shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] whitespace-nowrap shrink-0">
            <XCircle className="w-3.5 h-3.5 shrink-0" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] whitespace-nowrap shrink-0">
            <Clock className="w-3.5 h-3.5 shrink-0" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between space-y-4 hover:shadow-md ${
      docType.isSpecial 
        ? 'border-[#4285F4] bg-gradient-to-br from-white to-[#f8fafd] ring-1 ring-[#4285F4]/20' 
        : 'border-[#e0e3e7]'
    } ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}>
      
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider block mb-1">
              {docType.category}
            </span>
            <h3 className={`text-sm font-semibold ${docType.isSpecial ? 'text-[#1a73e8]' : 'text-[#1f1f1f]'}`}>
              {docType.label}
            </h3>
          </div>
          {getStatusBadge()}
        </div>

        {currentDoc ? (
          <div className="bg-[#f8fafd] rounded-xl border border-[#e0e3e7] p-3 space-y-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 bg-[#e8f0fe] text-[#1a73e8] rounded-lg flex items-center justify-center shrink-0 border border-[#d2e3fc]">
                <FileText className="w-4 h-4" />
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-semibold text-[#1f1f1f] truncate">{currentDoc.file_name}</p>
                <p className="text-[11px] text-[#5f6368]">Uploaded {new Date(currentDoc.uploaded_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-[#dadce0] rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[#f8fafd]">
            <FileText className="w-8 h-8 text-[#dadce0] mb-1" />
            <p className="text-xs font-medium text-[#5f6368]">Not uploaded yet</p>
          </div>
        )}
      </div>

      {currentDoc && (
        <div className="flex items-center gap-2 pt-2 border-t border-[#e0e3e7]">
          <a 
            href={currentDoc.file_path} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 inline-flex justify-center items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1f1f1f] hover:bg-[#f1f3f4] bg-white border border-[#dadce0] rounded-full transition-all whitespace-nowrap shrink-0"
          >
            <Eye className="w-3.5 h-3.5 text-[#5f6368] shrink-0" />
            <span>View Document</span>
          </a>
          
          {isConverted ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5f6368] bg-[#f1f3f4] border border-[#dadce0] px-3 py-1.5 rounded-full whitespace-nowrap shrink-0" title="Candidate is converted to an employee. Document status is locked.">
              <Lock className="w-3 h-3 text-[#5f6368] shrink-0" />
              <span>Locked</span>
            </span>
          ) : (
            <>
              {currentDoc.status !== 'verified' && (
                <button 
                  onClick={() => onUpdateStatus(currentDoc.id, 'verified')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#137333] hover:bg-[#0d5926] rounded-full transition-all cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                  title="Verify Document"
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Approve</span>
                </button>
              )}
              
              {currentDoc.status !== 'rejected' && (
                <button 
                  onClick={() => onUpdateStatus(currentDoc.id, 'rejected')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#c5221f] bg-[#fce8e6] hover:bg-[#fad2cf] border border-[#fad2cf] rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0"
                  title="Reject Document"
                >
                  <X className="w-3.5 h-3.5 shrink-0" />
                  <span>Reject</span>
                </button>
              )}
            </>
          )}
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
  const [filterTab, setFilterTab] = useState('All'); // 'All', 'Required', 'Optional', 'Pending'

  const { data: application, isLoading: isAppLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: async () => {
      const res = await api.get(`/admin/applications/${id}`);
      return res.data?.application || null;
    }
  });

  const isConverted = application?.status === 'Converted to Employee';

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
      const res = await api.get(`/admin/candidate-documents?candidate_id=${application.candidate_id}`);
      return res.data?.documents || [];
    },
    enabled: !!application?.candidate_id
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ docId, status }) => {
      if (isConverted) {
        throw new Error('Candidate has already been converted to an employee. Document statuses are locked.');
      }
      const res = await api.put(`/admin/candidate-documents/${docId}/status`, { status });
      return res.data;
    },
    onMutate: ({ docId }) => {
      setUpdatingDocId(docId);
    },
    onSettled: () => {
      setUpdatingDocId(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_documents', application?.candidate_id] });
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      toast.success('Document status updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Failed to update status')
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const userInfo = candidatesInfo.find(u => u.id === application?.candidate_id);
      const frontendUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const dashboardLink = frontendUrl + "/candidate/applications";
      
      const emailBody = documentVerifiedEmailTemplateHtml
        .replace(/{{firstName}}/g, userInfo?.firstName || application?.users?.firstName || 'Candidate')
        .replace(/{{jobTitle}}/g, application?.jobs?.title || 'the')
        .replace(/{{dashboardLink}}/g, dashboardLink)
        .replace(/{{currentYear}}/g, new Date().getFullYear().toString());

      const res = await api.post('/admin/send-email', {
        to: userInfo?.email || application?.users?.email,
        subject: 'Document Verification Successful',
        body: emailBody
      });

      // Add to timeline
      await api.post(`/admin/applications/${id}/timeline`, {
        status_change: 'Documents Verified',
        notes: 'Sent document verification confirmation email to candidate'
      });

      return res.data;
    },
    onSuccess: () => {
      toast.success('Confirmation email sent to candidate');
      queryClient.invalidateQueries({ queryKey: ['application', id] });
    },
    onError: () => toast.error('Failed to send email')
  });

  const handleUpdateStatus = (docId, status) => {
    if (isConverted) {
      toast.error('Cannot update status: Candidate is already converted to an active employee.');
      return;
    }
    updateStatusMutation.mutate({ docId, status });
  };

  const getDoc = (typeId) => documents.find(d => d.document_type === typeId);

  const getInitials = (firstName, lastName) => {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase() || 'CA';
  };

  const userInfo = candidatesInfo.find(u => u.id === application?.candidate_id);

  // Statistics calculation
  const totalRequired = documentTypes.filter(d => d.isRequired).length;
  const verifiedCount = documents.filter(d => d.status === 'verified').length;
  const pendingCount = documents.filter(d => d.status === 'pending' || !d.status).length;
  const missingCount = documentTypes.length - documents.length;

  const allRequiredVerified = documentTypes
    .filter(d => d.isRequired)
    .every(d => getDoc(d.id)?.status === 'verified');

  const hasNotified = Array.isArray(application?.application_timeline) && 
    application.application_timeline.some(t => t.status_change === 'Documents Verified');

  const filteredDocs = useMemo(() => {
    return documentTypes.filter(doc => {
      const current = getDoc(doc.id);
      if (filterTab === 'Required') return doc.isRequired;
      if (filterTab === 'Optional') return !doc.isRequired;
      if (filterTab === 'Pending') return current && current.status !== 'verified' && current.status !== 'rejected';
      return true;
    });
  }, [filterTab, documents]);

  if (isAppLoading || isDocsLoading) return <PageLoader message="Loading Documents..." />;

  if (!application) {
    return (
      <div className="p-12 text-center text-[#5f6368] space-y-3">
        <p className="text-base font-semibold text-[#1f1f1f]">Application record not found</p>
        <button 
          onClick={() => navigate('/admin/recruitment')} 
          className="px-4 py-2 bg-[#1a73e8] text-white rounded-full text-xs font-semibold"
        >
          Return to Recruitment
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Onboarding Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
            Verify Candidate Documents
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Audit compliance certificates, identity papers, bank accounts, and offer letters.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {isConverted ? (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]">
              <Lock className="w-3.5 h-3.5 text-[#5f6368]" /> Onboarding Finalized
            </div>
          ) : (
            <button 
              onClick={() => sendEmailMutation.mutate()} 
              disabled={!allRequiredVerified || sendEmailMutation.isPending || hasNotified}
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                hasNotified 
                  ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6] cursor-default' 
                  : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {hasNotified ? <CheckCircle2 className="w-4 h-4" /> : sendEmailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {hasNotified ? 'Candidate Notified' : 'Notify Candidate Verified'}
            </button>
          )}
          
          <button 
            onClick={() => navigate('/admin/recruitment')} 
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#5f6368]" /> Back
          </button>
        </div>
      </div>

      {/* Converted Employee Locked Notice Banner */}
      {isConverted && (
        <div className="rounded-2xl border border-[#c2e7ff] bg-[#e8f0fe] p-4 flex items-start gap-3.5 text-[#001d35] shadow-xs">
          <div className="p-2 rounded-xl bg-[#c2e7ff] text-[#001d35] shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a73e8]">
              Candidate Converted to Active Employee • Verification Locked
            </h4>
            <p className="text-xs text-[#001d35] mt-0.5 leading-relaxed">
              This candidate has been formally hired and converted to an active employee in Acme HRMS. To guarantee legal compliance and audit integrity, document approval statuses can no longer be modified.
            </p>
          </div>
        </div>
      )}

      {/* Candidate Overview Card */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8] font-bold text-sm shrink-0">
            {getInitials(userInfo?.firstName, userInfo?.lastName)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-[#1f1f1f]">
                {userInfo?.firstName || 'Candidate'} {userInfo?.lastName || ''}
              </h2>
              {application.jobs?.title && (
                <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">
                  {application.jobs?.title}
                </span>
              )}
            </div>
            <p className="text-xs text-[#5f6368] mt-0.5">
              {userInfo?.email} • {application.jobs?.department}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-[#e0e3e7] pt-3 md:pt-0 md:pl-6 text-xs">
          <div>
            <span className="text-[#5f6368] block">Compliance Status</span>
            <span className={`font-semibold ${isConverted ? 'text-[#137333]' : allRequiredVerified ? 'text-[#137333]' : 'text-[#b06000]'}`}>
              {isConverted ? 'Finalized & Locked' : allRequiredVerified ? 'All Mandatory Verified' : 'Pending Verification'}
            </span>
          </div>
          <div>
            <span className="text-[#5f6368] block">Uploaded Documents</span>
            <span className="font-semibold text-[#1f1f1f]">{documents.length} of {documentTypes.length}</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Mandatory Required" 
          value={totalRequired} 
          subtitle="Essential compliance items" 
          icon={AlertCircle} 
          colorTheme="amber" 
        />
        <StatCard 
          title="Verified Documents" 
          value={verifiedCount} 
          subtitle="Approved by HR admin" 
          icon={CheckCircle2} 
          colorTheme="green" 
        />
        <StatCard 
          title="Pending Review" 
          value={pendingCount} 
          subtitle="Awaiting administrative check" 
          icon={Clock} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Not Uploaded Yet" 
          value={missingCount} 
          subtitle="Awaiting candidate upload" 
          icon={FileText} 
          colorTheme="purple" 
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e0e3e7] pb-1">
        {['All', 'Required', 'Optional', 'Pending'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
              filterTab === tab
                ? 'text-[#1a73e8] border-b-2 border-[#1a73e8] bg-[#e8f0fe]/50'
                : 'text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4]'
            }`}
          >
            {tab} Documents {tab === 'All' ? `(${documentTypes.length})` : tab === 'Required' ? `(${totalRequired})` : tab === 'Pending' ? `(${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {/* Documents Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDocs.map(doc => (
          <AdminDocumentCard 
            key={doc.id}
            docType={doc} 
            currentDoc={getDoc(doc.id)} 
            onUpdateStatus={handleUpdateStatus}
            isUpdating={updatingDocId === getDoc(doc.id)?.id}
            isConverted={isConverted}
          />
        ))}
      </div>
    </div>
  );
};

export default AdminVerifyDocuments;
