import React, { useState, useMemo, useRef } from 'react';
import SearchBar from '../components/ui/SearchBar';
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
  Clock, 
  Search,
  ExternalLink,
  FileCheck,
  Layers
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import CandidateMobileDocuments from './CandidateMobileDocuments';
import PageLoader from '../components/PageLoader';

const documentTypes = [
  { id: 'signed_offer_letter', label: 'Signed Offer Letter', category: 'Offer & Contract', isRequired: true, isSpecial: true, description: 'Please sign and upload your official offer letter.' },
  { id: 'aadhaar_pan', label: 'Aadhaar Card & PAN Card', category: 'Identity & Legal', isRequired: true, description: 'Government issued identity proofs (Self-attested)' },
  { id: 'photo', label: 'Passport Size Photo', category: 'Identity & Legal', isRequired: true, description: 'Recent formal passport photo with white background' },
  { id: 'community_certificate', label: 'Community & Nativity Certificate', category: 'Identity & Legal', isRequired: true, description: 'Domicile or community verification certificate' },
  { id: 'academic_certificates', label: 'Academic Certificates (SSC, Inter, Degree & PG)', category: 'Academic & Health', isRequired: true, description: 'Consolidated marks memos and degree certificates' },
  { id: 'police_verification', label: 'Police Verification Certificate', category: 'Identity & Legal', isRequired: true, description: 'Police clearance / character verification certificate' },
  { id: 'family_aadhaar_pan', label: 'Family Aadhaar Card & PAN Card', category: 'Banking & Statutory', isRequired: true, description: 'For statutory PF & ESI enrollment records' },
  { id: 'nominee_esi', label: 'Nominee Details for ESI', category: 'Banking & Statutory', isRequired: true, description: 'Nominee declaration and signature form' },
  { id: 'bank_cheques', label: '5 Nationalised Bank Cheques', category: 'Banking & Statutory', isRequired: true, description: 'Cancelled cheques for payroll bank account mapping' },
  { id: 'fitness_certificate', label: 'Physical Fitness Certificate', category: 'Academic & Health', isRequired: true, description: 'Medical certificate issued by a registered Govt. Physician' },
  { id: 'pf_history', label: 'PF Service History & Passbook', category: 'Previous Employment', isRequired: false, description: 'UAN / EPFO service passbook details' },
  { id: 'previous_offer_letters', label: 'Previous Employment Offer Letters', category: 'Previous Employment', isRequired: false, description: 'Prior employer appointment & offer letters' },
  { id: 'promotion_letters', label: 'Promotion Letters', category: 'Previous Employment', isRequired: false, description: 'Historical designation / appraisal letters' },
  { id: 'salary_hike_letters', label: 'Salary Hike Letters', category: 'Previous Employment', isRequired: false, description: 'Compensation increment notices' },
  { id: 'pay_slips', label: 'Pay Slips (Latest 3 Months) & Statement', category: 'Previous Employment', isRequired: false, description: 'Recent 3 months salary slips and bank statement' },
  { id: 'relieving_letter', label: 'Relieving Letter / Experience Letter', category: 'Previous Employment', isRequired: false, description: 'Official relieving certificate from previous company' },
];

const CandidateDocuments = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadingType, setUploadingType] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRefs = useRef({});

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['candidate_documents', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const res = await api.get('/candidate/documents');
      return res.data.documents || [];
    },
    enabled: !!profile?.id,
    staleTime: 15 * 1000,
    refetchOnMount: true
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ docTypeId, file }) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/${docTypeId}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('candidate_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const proxyUrl = window.location.origin + "/Candidate-Document/" + uploadData.path;

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
      queryClient.invalidateQueries({ queryKey: ['candidate_documents', profile?.id] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload document');
    },
    onSettled: () => {
      setUploadingType(null);
    }
  });

  const handleUpload = (docTypeId, file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF documents are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit.');
      return;
    }
    setUploadingType(docTypeId);
    uploadMutation.mutate({ docTypeId, file });
  };

  const getDoc = (id) => documents.find(d => d.document_type === id);

  const specialDoc = documentTypes.find(d => d.isSpecial);
  const requiredDocs = documentTypes.filter(d => d.isRequired && !d.isSpecial);
  const optionalDocs = documentTypes.filter(d => !d.isRequired);

  const totalMandatory = documentTypes.filter(d => d.isRequired).length;
  const uploadedMandatory = documentTypes.filter(d => d.isRequired && getDoc(d.id)).length;
  const totalUploaded = documents.length;
  const verifiedCount = documents.filter(d => d.status === 'verified').length;
  const progressPercent = Math.round((uploadedMandatory / totalMandatory) * 100);

  const candidateDisplayName = profile?.firstName 
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : profile?.email || 'Candidate';

  // Filtered documents for the checklist table
  const filteredDocTypes = useMemo(() => {
    return documentTypes.filter(doc => {
      const currentDoc = getDoc(doc.id);
      
      if (activeCategoryFilter === 'MANDATORY' && !doc.isRequired) return false;
      if (activeCategoryFilter === 'OPTIONAL' && doc.isRequired) return false;
      if (activeCategoryFilter === 'UPLOADED' && !currentDoc) return false;
      if (activeCategoryFilter === 'VERIFIED' && currentDoc?.status !== 'verified') return false;
      if (activeCategoryFilter === 'PENDING' && (!currentDoc || currentDoc?.status === 'verified')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = doc.label.toLowerCase().includes(q);
        const matchesDesc = doc.description?.toLowerCase().includes(q);
        const matchesCat = doc.category.toLowerCase().includes(q);
        const matchesFileName = currentDoc?.file_name?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat && !matchesFileName) return false;
      }

      return true;
    });
  }, [activeCategoryFilter, searchQuery, documents]);

  if (isLoading && documents.length === 0) {
    return <PageLoader message="Loading Verification Records..." />;
  }

  return (
    <div className="h-screen w-full bg-[var(--bg)] flex flex-col overflow-hidden antialiased">
      {/* Top Header App Bar (Desktop Only) */}
      <header className="h-16 px-6 sm:px-8 bg-[var(--surface)] border-b border-[var(--line)] items-center justify-between shrink-0 sticky top-0 z-40 shadow-xs hidden md:flex">
        <div className="flex items-center gap-4">
          <button 
            type="button" 
            onClick={() => navigate('/candidate/applications')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)]/50 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Back to Applications</span>
          </button>

          <div className="h-6 w-px bg-[var(--line)] hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] flex items-center justify-center font-bold">
              <Folder size={18} />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[var(--text)]">My Onboarding Checklist</h1>
              <p className="text-[11px] text-[var(--muted)] hidden sm:block">
                Candidate: <strong className="text-[var(--text)] font-semibold">{candidateDisplayName}</strong> &bull; Pre-Employment KYC Table
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Status Badges */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-[var(--surface-alt)] border border-[var(--line)] px-3.5 py-1.5 rounded-full">
            <ShieldCheck size={14} className={uploadedMandatory === totalMandatory ? 'text-[#1F9D55]' : 'text-[#B7791F]'} />
            <span className="text-xs font-semibold text-[var(--text)]">
              {uploadedMandatory} / {totalMandatory} Mandatory Attached
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F9D55] bg-[#E6F6EC] border border-[#CEEAD6] px-3 py-1 rounded-full shadow-xs">
            <CheckCircle2 size={13} />
            <span>{verifiedCount} Verified by HR</span>
          </span>
        </div>
      </header>

      {/* Scrollable Viewport Container */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Mobile View Component */}
        <CandidateMobileDocuments 
          documents={documents}
          uploadingType={uploadingType}
          handleUpload={handleUpload}
          documentTypes={documentTypes}
          specialDoc={specialDoc}
          requiredDocs={requiredDocs}
          optionalDocs={optionalDocs}
          getDoc={getDoc}
          onPreview={setPreviewDoc}
        />

        {/* Desktop Web View */}
        <main className="max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-6 pb-24 hidden md:block">
          
          {/* Key Metrics Cards Row */}
          <div className="grid grid-cols-4 gap-4">
            {/* Metric 1 */}
            <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Total Checklist</p>
                <h3 className="text-2xl font-semibold text-[var(--text)] mt-0.5">{documentTypes.length}</h3>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">Required &amp; optional items</p>
              </div>
              <div className="w-10 h-10 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
                <Layers size={20} />
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Mandatory KYC</p>
                <h3 className="text-2xl font-semibold text-[var(--text)] mt-0.5">{uploadedMandatory} / {totalMandatory}</h3>
                <div className="w-24 h-1.5 bg-[var(--surface-alt)] rounded-full overflow-hidden mt-1.5 border border-[var(--line)]">
                  <div className="h-full bg-[var(--brand-deep)] rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <div className="w-10 h-10 rounded-[12px] bg-[#FDE8EA] text-[#D64550] flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Files Uploaded</p>
                <h3 className="text-2xl font-semibold text-[var(--text)] mt-0.5">{totalUploaded}</h3>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">PDF documents attached</p>
              </div>
              <div className="w-10 h-10 rounded-[12px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] flex items-center justify-center">
                <FileCheck size={20} />
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">HR Verified</p>
                <h3 className="text-2xl font-semibold text-[#1F9D55] mt-0.5">{verifiedCount}</h3>
                <p className="text-[10px] text-[#1F9D55] mt-0.5 font-medium">Compliance approved</p>
              </div>
              <div className="w-10 h-10 rounded-[12px] bg-[#E6F6EC] text-[#1F9D55] flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
            </div>
          </div>

          {/* Filter, Search & Tab Controls */}
          <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 hide-scrollbar">
              {[
                { id: 'ALL', label: 'All Items', count: documentTypes.length },
                { id: 'MANDATORY', label: 'Mandatory', count: totalMandatory },
                { id: 'OPTIONAL', label: 'Optional', count: optionalDocs.length },
                { id: 'UPLOADED', label: 'Uploaded', count: totalUploaded },
                { id: 'VERIFIED', label: 'Verified', count: verifiedCount },
                { id: 'PENDING', label: 'Pending Action', count: documentTypes.length - verifiedCount }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeCategoryFilter === tab.id
                      ? 'bg-[var(--ink)] text-white shadow-xs'
                      : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)]'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Search Box */}
            <SearchBar
              placeholder="Search document name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              wrapperClassName="w-full lg:w-72"
            />
          </div>

          {/* Checklist Table Container */}
          <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    <th className="py-3.5 px-5 w-8 text-center">#</th>
                    <th className="py-3.5 px-4 min-w-[280px]">Document Requirement</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Category</th>
                    <th className="py-3.5 px-4 min-w-[220px]">Attached File Details</th>
                    <th className="py-3.5 px-4 min-w-[150px]">Verification Status</th>
                    <th className="py-3.5 px-5 text-right min-w-[180px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)] text-xs">
                  {filteredDocTypes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[var(--muted)]">
                        <div className="w-12 h-12 rounded-[14px] bg-[var(--surface-alt)] border border-[var(--line)] flex items-center justify-center mx-auto mb-2 text-[var(--muted)]">
                          <Search size={20} />
                        </div>
                        <p className="font-semibold text-[var(--text)]">No matching documents found</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">Try adjusting your category filter or search keyword.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDocTypes.map((doc, idx) => {
                      const currentDoc = getDoc(doc.id);
                      const isUploading = uploadingType === doc.id;
                      const isVerified = currentDoc?.status === 'verified';
                      const isRejected = currentDoc?.status === 'rejected';

                      return (
                        <tr 
                          key={doc.id}
                          className="hover:bg-[var(--surface-alt)]/60 transition-colors"
                        >
                          {/* Row Number */}
                          <td className="py-4 px-5 text-center text-[var(--muted)] font-medium text-xs">
                            {idx + 1}
                          </td>

                          {/* Document Name & Description */}
                          <td className="py-4 px-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5 ${
                                doc.isSpecial 
                                  ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]' 
                                  : doc.isRequired 
                                    ? 'bg-[var(--brand-tint)] text-[var(--brand-deep)]' 
                                    : 'bg-[var(--surface-alt)] text-[var(--muted)]'
                              }`}>
                                <FileText size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-[var(--text)]">{doc.label}</span>
                                  {doc.isRequired ? (
                                    <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#FDE8EA] text-[#D64550] rounded-full border border-[#FCD0D4]">
                                      Mandatory
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#EFEFF1] text-[#4A4A52] rounded-full border border-[#E3E3E7]">
                                      Optional
                                    </span>
                                  )}
                                  {doc.isSpecial && (
                                    <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] rounded-full border border-[var(--accent-pink)]/20">
                                      Featured
                                    </span>
                                  )}
                                </div>
                                {doc.description && (
                                  <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">
                                    {doc.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-[8px] text-[11px] font-medium bg-[var(--surface-alt)] border border-[var(--line)] text-[var(--text-2)]">
                              {doc.category}
                            </span>
                          </td>

                          {/* Attached File Details */}
                          <td className="py-4 px-4">
                            {currentDoc ? (
                              <div className="flex items-center gap-2 max-w-[240px]">
                                <div className="w-7 h-7 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0 border border-[var(--brand)]/20">
                                  <span className="text-[9px] font-bold">PDF</span>
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-[var(--text)] truncate" title={currentDoc.file_name}>
                                    {currentDoc.file_name}
                                  </p>
                                  <p className="text-[10px] text-[var(--muted)]">
                                    {new Date(currentDoc.uploaded_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs italic text-[var(--muted)]">
                                No file uploaded
                              </span>
                            )}
                          </td>

                          {/* Verification Status */}
                          <td className="py-4 px-4">
                            {!currentDoc ? (
                              doc.isRequired ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FDE8EA] text-[#D64550] border border-[#FCD0D4]">
                                  <AlertCircle size={12} />
                                  <span>Pending Upload</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#EFEFF1] text-[#4A4A52] border border-[#E3E3E7]">
                                  <span>Not Provided</span>
                                </span>
                              )
                            ) : isVerified ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E6F6EC] text-[#1F9D55] border border-[#CEEAD6]">
                                <CheckCircle2 size={12} />
                                <span>Verified by HR</span>
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FDE8EA] text-[#D64550] border border-[#FCD0D4]">
                                <AlertCircle size={12} />
                                <span>Rejected</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E8F0FB] text-[#3B6FB6] border border-[#D2E3FC]">
                                <Clock size={12} />
                                <span>Under Review</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Hidden Native File Input */}
                              <input
                                type="file"
                                accept=".pdf,application/pdf"
                                ref={(el) => (fileInputRefs.current[doc.id] = el)}
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleUpload(doc.id, e.target.files[0]);
                                  }
                                }}
                              />

                              {/* Preview PDF Button */}
                              {currentDoc && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc({ ...currentDoc, docType: doc })}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)]/50 text-xs font-semibold text-[var(--brand-deep)] transition-all cursor-pointer shadow-xs"
                                  title="Preview Document"
                                >
                                  <Eye size={13} />
                                  <span>Preview</span>
                                </button>
                              )}

                              {/* Upload or Replace Button */}
                              {!isVerified ? (
                                <button
                                  type="button"
                                  disabled={isUploading}
                                  onClick={() => fileInputRefs.current[doc.id]?.click()}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                                    currentDoc 
                                      ? 'border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)]/50 text-[var(--text)]' 
                                      : 'bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white'
                                  }`}
                                >
                                  {isUploading ? (
                                    <>
                                      <Loader2 size={13} className="animate-spin" />
                                      <span>Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <UploadCloud size={13} />
                                      <span>{currentDoc ? 'Replace' : 'Upload PDF'}</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E6F6EC] text-[#1F9D55] border border-[#CEEAD6] cursor-not-allowed" title="Document verified and locked">
                                  <Lock size={12} className="text-[#1F9D55]" />
                                  <span>Locked</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compliance Help Footer Card */}
          <div className="rounded-[20px] border border-[var(--brand)]/20 bg-[var(--brand-tint)]/60 p-4.5 flex items-start gap-3.5 text-[var(--text)] shadow-xs">
            <div className="p-2 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-deep)]">
                Document Compliance Guidelines
              </h4>
              <p className="text-xs text-[var(--text-2)] mt-0.5 leading-relaxed">
                All submitted documents must be clear, legibly scanned copies in PDF format up to 5MB. Ensure academic marks memos and identity cards (Aadhaar &amp; PAN) are self-attested. Once approved by HR, your compliance checklist status will be locked for regulatory onboarding audits.
              </p>
            </div>
          </div>

        </main>
      </div>

      {/* Inline Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="h-14 px-6 bg-[var(--surface)] border-b border-[var(--line)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center font-bold">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">{previewDoc.docType?.label || previewDoc.file_name}</h3>
                  <p className="text-[11px] text-[var(--muted)] truncate max-w-md">{previewDoc.file_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)]/50 text-xs font-semibold text-[var(--brand-deep)] transition-all"
                  title="Open in new window"
                >
                  <ExternalLink size={13} />
                  <span>Open Full Screen</span>
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="w-8 h-8 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)]/50 text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Embedded Viewer */}
            <div className="flex-1 bg-[#1F1F23] relative overflow-hidden">
              <iframe
                src={`${previewDoc.file_path}#toolbar=0`}
                title={previewDoc.file_name}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDocuments;
