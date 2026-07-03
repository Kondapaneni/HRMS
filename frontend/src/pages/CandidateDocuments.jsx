import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import api from '../api/axios';
import { FileText, UploadCloud, CheckCircle2, AlertCircle, X, Eye, Loader2, Info, Lock } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import CandidateMobileDocuments from './CandidateMobileDocuments';

const documentTypes = [
  { id: 'signed_offer_letter', label: 'Signed Offer Letter', isRequired: true, isSpecial: true, description: 'Please sign and upload your official offer letter.' },
  { id: 'aadhaar_pan', label: 'Aadhaar Card & PAN Card', isRequired: true },
  { id: 'photo', label: 'Passport Size Photo (White Background)', isRequired: true },
  { id: 'community_certificate', label: 'Community/Residence and Nativity Certificate', isRequired: true },
  { id: 'academic_certificates', label: 'Academic Certificates (SSC, Inter, Degree & PG)', isRequired: true },
  { id: 'police_verification', label: 'Police Verification Certificate', isRequired: true },
  { id: 'family_aadhaar_pan', label: 'Family Aadhaar Card & PAN Card', isRequired: true, description: 'For PF & ESI purposes' },
  { id: 'nominee_esi', label: 'Nominee Details for ESI', isRequired: true },
  { id: 'bank_cheques', label: '5 Nationalised Bank Cheques', isRequired: true },
  { id: 'fitness_certificate', label: 'Physical Fitness Certificate', isRequired: true, description: 'By Govt. Physician' },
  { id: 'pf_history', label: 'PF Service History & Passbook', isRequired: false },
  { id: 'previous_offer_letters', label: 'Previous Employment Offer Letters', isRequired: false },
  { id: 'promotion_letters', label: 'Promotion Letters', isRequired: false },
  { id: 'salary_hike_letters', label: 'Salary Hike Letters', isRequired: false },
  { id: 'pay_slips', label: 'Pay Slips (Latest 3 Months) & Account Statement', isRequired: false },
  { id: 'relieving_letter', label: 'Relieving Letter', isRequired: false },
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
        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-600 rounded-lg">Required</span> :
        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 rounded-lg">Optional</span>;
    }
    
    switch (currentDoc.status) {
      case 'verified':
        return <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-600 rounded-lg flex items-center gap-1"><CheckCircle2 size={12} /> Verified</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600 rounded-lg flex items-center gap-1"><AlertCircle size={12} /> Rejected</span>;
      default:
        return <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-600 rounded-lg flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Pending Review</span>;
    }
  };

  return (
    <div className={`border rounded-2xl p-4 transition-all duration-300 bg-white ${docType.isSpecial ? 'border-blue-200 shadow-blue-100 shadow-lg' : 'border-slate-200 shadow-sm'}`}>
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
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex items-center justify-between mt-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div className="truncate">
              <p className="text-sm font-medium text-slate-700 truncate">{currentDoc.file_name}</p>
              <p className="text-xs text-slate-500">Uploaded {new Date(currentDoc.uploaded_at).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a 
              href={currentDoc.file_url || currentDoc.file_path} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View Document"
            >
              <Eye size={18} />
            </a>
            {currentDoc.status !== 'verified' && (
              <div {...getRootProps()} className="cursor-pointer p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Replace File">
                <input {...getInputProps()} />
                <UploadCloud size={18} />
              </div>
            )}
            {currentDoc.status === 'verified' && (
              <div className="p-2 text-emerald-500 bg-emerald-50 rounded-lg cursor-not-allowed transition-colors" title="This document has been verified and is locked">
                <Lock size={18} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div 
          {...getRootProps()} 
          className={`mt-4 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="w-12 h-12 bg-white shadow-sm rounded-full flex items-center justify-center text-blue-500 mb-3">
            {isUploading ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
          </div>
          <p className="text-sm font-medium text-slate-700">
            {isDragActive ? 'Drop PDF here...' : 'Click or drag PDF to upload'}
          </p>
          <p className="text-xs text-slate-500 mt-1">PDF format only (Max 5MB)</p>
        </div>
      )}
    </div>
  );
};

const CandidateDocuments = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingType, setUploadingType] = useState(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['candidate_documents', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const res = await api.get('/candidate/documents');
      return res.data.documents || [];
    },
    enabled: !!profile?.id
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

      if (existingDoc && (existingDoc.file_url || existingDoc.file_path)) {
        const urlToSplit = existingDoc.file_url || existingDoc.file_path;
        const parts = urlToSplit.split('/Candidate-Document/');
        if (parts.length > 1) {
          const oldStoragePath = parts[1];
          await supabase.storage.from('candidate_documents').remove([oldStoragePath]);
        }
      }

      const resPost = await api.post('/candidate/documents', {
          document_type: docTypeId,
          file_url: proxyUrl,
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  const specialDoc = documentTypes.find(d => d.isSpecial);
  const requiredDocs = documentTypes.filter(d => d.isRequired && !d.isSpecial);
  const optionalDocs = documentTypes.filter(d => !d.isRequired);

  const getDoc = (id) => documents.find(d => d.document_type === id);

  return (
    <>
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
      <div className="w-full pb-12 relative hidden md:block">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">My Documents</h1>
          <p className="text-slate-500 mt-2">Upload your required pre-employment documents securely. Only PDF files are accepted.</p>
        </div>

      {/* Special Offer Letter Section */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-slate-800">Offer Letter Acceptance</h2>
        </div>
        <DocumentUploadCard 
          docType={specialDoc} 
          currentDoc={getDoc(specialDoc.id)} 
          onUpload={handleUpload}
          isUploading={uploadingType === specialDoc.id}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Required Documents */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-amber-500" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Required Documents</h2>
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
        </div>

        {/* Optional Documents */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Info className="text-slate-400" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Optional Documents</h2>
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
        </div>
      </div>
      </div>
    </>
  );
};

export default CandidateDocuments;
