import React from 'react';
import { 
  FileText, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  Loader2, 
  UploadCloud, 
  Eye, 
  Lock,
  Layers,
  ShieldCheck,
  FileCheck
} from 'lucide-react';

const MobileDocumentRow = ({ docType, currentDoc, onUpload, isUploading, onPreview }) => {
  const getStatusBadge = () => {
    if (!currentDoc) {
      return docType.isRequired ? 
        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#fce8e6] text-[#c5221f] rounded-full border border-[#fad2cf] whitespace-nowrap shrink-0">Mandatory</span> :
        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#f1f3f4] text-[#5f6368] rounded-full border border-[#dadce0] whitespace-nowrap shrink-0">Optional</span>;
    }
    
    switch (currentDoc.status) {
      case 'verified':
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#e6f4ea] text-[#137333] rounded-full border border-[#ceead6] flex items-center gap-1 whitespace-nowrap shrink-0">
            <CheckCircle2 size={11} className="shrink-0" /> Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#fce8e6] text-[#c5221f] rounded-full border border-[#fad2cf] flex items-center gap-1 whitespace-nowrap shrink-0">
            <AlertCircle size={11} className="shrink-0" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#e8f0fe] text-[#1a73e8] rounded-full border border-[#d2e3fc] flex items-center gap-1 whitespace-nowrap shrink-0">
            <Loader2 size={11} className="animate-spin shrink-0" /> Under Review
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

  return (
    <div className="p-4 bg-white border-b last:border-b-0 border-[#f1f3f4] space-y-3">
      {/* Title & Status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className={`text-sm font-bold leading-tight ${docType.isSpecial ? 'text-[#1a73e8]' : 'text-[#1f1f1f]'}`}>
            {docType.label}
          </h4>
          {docType.description && (
            <p className="text-[11px] text-[#5f6368] mt-0.5 leading-snug">
              {docType.description}
            </p>
          )}
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {/* Uploaded File Chip / Upload Dropzone */}
      {currentDoc ? (
        <div className="flex items-center justify-between bg-[#f8fafd] p-2.5 rounded-xl border border-[#e0e3e7]">
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <div className="w-7 h-7 rounded-lg bg-[#fce8e6] text-[#c5221f] flex items-center justify-center shrink-0 border border-[#fad2cf]">
              <FileText size={14} />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-[#1f1f1f] truncate" title={currentDoc.file_name}>
                {currentDoc.file_name}
              </p>
              <p className="text-[10px] text-[#5f6368]">
                {new Date(currentDoc.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onPreview && onPreview({ ...currentDoc, docType })}
              className="p-1.5 rounded-lg bg-white border border-[#dadce0] text-[#1a73e8] hover:bg-[#e8f0fe] transition-all shadow-2xs"
              title="Preview Document"
            >
              <Eye size={14} />
            </button>

            {!isVerified ? (
              <label className="p-1.5 rounded-lg bg-white border border-[#dadce0] text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] cursor-pointer transition-all shadow-2xs" title="Replace PDF">
                {isUploading ? <Loader2 size={14} className="animate-spin text-[#1a73e8]" /> : <UploadCloud size={14} />}
                <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} disabled={isUploading} />
              </label>
            ) : (
              <span className="p-1.5 rounded-lg bg-[#e6f4ea] text-[#137333] border border-[#ceead6]" title="Document verified & locked">
                <Lock size={13} />
              </span>
            )}
          </div>
        </div>
      ) : (
        <label className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-[#dadce0] text-xs font-semibold transition-all ${
          isUploading ? 'bg-[#f8fafd] text-[#5f6368] cursor-not-allowed' : 'bg-[#f8fafd] text-[#1a73e8] hover:bg-[#e8f0fe] hover:border-[#1a73e8] cursor-pointer active:scale-[0.99]'
        }`}>
          {isUploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
          <span>{isUploading ? 'Uploading PDF...' : 'Tap to upload PDF'}</span>
          <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} disabled={isUploading} />
        </label>
      )}
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
    <div className="w-full px-4 py-4 space-y-4 md:hidden pb-32">
      {/* Onboarding KYC Progress Header Card */}
      <section className="bg-white rounded-2xl border border-[#e0e3e7] p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold text-[#1a73e8] uppercase tracking-wider">
              Onboarding Checklist
            </span>
            <h3 className="text-base font-bold text-[#1f1f1f]">
              Document Verification
            </h3>
          </div>
          <span className="text-xs font-bold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-1 rounded-full">
            {progressPercent}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-medium text-[#5f6368]">
            <span>Mandatory KYC</span>
            <span className="font-bold text-[#1f1f1f]">{uploadedMandatory} of {totalMandatory} Attached</span>
          </div>
          <div className="w-full h-2 bg-[#f1f3f4] rounded-full overflow-hidden border border-[#e0e3e7]">
            <div 
              className="h-full bg-gradient-to-r from-[#4285F4] to-[#34A853] rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#f1f3f4] text-xs">
          <div className="bg-[#f8fafd] p-2.5 rounded-xl border border-[#e0e3e7] flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#f3e8fd] text-[#8430ce] flex items-center justify-center shrink-0">
              <FileCheck size={14} />
            </div>
            <div>
              <span className="text-[10px] text-[#5f6368] block">Attached</span>
              <span className="font-bold text-[#1f1f1f] text-xs">{documents.length} of {documentTypes.length}</span>
            </div>
          </div>

          <div className="bg-[#f8fafd] p-2.5 rounded-xl border border-[#e0e3e7] flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#e6f4ea] text-[#137333] flex items-center justify-center shrink-0">
              <ShieldCheck size={14} />
            </div>
            <div>
              <span className="text-[10px] text-[#137333] block">Verified</span>
              <span className="font-bold text-[#137333] text-xs">{verifiedCount} Approved</span>
            </div>
          </div>
        </div>
      </section>

      {/* Special Offer Letter Section */}
      {specialDoc && (
        <section className="bg-white rounded-2xl border border-[#d2e3fc] shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-[#f8fafd] border-b border-[#e0e3e7] flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0 font-bold">
              <FileText size={14} />
            </div>
            <h3 className="text-xs font-bold text-[#1a73e8] uppercase tracking-wider">Offer Letter & Contract</h3>
          </div>
          <MobileDocumentRow 
            docType={specialDoc} 
            currentDoc={getDoc(specialDoc.id)} 
            onUpload={handleUpload}
            isUploading={uploadingType === specialDoc.id}
            onPreview={onPreview}
          />
        </section>
      )}

      {/* Required Documents Section */}
      <section className="bg-white rounded-2xl border border-[#e0e3e7] shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-[#f8fafd] border-b border-[#e0e3e7] flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#fce8e6] text-[#c5221f] flex items-center justify-center shrink-0 font-bold">
            <AlertCircle size={14} />
          </div>
          <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
            Mandatory KYC Documents ({requiredDocs.length})
          </h3>
        </div>
        <div className="divide-y divide-[#f1f3f4]">
          {requiredDocs.map(doc => (
            <MobileDocumentRow 
              key={doc.id}
              docType={doc} 
              currentDoc={getDoc(doc.id)} 
              onUpload={handleUpload}
              isUploading={uploadingType === doc.id}
              onPreview={onPreview}
            />
          ))}
        </div>
      </section>

      {/* Optional Documents Section */}
      {optionalDocs.length > 0 && (
        <section className="bg-white rounded-2xl border border-[#e0e3e7] shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-[#f8fafd] border-b border-[#e0e3e7] flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#f1f3f4] text-[#5f6368] flex items-center justify-center shrink-0 font-bold">
              <Info size={14} />
            </div>
            <h3 className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">
              Optional Supporting Documents ({optionalDocs.length})
            </h3>
          </div>
          <div className="divide-y divide-[#f1f3f4]">
            {optionalDocs.map(doc => (
              <MobileDocumentRow 
                key={doc.id}
                docType={doc} 
                currentDoc={getDoc(doc.id)} 
                onUpload={handleUpload}
                isUploading={uploadingType === doc.id}
                onPreview={onPreview}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CandidateMobileDocuments;
