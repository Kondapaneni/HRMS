import React from 'react';
import { 
  FileText, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Folder, 
  Sparkles, 
  ArrowLeft,
  UploadCloud,
  Eye,
  Lock,
  Loader2,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const MobileDocumentUploadCard = ({ docType, currentDoc, onUpload, isUploading, onPreview }) => {
  const getStatusBadge = () => {
    if (!currentDoc) {
      return docType.isRequired ? 
        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#fce8e6] text-[#c5221f] rounded-full border border-[#fad2cf] whitespace-nowrap shrink-0">Required</span> :
        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#f1f3f4] text-[#5f6368] rounded-full border border-[#dadce0] whitespace-nowrap shrink-0">Optional</span>;
    }
    
    switch (currentDoc.status) {
      case 'verified':
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#e6f4ea] text-[#137333] rounded-full border border-[#ceead6] flex items-center gap-1 whitespace-nowrap shrink-0">
            <CheckCircle2 size={12} className="shrink-0" /> Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#fce8e6] text-[#c5221f] rounded-full border border-[#fad2cf] flex items-center gap-1 whitespace-nowrap shrink-0">
            <AlertCircle size={12} className="shrink-0" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#e8f0fe] text-[#1a73e8] rounded-full border border-[#d2e3fc] flex items-center gap-1 whitespace-nowrap shrink-0">
            <Loader2 size={12} className="animate-spin shrink-0" /> Pending Review
          </span>
        );
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(docType.id, e.target.files[0]);
    }
  };

  const isVerified = currentDoc?.status === 'verified';
  const initials = docType.label ? docType.label.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'DC';

  return (
    <div className={`bg-white rounded-3xl border ${docType.isSpecial ? 'border-[#d2e3fc] shadow-sm' : 'border-[#e0e3e7]'} p-5 shadow-xs space-y-3.5`}>
      {/* 1. Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-2xl ${
            docType.isSpecial 
              ? 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]' 
              : docType.isRequired 
              ? 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]' 
              : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
          } flex items-center justify-center font-bold text-xs shrink-0`}>
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#1f1f1f] leading-snug truncate">
              {docType.label}
            </h3>
            <span className="text-[11px] text-[#5f6368] font-medium block mt-0.5">
              {docType.category}
            </span>
          </div>
        </div>
        <div className="shrink-0">{getStatusBadge()}</div>
      </div>

      {/* Description */}
      {docType.description && (
        <p className="text-xs text-[#5f6368] leading-relaxed">
          {docType.description}
        </p>
      )}

      {/* 2. Uploaded Document Info Box */}
      {currentDoc ? (
        <div className="bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-[#fce8e6] text-[#c5221f] flex items-center justify-center shrink-0 border border-[#fad2cf]">
              <FileText size={15} />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-[#1f1f1f] truncate" title={currentDoc.file_name}>
                {currentDoc.file_name}
              </p>
              <p className="text-[10px] text-[#5f6368]">
                Uploaded {new Date(currentDoc.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onPreview && onPreview({ ...currentDoc, docType })}
            className="p-2 rounded-xl bg-white border border-[#dadce0] text-[#1a73e8] hover:bg-[#e8f0fe] transition-all shadow-2xs shrink-0 cursor-pointer"
            title="Preview Document"
          >
            <Eye size={15} />
          </button>
        </div>
      ) : null}

      {/* 3. Action Footer */}
      <div className="pt-2 border-t border-[#f1f3f4]">
        {currentDoc ? (
          isVerified ? (
            <div className="w-full h-11 rounded-full border border-[#ceead6] bg-[#e6f4ea] text-[#137333] font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs">
              <Lock size={13} />
              <span>Verified by HR &bull; Locked</span>
            </div>
          ) : (
            <label className={`w-full h-11 rounded-full border border-[#dadce0] bg-[#f8fafd] hover:bg-[#e8f0fe] active:bg-[#d2e3fc] text-[#1a73e8] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              isUploading ? 'opacity-70 cursor-not-allowed' : ''
            }`}>
              {isUploading ? (
                <>
                  <Loader2 size={15} className="animate-spin text-[#1a73e8]" />
                  <span>Uploading PDF...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={15} />
                  <span>Replace Document</span>
                </>
              )}
              <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} disabled={isUploading} />
            </label>
          )
        ) : (
          <label className={`w-full h-12 rounded-full border border-dashed border-[#1a73e8] bg-[#e8f0fe]/60 hover:bg-[#e8f0fe] active:bg-[#d2e3fc] text-[#1a73e8] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs ${
            isUploading ? 'opacity-70 cursor-not-allowed' : ''
          }`}>
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin text-[#1a73e8]" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadCloud size={16} />
                <span>Upload PDF (Max 5MB)</span>
              </>
            )}
            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} disabled={isUploading} />
          </label>
        )}
      </div>
    </div>
  );
};

const CandidateMobileDocuments = ({
  documents, uploadingType, handleUpload, documentTypes, specialDoc, requiredDocs, optionalDocs, getDoc, onPreview
}) => {
  const totalMandatory = documentTypes.filter(d => d.isRequired).length;
  const uploadedMandatory = documentTypes.filter(d => d.isRequired && getDoc(d.id)).length;
  const verifiedCount = documents.filter(d => d.status === 'verified').length;
  const progressPercent = Math.round((uploadedMandatory / totalMandatory) * 100);

  return (
    <div className="space-y-4 pb-32 md:hidden">
      {/* 1. Hero Section with Animated Motion Graphics (Matching Applications Header) */}
      <section className="px-4 pt-6 pb-12 relative overflow-hidden bg-slate-900">
        {/* Soft Glowing Emerald, Teal, and Cyan Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-teal-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-cyan-400 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md flex items-center gap-1.5">
            <Sparkles size={12} className="text-emerald-300" />
            Onboarding KYC &bull; Candidate Portal
          </p>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-sm">
              Documents
            </h2>

            {/* Back button aligned to the right on the same line */}
            <Link
              to="/candidate/applications"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur-md text-white text-xs font-semibold border border-white/20 transition-all shadow-xs shrink-0"
            >
              <ArrowLeft size={13} />
              <span>Back to Applications</span>
            </Link>
          </div>

          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90 pt-0.5">
            {documents.length} of {documentTypes.length} uploaded &bull; {verifiedCount} Verified by HR
          </p>
        </div>
      </section>

      {/* 2. Floating Overview Progress Card */}
      <div className="px-4 -mt-8 relative z-20 space-y-3.5">
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-[#1a73e8] uppercase tracking-wider block">
                Mandatory Compliance
              </span>
              <h3 className="text-sm font-bold text-[#1f1f1f]">
                {uploadedMandatory} of {totalMandatory} Required Attached
              </h3>
            </div>
            <span className="text-xs font-bold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-2.5 py-1 rounded-full">
              {progressPercent}% Complete
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-[#f1f3f4] rounded-full overflow-hidden border border-[#e0e3e7]">
            <div 
              className="h-full bg-gradient-to-r from-[#4285F4] to-[#34A853] rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>

          {/* Metrics Tiles */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-[#f8fafd] p-2.5 rounded-2xl border border-[#e0e3e7]">
              <span className="text-[10px] text-[#5f6368] font-semibold block">Total Checklist</span>
              <span className="font-bold text-[#1f1f1f] text-sm">{documents.length} / {documentTypes.length}</span>
            </div>
            <div className="bg-[#f8fafd] p-2.5 rounded-2xl border border-[#e0e3e7]">
              <span className="text-[10px] text-[#137333] font-semibold block">HR Approved</span>
              <span className="font-bold text-[#137333] text-sm">{verifiedCount} Verified</span>
            </div>
          </div>
        </div>

        {/* 3. Document Cards List */}
        <div className="space-y-3.5">
          {/* Special Offer Letter Card */}
          {specialDoc && (
            <MobileDocumentUploadCard 
              key={specialDoc.id}
              docType={specialDoc} 
              currentDoc={getDoc(specialDoc.id)} 
              onUpload={handleUpload}
              isUploading={uploadingType === specialDoc.id}
              onPreview={onPreview}
            />
          )}

          {/* Required Documents */}
          {requiredDocs.map(doc => (
            <MobileDocumentUploadCard 
              key={doc.id}
              docType={doc} 
              currentDoc={getDoc(doc.id)} 
              onUpload={handleUpload}
              isUploading={uploadingType === doc.id}
              onPreview={onPreview}
            />
          ))}

          {/* Optional Documents */}
          {optionalDocs.map(doc => (
            <MobileDocumentUploadCard 
              key={doc.id}
              docType={doc} 
              currentDoc={getDoc(doc.id)} 
              onUpload={handleUpload}
              isUploading={uploadingType === doc.id}
              onPreview={onPreview}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CandidateMobileDocuments;
