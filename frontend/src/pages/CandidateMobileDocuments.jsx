import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowLeft, 
  UploadCloud, 
  Eye, 
  Lock, 
  Loader2 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const MobileDocumentUploadCard = ({ docType, currentDoc, onUpload, isUploading, onPreview }) => {
  const getStatusBadge = () => {
    if (!currentDoc) {
      return docType.isRequired ? 
        <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#FDE8EA] text-[#D64550] rounded-full border border-[#FCD0D4] whitespace-nowrap shrink-0">Required</span> :
        <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#EFEFF1] text-[#4A4A52] rounded-full border border-[#E3E3E7] whitespace-nowrap shrink-0">Optional</span>;
    }
    
    switch (currentDoc.status) {
      case 'verified':
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#E6F6EC] text-[#1F9D55] rounded-full border border-[#CEEAD6] flex items-center gap-1 whitespace-nowrap shrink-0">
            <CheckCircle2 size={12} className="shrink-0" /> Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#FDE8EA] text-[#D64550] rounded-full border border-[#FCD0D4] flex items-center gap-1 whitespace-nowrap shrink-0">
            <AlertCircle size={12} className="shrink-0" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#E8F0FB] text-[#3B6FB6] rounded-full border border-[#D2E3FC] flex items-center gap-1 whitespace-nowrap shrink-0">
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
    <div className={`bg-[var(--surface)] rounded-[20px] border ${docType.isSpecial ? 'border-[var(--accent-pink)]/30' : 'border-[var(--line)]'} p-4 sm:p-5 shadow-xs space-y-3`}>
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-[12px] ${
            docType.isSpecial 
              ? 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border border-[var(--accent-pink)]/20' 
              : docType.isRequired 
              ? 'bg-[var(--brand-tint)] text-[var(--brand-deep)] border border-[var(--brand)]/20' 
              : 'bg-[var(--surface-alt)] text-[var(--muted)] border border-[var(--line)]'
          } flex items-center justify-center font-bold text-xs shrink-0`}>
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text)] leading-snug truncate">
              {docType.label}
            </h3>
            <span className="text-[11px] text-[var(--muted)] font-medium block mt-0.5">
              {docType.category}
            </span>
          </div>
        </div>
        <div className="shrink-0">{getStatusBadge()}</div>
      </div>

      {/* Description */}
      {docType.description && (
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          {docType.description}
        </p>
      )}

      {/* Uploaded Document Info Box */}
      {currentDoc && (
        <div className="bg-[var(--surface-alt)] rounded-[12px] border border-[var(--line)] p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0 border border-[var(--brand)]/20">
              <FileText size={15} />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-[var(--text)] truncate" title={currentDoc.file_name}>
                {currentDoc.file_name}
              </p>
              <p className="text-[10px] text-[var(--muted)]">
                Uploaded {new Date(currentDoc.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onPreview && onPreview({ ...currentDoc, docType })}
            className="p-2 rounded-[8px] bg-[var(--surface)] border border-[var(--line)] text-[var(--brand-deep)] hover:bg-[var(--line)]/50 transition-all shrink-0 cursor-pointer"
            title="Preview Document"
          >
            <Eye size={15} />
          </button>
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-2 border-t border-[var(--line)]">
        {currentDoc ? (
          isVerified ? (
            <div className="w-full h-10 rounded-full border border-[#CEEAD6] bg-[#E6F6EC] text-[#1F9D55] font-semibold text-xs flex items-center justify-center gap-1.5">
              <Lock size={13} />
              <span>Verified by HR &bull; Locked</span>
            </div>
          ) : (
            <label className={`w-full h-10 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)]/50 text-[var(--text)] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isUploading ? 'opacity-70 cursor-not-allowed' : ''
            }`}>
              {isUploading ? (
                <>
                  <Loader2 size={15} className="animate-spin text-[var(--brand-deep)]" />
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
          <label className={`w-full h-10 rounded-full border border-dashed border-[var(--brand)] bg-[var(--brand-tint)]/40 hover:bg-[var(--brand-tint)] text-[var(--brand-deep)] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isUploading ? 'opacity-70 cursor-not-allowed' : ''
          }`}>
            {isUploading ? (
              <>
                <Loader2 size={15} className="animate-spin text-[var(--brand-deep)]" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadCloud size={15} />
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
    <div className="space-y-4 pb-28 antialiased select-none font-sans md:hidden">
      {/* Header */}
      <section className="px-4 pt-4 pb-2">
        <p className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Sparkles size={12} className="text-[var(--accent-pink-deep)]" />
          Onboarding KYC • Candidate Portal
        </p>

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight">
            Documents
          </h2>

          <Link
            to="/candidate/applications"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--text)] text-xs font-semibold border border-[var(--line)] transition-all shadow-xs shrink-0"
          >
            <ArrowLeft size={13} />
            <span>Applications</span>
          </Link>
        </div>

        <p className="text-xs sm:text-sm font-medium text-[var(--muted)] mt-1">
          {documents.length} of {documentTypes.length} uploaded &bull; {verifiedCount} Verified by HR
        </p>
      </section>

      {/* Floating Overview Progress Card */}
      <div className="px-4 space-y-3.5">
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold text-[var(--brand-deep)] uppercase tracking-wider block">
                Mandatory Compliance
              </span>
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {uploadedMandatory} of {totalMandatory} Required Attached
              </h3>
            </div>
            <span className="text-xs font-semibold text-[#1F9D55] bg-[#E6F6EC] border border-[#CEEAD6] px-2.5 py-0.5 rounded-full">
              {progressPercent}% Complete
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-[var(--surface-alt)] rounded-full overflow-hidden border border-[var(--line)]">
            <div 
              className="h-full bg-[var(--brand-deep)] rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>

          {/* Metrics Tiles */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-[var(--surface-alt)] p-2.5 rounded-[12px] border border-[var(--line)]">
              <span className="text-[10px] text-[var(--muted)] font-semibold block">Total Checklist</span>
              <span className="font-semibold text-[var(--text)] text-sm">{documents.length} / {documentTypes.length}</span>
            </div>
            <div className="bg-[var(--surface-alt)] p-2.5 rounded-[12px] border border-[var(--line)]">
              <span className="text-[10px] text-[#1F9D55] font-semibold block">HR Approved</span>
              <span className="font-semibold text-[#1F9D55] text-sm">{verifiedCount} Verified</span>
            </div>
          </div>
        </div>

        {/* Document Cards List */}
        <div className="space-y-3.5">
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
