import React from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertCircle, Info, CheckCircle2, Loader2, UploadCloud, Eye } from 'lucide-react';

const MobileDocumentUploadCard = ({ docType, currentDoc, onUpload, isUploading }) => {
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
        return <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-600 rounded-lg flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Pending</span>;
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(docType.id, e.target.files[0]);
    }
  };

  return (
    <div className={`p-4 bg-white border-b last:border-b-0 border-slate-100`}>
       <div className="flex justify-between items-start mb-2">
         <h3 className={`text-sm font-bold leading-tight pr-2 ${docType.isSpecial ? 'text-indigo-700' : 'text-slate-800'}`}>{docType.label}</h3>
         <div>{getStatusBadge()}</div>
       </div>
       {docType.description && <p className="text-[11px] text-slate-500 mb-3">{docType.description}</p>}
       
       {currentDoc ? (
          <div className="flex items-center justify-between mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 overflow-hidden">
               <FileText size={16} className="text-rose-500 shrink-0" />
               <p className="text-[11px] font-medium text-slate-600 truncate">{currentDoc.file_name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={currentDoc.file_url || currentDoc.file_path} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-600 bg-blue-100 rounded-lg">
                <Eye size={14} />
              </a>
              {currentDoc.status !== 'verified' && (
                <label className="p-1.5 text-indigo-600 bg-indigo-100 rounded-lg cursor-pointer">
                  <UploadCloud size={14} />
                  <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>
          </div>
       ) : (
          <label className={`mt-2 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-xs font-semibold transition-all ${isUploading ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-slate-50 text-indigo-600 cursor-pointer active:bg-slate-100'}`}>
             {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
             {isUploading ? 'Uploading...' : 'Tap to upload PDF'}
             <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} disabled={isUploading} />
          </label>
       )}
    </div>
  );
};

const CandidateMobileDocuments = ({
  documents, uploadingType, handleUpload, documentTypes, DocumentUploadCard, specialDoc, requiredDocs, optionalDocs, getDoc
}) => {
  return (
    <div className="space-y-6 pb-2 md:hidden">
      {/* Hero Section with Animated Motion Graphics (Teal/Indigo Theme) */}
      <section className="-mx-4 -mt-6 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-teal-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2">
          <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">Onboarding</p>
          <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Documents</h2>
          <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">{documents.length} files uploaded</p>
        </div>
      </section>

      {/* Content Section */}
      <div className="space-y-6 px-1 pb-6 -mt-12 relative z-20">
        
        {/* Special Offer Letter Section */}
        <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <FileText className="text-indigo-600" size={20} />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Offer Letter</h2>
          </div>
          <div className="flex flex-col bg-slate-50">
            <MobileDocumentUploadCard 
              docType={specialDoc} 
              currentDoc={getDoc(specialDoc.id)} 
              onUpload={handleUpload}
              isUploading={uploadingType === specialDoc.id}
            />
          </div>
        </section>

        {/* Required Documents */}
        <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <AlertCircle className="text-amber-500" size={20} />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Required Documents</h2>
          </div>
          <div className="flex flex-col bg-slate-50">
            {requiredDocs.map(doc => (
              <MobileDocumentUploadCard 
                key={doc.id}
                docType={doc} 
                currentDoc={getDoc(doc.id)} 
                onUpload={handleUpload}
                isUploading={uploadingType === doc.id}
              />
            ))}
          </div>
        </section>

        {/* Optional Documents */}
        <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <Info className="text-slate-400" size={20} />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Optional Documents</h2>
          </div>
          <div className="flex flex-col bg-slate-50">
            {optionalDocs.map(doc => (
              <MobileDocumentUploadCard 
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
    </div>
  );
};

export default CandidateMobileDocuments;
