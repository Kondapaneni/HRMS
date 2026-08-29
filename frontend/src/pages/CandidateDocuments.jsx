import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import api from '../api/axios';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Eye, 
  Loader2, 
  Info, 
  Lock, 
  ArrowLeft, 
  Folder, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Building2 
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import CandidateMobileDocuments from './CandidateMobileDocuments';
import PageLoader from '../components/PageLoader';

const documentTypes = [
  { id: 'signed_offer_letter', label: 'Signed Offer Letter', isRequired: true, isSpecial: true, description: 'Please sign and upload your official offer letter.' },
  { id: 'aadhaar_pan', label: 'Aadhaar Card & PAN Card', isRequired: true, description: 'Government issued identity proofs' },
  { id: 'photo', label: 'Passport Size Photo (White Background)', isRequired: true, description: 'Recent formal photo with clean background' },
  { id: 'community_certificate', label: 'Community/Residence & Nativity Certificate', isRequired: true, description: 'Domicile or community certificate' },
  { id: 'academic_certificates', label: 'Academic Certificates (SSC, Inter, Degree & PG)', isRequired: true, description: 'Consolidated marks memos and certificates' },
  { id: 'police_verification', label: 'Police Verification Certificate', isRequired: true, description: 'Police clearance / character verification' },
  { id: 'family_aadhaar_pan', label: 'Family Aadhaar Card & PAN Card', isRequired: true, description: 'For PF & ESI statutory enrollment' },
  { id: 'nominee_esi', label: 'Nominee Details for ESI', isRequired: true, description: 'Nominee form and declaration' },
  { id: 'bank_cheques', label: '5 Nationalised Bank Cheques', isRequired: true, description: 'Cancelled cheques for salary account setup' },
  { id: 'fitness_certificate', label: 'Physical Fitness Certificate', isRequired: true, description: 'Issued by a registered Govt. Physician' },
  { id: 'pf_history', label: 'PF Service History & Passbook', isRequired: false, description: 'UAN / EPFO service passbook details' },
  { id: 'previous_offer_letters', label: 'Previous Employment Offer Letters', isRequired: false, description: 'Prior appointment letters' },
  { id: 'promotion_letters', label: 'Promotion Letters', isRequired: false, description: 'Designation / appraisal letters' },
  { id: 'salary_hike_letters', label: 'Salary Hike Letters', isRequired: false, description: 'Compensation increment notices' },
  { id: 'pay_slips', label: 'Pay Slips (Latest 3 Months) & Statement', isRequired: false, description: 'Recent 3 months salary slips' },
  { id: 'relieving_letter', label: 'Relieving Letter / Experience Letter', isRequired: false, description: 'Official relieving certificate from prior employer' },
];

const DocumentUploadCard = ({ docType, currentDoc, onUpload, isUploading }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onUpload(docType.id, acceptedFiles[0]);
    }
  }, [docType.id, onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: isUploading || currentDoc?.status === 'verified'
  });

  const getStatusBadge = () => {
    if (!currentDoc) {
      return docType.isRequired ? 
        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] rounded-full">Mandatory</span> :
        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] rounded-full">Optional</span>;
    }
    
    switch (currentDoc.status) {
      case 'verified':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#e6f4ea] text-[#137333] border border-[#ceead6] rounded-full flex items-center gap-1"><CheckCircle2 size={12} /> Verified</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf] rounded-full flex items-center gap-1"><AlertCircle size={12} /> Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] rounded-full flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Pending Review</span>;
    }
  };

  return (
    <div className={`border rounded-2xl p-5 transition-all duration-200 bg-white ${docType.isSpecial ? 'border-[#d2e3fc] bg-[#f8fafd] shadow-xs' : 'border-[#e0e3e7] shadow-2xs hover:border-[#dadce0]'}`}>
      <div className="flex justify-between items-start gap-3 mb-3">
        <div>
          <h3 className={`font-bold text-sm ${docType.isSpecial ? 'text-[#1a73e8]' : 'text-[#1f1f1f]'}`}>
            {docType.label}
          </h3>
          {docType.description && <p className="text-xs text-[#5f6368] mt-0.5">{docType.description}</p>}
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {currentDoc ? (
        <div className="bg-[#f8fafd] rounded-xl border border-[#e0e3e7] p-3.5 flex items-center justify-between mt-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-[#fce8e6] text-[#c5221f] rounded-xl flex items-center justify-center shrink-0 border border-[#fad2cf]">
              <FileText size={18} />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-[#1f1f1f] truncate">{currentDoc.file_name}</p>
              <p className="text-[10px] text-[#5f6368]">Uploaded {new Date(currentDoc.uploaded_at).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <a 
              href={currentDoc.file_path} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-[#1a73e8] bg-white border border-[#dadce0] hover:bg-[#f1f3f4] transition-colors shadow-2xs"
              title="View Document"
            >
              <Eye size={13} />
              <span>View</span>
            </a>
            {currentDoc.status !== 'verified' && (
              <div {...getRootProps()} className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-[#5f6368] bg-white border border-[#dadce0] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] transition-colors shadow-2xs" title="Replace File">
                <input {...getInputProps()} />
                <UploadCloud size={13} />
                <span>Replace</span>
              </div>
            )}
            {currentDoc.status === 'verified' && (
              <div className="p-1.5 text-[#137333] bg-[#e6f4ea] border border-[#ceead6] rounded-full" title="Document verified and locked">
                <Lock size={14} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div 
          {...getRootProps()} 
          className={`mt-3 border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragActive ? 'border-[#1a73e8] bg-[#e8f0fe]' : 'border-[#dadce0] bg-[#f8fafd] hover:bg-[#e8eaed] hover:border-[#bdc1c6]'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="w-10 h-10 bg-white shadow-2xs rounded-full flex items-center justify-center text-[#1a73e8] mb-2 border border-[#e0e3e7]">
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
          </div>
          <p className="text-xs font-semibold text-[#1f1f1f]">
            {isDragActive ? 'Drop PDF here...' : 'Click or drag PDF file to upload'}
          </p>
          <p className="text-[10px] text-[#5f6368] mt-0.5">PDF format only (Max 5MB)</p>
        </div>
      )}
    </div>
  );
};

const CandidateDocuments = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadingType, setUploadingType] = useState(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['candidate_documents', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const res = await api.get('/candidate/documents');
      return res.data.documents || [];
    },
    enabled: !!profile?.id,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ docTypeId, file }) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/${docTypeId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('candidate_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const proxyUrl = window.location.origin + "/Candidate-Document/" + filePath;

      // Delete existing from storage
      const res = await api.get('/candidate/documents');
      const docs = res.data.documents || [];
      const existingDoc = docs.find(d => d.document_type === docTypeId);

      if (existingDoc && existingDoc.file_path) {
        const parts = existingDoc.file_path.split('/Candidate-Document/');
        if (parts.length > 1) {
          const oldStoragePath = parts[1];
          await supabase.storage.from('candidate_documents').remove([oldStoragePath]);
        }
      }

      const resPost = await api.post('/candidate/documents', {
          document_type: docTypeId,
          file_path: proxyUrl,
          file_name: file.name
      });
      return resPost.data.document;
    },
    onSuccess: () => {
      toast.success('Document uploaded successfully');
      queryClient.invalidateQueries(['candidate_documents', profile?.id]);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload document');
    },
    onSettled: () => {
      setUploadingType(null);
    }
  });

  const handleUpload = (docTypeId, file) => {
    setUploadingType(docTypeId);
    uploadMutation.mutate({ docTypeId, file });
  };

  if (isLoading && documents.length === 0) {
    return <PageLoader message="Loading Documents..." />;
  }

  const specialDoc = documentTypes.find(d => d.isSpecial);
  const requiredDocs = documentTypes.filter(d => d.isRequired && !d.isSpecial);
  const optionalDocs = documentTypes.filter(d => !d.isRequired);

  const getDoc = (id) => documents.find(d => d.document_type === id);

  const totalMandatory = documentTypes.filter(d => d.isRequired).length;
  const uploadedMandatory = documentTypes.filter(d => d.isRequired && getDoc(d.id)).length;
  const verifiedCount = documents.filter(d => d.status === 'verified').length;
  const progressPercent = Math.round((uploadedMandatory / totalMandatory) * 100);

  const candidateDisplayName = profile?.firstName 
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : profile?.email || 'Candidate';

  return (
    <div className="h-screen w-full bg-[#f8fafd] flex flex-col overflow-hidden">
      {/* Top 4-Color Gradient Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] shrink-0" />

      {/* Top App Header Bar */}
      <header className="h-16 px-6 sm:px-8 bg-white border-b border-[#e0e3e7] flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-2xs">
        <div className="flex items-center gap-4">
          <button 
            type="button" 
            onClick={() => navigate('/candidate/applications')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-xs font-semibold text-[#5f6368] hover:text-[#1f1f1f] transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Back to Applications</span>
          </button>

          <div className="h-6 w-px bg-[#dadce0] hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f3e8fd] text-[#8430ce] flex items-center justify-center font-bold">
              <Folder size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#1f1f1f]">My Onboarding Documents</h1>
              <p className="text-[11px] text-[#5f6368] hidden sm:block">
                Candidate: <strong className="text-[#1f1f1f]">{candidateDisplayName}</strong> &bull; Pre-Employment Verification
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Status Pill */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-[#f8fafd] border border-[#e0e3e7] px-3.5 py-1.5 rounded-full">
            <ShieldCheck size={14} className={uploadedMandatory === totalMandatory ? 'text-[#137333]' : 'text-[#b06000]'} />
            <span className="text-xs font-semibold text-[#1f1f1f]">
              {uploadedMandatory} of {totalMandatory} Mandatory Attached
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-3 py-1 rounded-full">
            <CheckCircle2 size={13} />
            <span>{verifiedCount} Verified</span>
          </span>
        </div>
      </header>

      {/* Scrollable Main Viewport */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Mobile Render Layout */}
        <CandidateMobileDocuments 
          documents={documents}
          uploadingType={uploadingType}
          handleUpload={handleUpload}
          documentTypes={documentTypes}
          DocumentUploadCard={DocumentUploadCard}
          specialDoc={specialDoc}
          requiredDocs={requiredDocs}
          optionalDocs={optionalDocs}
          getDoc={getDoc}
        />

        {/* Desktop Full Page Container */}
        <main className="max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-8 pb-24 hidden md:block">
          {/* Hero Overview Card */}
          <div className="rounded-3xl border border-[#e0e3e7] bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">
                  Candidate Compliance & KYC
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#1f1f1f] tracking-tight">
                Pre-Employment Document Verification
              </h2>
              <p className="text-xs text-[#5f6368] max-w-2xl leading-relaxed">
                Upload your required identity proofs, academic credentials, and onboarding documents. Only PDF format (up to 5MB) is accepted. Once verified by HR, your documents will be locked for regulatory audit.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-[#1f1f1f]">{progressPercent}% Ready</p>
                  <p className="text-[10px] text-[#5f6368]">{uploadedMandatory} / {totalMandatory} Mandatory uploaded</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center font-bold text-xs text-[#1a73e8]">
                  {progressPercent}%
                </div>
              </div>
              {/* Progress Bar */}
              <div className="w-48 h-2 bg-[#f1f3f4] rounded-full overflow-hidden border border-[#e0e3e7]">
                <div 
                  className="h-full bg-gradient-to-r from-[#4285F4] to-[#34A853] transition-all duration-500 rounded-full" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Special Offer Letter Acceptance Section */}
          {specialDoc && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                  <FileText size={16} />
                </div>
                <h2 className="text-base font-bold text-[#1f1f1f]">Offer Letter Acceptance</h2>
              </div>
              <DocumentUploadCard 
                docType={specialDoc} 
                currentDoc={getDoc(specialDoc.id)} 
                onUpload={handleUpload}
                isUploading={uploadingType === specialDoc.id}
              />
            </section>
          )}

          {/* 2-Column Grid: Mandatory & Optional Documents */}
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Column 1: Mandatory Documents */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#e0e3e7] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-[#fce8e6] text-[#c5221f]">
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1f1f1f]">Mandatory KYC & Verification</h2>
                    <p className="text-[11px] text-[#5f6368]">Required for compliance, PF, and statutory payroll</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#5f6368]">
                  {requiredDocs.filter(d => getDoc(d.id)).length} / {requiredDocs.length}
                </span>
              </div>

              <div className="space-y-4">
                {requiredDocs.map(doc => (
                  <DocumentUploadCard 
                    key={doc.id}
                    docType={doc} 
                    currentDoc={getDoc(doc.id)} 
                    onUpload={handleUpload}
                    isUploading={uploadingType === doc.id}
                  />
                ))}
              </div>
            </section>

            {/* Column 2: Additional & Prior Employment Documents */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#e0e3e7] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-[#f1f3f4] text-[#5f6368]">
                    <Info size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1f1f1f]">Employment History & Optional</h2>
                    <p className="text-[11px] text-[#5f6368]">Supporting prior service, pay slips, and letters</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#5f6368]">
                  {optionalDocs.filter(d => getDoc(d.id)).length} / {optionalDocs.length}
                </span>
              </div>

              <div className="space-y-4">
                {optionalDocs.map(doc => (
                  <DocumentUploadCard 
                    key={doc.id}
                    docType={doc} 
                    currentDoc={getDoc(doc.id)} 
                    onUpload={handleUpload}
                    isUploading={uploadingType === doc.id}
                  />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CandidateDocuments;

