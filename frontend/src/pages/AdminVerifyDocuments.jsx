import React, { useState, useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useParams, useNavigate } from 'react-router-dom';
import documentVerifiedEmailTemplateHtml from '../../../backend/src/Templates/candidate_documents_verified_email.html?raw';
import { useAuth } from '../contexts/AuthContext';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';

const documentTypes = [
  { id: 'signed_offer_letter', label: 'Signed offer letter', isRequired: true, isSpecial: true, category: 'Offer & Contract' },
  { id: 'aadhaar_pan', label: 'Aadhaar card & PAN card', isRequired: true, category: 'Identity & Legal' },
  { id: 'photo', label: 'Passport size photo', isRequired: true, category: 'Identity & Legal' },
  { id: 'community_certificate', label: 'Community & nativity', isRequired: true, category: 'Identity & Legal' },
  { id: 'academic_certificates', label: 'Academic certificates', isRequired: true, category: 'Academic' },
  { id: 'police_verification', label: 'Police verification', isRequired: true, category: 'Compliance' },
  { id: 'family_aadhaar_pan', label: 'Family Aadhaar & PAN', isRequired: true, category: 'Identity & Legal' },
  { id: 'nominee_esi', label: 'Nominee details (ESI)', isRequired: true, category: 'Compliance' },
  { id: 'bank_cheques', label: 'Bank cheques (Cancelled)', isRequired: true, category: 'Banking' },
  { id: 'fitness_certificate', label: 'Physical fitness certificate', isRequired: true, category: 'Medical' },
  { id: 'pf_history', label: 'PF service history', isRequired: false, category: 'Past Employment' },
  { id: 'previous_offer_letters', label: 'Previous offers', isRequired: false, category: 'Past Employment' },
  { id: 'promotion_letters', label: 'Promotion letters', isRequired: false, category: 'Past Employment' },
  { id: 'salary_hike_letters', label: 'Salary hike letters', isRequired: false, category: 'Past Employment' },
  { id: 'pay_slips', label: 'Pay slips (3 months)', isRequired: false, category: 'Past Employment' },
  { id: 'relieving_letter', label: 'Relieving letter', isRequired: false, category: 'Past Employment' },
];

const AdminDocumentCard = ({ docType, currentDoc, onUpdateStatus, isUpdating, isConverted }) => {
  const renderBadge = () => {
    if (!currentDoc) {
      if (docType.isRequired) {
        return <StatusBadge status="Warning">Mandatory</StatusBadge>;
      }
      return <StatusBadge status="Neutral">Optional</StatusBadge>;
    }

    switch (currentDoc.status) {
      case 'verified':
        return <StatusBadge status="Success">Verified</StatusBadge>;
      case 'rejected':
        return <StatusBadge status="Danger">Rejected</StatusBadge>;
      default:
        return <StatusBadge status="Info">Pending review</StatusBadge>;
    }
  };

  return (
    <div
      className={`bg-[var(--surface)] rounded-[20px] border transition-all p-4 flex flex-col justify-between space-y-3.5 ${
        docType.isSpecial
          ? 'border-[var(--brand)] bg-gradient-to-br from-[var(--surface)] to-[var(--brand-tint)]/20'
          : 'border-[var(--line)]'
      } ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] text-[var(--muted)] block mb-0.5">
              {docType.category}
            </span>
            <h3
              className={`text-xs font-medium ${
                docType.isSpecial ? 'text-[var(--brand-deep)]' : 'text-[var(--text)]'
              }`}
            >
              {docType.label}
            </h3>
          </div>
          {renderBadge()}
        </div>

        {currentDoc ? (
          <div className="bg-[var(--surface-alt)] rounded-[12px] p-2.5 space-y-1.5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 bg-[var(--surface)] text-[var(--brand-deep)] rounded-[8px] flex items-center justify-center shrink-0">
                <FileText size={14} />
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-medium text-[var(--text)] truncate">{currentDoc.file_name}</p>
                <p className="text-[10px] text-[var(--muted)]">
                  Uploaded {new Date(currentDoc.uploaded_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-[var(--line)] rounded-[12px] p-5 flex flex-col items-center justify-center text-center bg-[var(--surface-alt)]">
            <FileText size={20} className="text-[var(--muted)] opacity-40 mb-1" />
            <p className="text-xs text-[var(--muted)]">Not uploaded yet</p>
          </div>
        )}
      </div>

      {currentDoc && (
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--line)]">
          <a
            href={currentDoc.file_path}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-alt)] bg-[var(--surface)] border border-[var(--line)] rounded-full transition-all whitespace-nowrap shrink-0"
          >
            <Eye size={13} className="text-[var(--muted)]" />
            <span>View</span>
          </a>

          <div className="flex items-center gap-1.5 shrink-0">
            {isConverted ? (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--muted)] bg-[var(--surface-alt)] px-2.5 py-1 rounded-full whitespace-nowrap"
                title="Candidate is converted to an employee. Document status is locked."
              >
                <Lock size={12} />
                <span>Locked</span>
              </span>
            ) : (
              <>
                {currentDoc.status !== 'verified' && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(currentDoc.id, 'verified')}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-[#1F9D55] hover:bg-[#188038] rounded-full transition-all cursor-pointer whitespace-nowrap"
                    title="Approve Document"
                  >
                    <Check size={13} />
                    <span>Approve</span>
                  </button>
                )}

                {currentDoc.status !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(currentDoc.id, 'rejected')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#D64550] bg-[#FDE8EA] hover:bg-[#fad2cf] rounded-full transition-all cursor-pointer whitespace-nowrap"
                    title="Reject Document"
                  >
                    <X size={13} />
                    <span>Reject</span>
                  </button>
                )}
              </>
            )}
          </div>
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
  const [filterTab, setFilterTab] = useState('All');

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
      const userInfo = candidatesInfo.find((u) => u.id === application?.candidate_id);
      const frontendUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const dashboardLink = frontendUrl + '/candidate/applications';

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

  const getDoc = (typeId) => documents.find((d) => d.document_type === typeId);

  const userInfo = candidatesInfo.find((u) => u.id === application?.candidate_id);

  const totalRequired = documentTypes.filter((d) => d.isRequired).length;
  const verifiedCount = documents.filter((d) => d.status === 'verified').length;
  const pendingCount = documents.filter((d) => d.status === 'pending' || !d.status).length;
  const missingCount = documentTypes.length - documents.length;

  const allRequiredVerified = documentTypes
    .filter((d) => d.isRequired)
    .every((d) => getDoc(d.id)?.status === 'verified');

  const hasNotified =
    Array.isArray(application?.application_timeline) &&
    application.application_timeline.some((t) => t.status_change === 'Documents Verified');

  const filteredDocs = useMemo(() => {
    return documentTypes.filter((doc) => {
      const current = getDoc(doc.id);
      if (filterTab === 'Required') return doc.isRequired;
      if (filterTab === 'Optional') return !doc.isRequired;
      if (filterTab === 'Pending') return current && current.status !== 'verified' && current.status !== 'rejected';
      return true;
    });
  }, [filterTab, documents]);

  if (isAppLoading || isDocsLoading) return <PageLoader message="Loading documents..." />;

  if (!application) {
    return (
      <div className="p-12 text-center text-[var(--muted)] space-y-3">
        <p className="text-base font-medium text-[var(--text)]">Application record not found</p>
        <Button
          variant="primary"
          onClick={() => navigate('/admin/recruitment')}
          className="h-9 px-4 rounded-full text-xs font-medium"
        >
          Return to recruitment
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12 antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Verify candidate documents
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Audit compliance certificates, identity papers, bank accounts, and offer letters
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isConverted ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--surface-alt)] text-[var(--muted)] border border-[var(--line)]">
              <Lock size={13} />
              <span>Onboarding finalized</span>
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={() => sendEmailMutation.mutate()}
              disabled={!allRequiredVerified || sendEmailMutation.isPending || hasNotified}
              loading={sendEmailMutation.isPending}
              className="h-9 px-4 rounded-full text-xs font-medium"
            >
              {hasNotified ? <CheckCircle2 size={14} /> : <Send size={14} />}
              <span>{hasNotified ? 'Candidate notified' : 'Notify candidate verified'}</span>
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => navigate('/admin/recruitment')}
            className="h-9 px-3.5 rounded-full text-xs font-medium"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </Button>
        </div>
      </div>

      {/* Converted Employee Notice Banner */}
      {isConverted && (
        <div className="rounded-[20px] bg-[var(--brand-tint)] p-4 flex items-start gap-3 text-[var(--text)]">
          <div className="p-2 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] shrink-0">
            <Lock size={16} />
          </div>
          <div>
            <h4 className="text-xs font-medium text-[var(--brand-deep)]">
              Candidate converted to employee &bull; Verification locked
            </h4>
            <p className="text-xs text-[var(--text-2)] mt-0.5 leading-relaxed">
              This candidate has been formally hired and converted to an active employee. Document approval statuses can no longer be modified.
            </p>
          </div>
        </div>
      )}

      {/* Candidate Overview Card */}
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar
            name={`${userInfo?.firstName || 'Candidate'} ${userInfo?.lastName || ''}`}
            size={48}
            shape="square"
            radius={14}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-medium text-[var(--text)]">
                {userInfo?.firstName || 'Candidate'} {userInfo?.lastName || ''}
              </h2>
              {application.jobs?.title && (
                <span className="text-xs font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-full">
                  {application.jobs?.title}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {userInfo?.email} &bull; {application.jobs?.department}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-[var(--line)] pt-3 md:pt-0 md:pl-6 text-xs">
          <div>
            <span className="text-[var(--muted)] block">Compliance status</span>
            <span
              className={`font-medium ${
                isConverted
                  ? 'text-[#1F9D55]'
                  : allRequiredVerified
                  ? 'text-[#1F9D55]'
                  : 'text-[#B7791F]'
              }`}
            >
              {isConverted ? 'Finalized & locked' : allRequiredVerified ? 'All mandatory verified' : 'Pending verification'}
            </span>
          </div>
          <div>
            <span className="text-[var(--muted)] block">Uploaded documents</span>
            <span className="font-medium text-[var(--text)]">
              {documents.length} of {documentTypes.length}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Mandatory required"
          value={totalRequired}
          caption="Essential compliance items"
          icon={<AlertCircle size={18} />}
        />
        <StatCard
          title="Verified documents"
          value={verifiedCount}
          caption="Approved by HR admin"
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          title="Pending review"
          value={pendingCount}
          caption="Awaiting check"
          icon={<Clock size={18} />}
        />
        <StatCard
          title="Not uploaded yet"
          value={missingCount}
          caption="Awaiting candidate upload"
          icon={<FileText size={18} />}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[var(--surface)] rounded-full overflow-x-auto hide-scrollbar">
        {['All', 'Required', 'Optional', 'Pending'].map((tab) => {
          const isActive = filterTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--ink)] text-white dark:bg-white dark:text-[#131315] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)]'
              }`}
            >
              {tab} documents{' '}
              {tab === 'All'
                ? `(${documentTypes.length})`
                : tab === 'Required'
                ? `(${totalRequired})`
                : tab === 'Pending'
                ? `(${pendingCount})`
                : ''}
            </button>
          );
        })}
      </div>

      {/* Documents Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredDocs.map((doc) => (
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
