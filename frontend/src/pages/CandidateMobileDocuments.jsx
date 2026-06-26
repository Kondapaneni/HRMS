import React from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertCircle, Info } from 'lucide-react';

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
          <div className="p-5 bg-slate-50">
            <DocumentUploadCard 
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
          <div className="p-5 space-y-4 bg-slate-50">
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

        {/* Optional Documents */}
        <section className="bg-white rounded-[24px] shadow-lg border border-slate-100/50 overflow-hidden relative">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <Info className="text-slate-400" size={20} />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Optional Documents</h2>
          </div>
          <div className="p-5 space-y-4 bg-slate-50">
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
    </div>
  );
};

export default CandidateMobileDocuments;
