import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft,
  X, 
  Camera, 
  UploadCloud, 
  CheckCircle2, 
  Trash2, 
  Loader2, 
  User, 
  Users, 
  Shield, 
  RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { saveLoanDocuments, deleteLoanDocument } from '../../services/loanServices';
import toast from 'react-hot-toast';

export function LoanDocumentsSidebar({ 
  isOpen, 
  onClose, 
  formData = {}, 
  application = {}, 
  onDocumentsUpdated 
}) {
  const [isUploadingSlot, setIsUploadingSlot] = useState(null);
  const [documentsState, setDocumentsState] = useState(
    formData.documents || application.documents || application.form_data?.documents || {}
  );

  const fileInputRefs = useRef({});
  const cameraInputRefs = useRef({});

  const appId = application.application_id || formData.application_id || 'LA-DRAFT';
  const targetId = application.id || appId;

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('hide-mobile-nav');
    } else {
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => {
      document.body.classList.remove('hide-mobile-nav');
    };
  }, [isOpen]);

  // ── Predefined Photo Slots dynamically computed from form data ──
  const photoSlots = [];

  // 1. Applicant Photo (Always present)
  photoSlots.push({
    key: 'applicant_photo',
    title: 'Applicant Photo',
    personName: formData.applicant_name || 'Primary Applicant',
    relation: 'Applicant',
    icon: User,
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200'
  });

  // 2. Co-Applicant Photo (Only if Co-Applicant exists)
  const hasCoApplicant = 
    formData.has_co_applicant === 'Yes' || 
    (formData.co_applicant_name && String(formData.co_applicant_name).trim() !== '');

  if (hasCoApplicant) {
    photoSlots.push({
      key: 'co_applicant_photo',
      title: 'Co-Applicant Photo',
      personName: formData.co_applicant_name || 'Co-Applicant',
      relation: formData.co_relation_with_applicant ? `Relation: ${formData.co_relation_with_applicant}` : 'Co-Applicant',
      icon: Users,
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200'
    });
  }

  // 3. Guarantor 1 Photo (If Guarantor 1 is filled)
  if (formData.guarantor_1_name && String(formData.guarantor_1_name).trim() !== '') {
    photoSlots.push({
      key: 'guarantor_1_photo',
      title: 'Guarantor 1 Photo',
      personName: formData.guarantor_1_name,
      relation: 'Guarantor 1',
      icon: Shield,
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    });
  }

  // 4. Guarantor 2 Photo (If Guarantor 2 is filled)
  if (formData.guarantor_2_name && String(formData.guarantor_2_name).trim() !== '') {
    photoSlots.push({
      key: 'guarantor_2_photo',
      title: 'Guarantor 2 Photo',
      personName: formData.guarantor_2_name,
      relation: 'Guarantor 2',
      icon: Shield,
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200'
    });
  }

  // 5. Guarantor 3 Photo (If Guarantor 3 is filled)
  if (formData.guarantor_3_name && String(formData.guarantor_3_name).trim() !== '') {
    photoSlots.push({
      key: 'guarantor_3_photo',
      title: 'Guarantor 3 Photo',
      personName: formData.guarantor_3_name,
      relation: 'Guarantor 3',
      icon: Shield,
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200'
    });
  }

  // ── Handle File Upload (Camera or File Picker) ──
  const handleUploadFile = async (slotKey, file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPEG, PNG, WEBP).');
      return;
    }

    try {
      setIsUploadingSlot(slotKey);

      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanSlotName = slotKey.replace(/_/g, '-');
      const fileName = `${appId}_${cleanSlotName}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // 1. Remove old photo from Supabase if exists
      const currentDoc = documentsState[slotKey];
      if (currentDoc && currentDoc.url) {
        const parts = currentDoc.url.split('/Loan-Document/');
        if (parts.length > 1) {
          const oldStoragePath = parts[1];
          try {
            await supabase.storage.from('loan_documents').remove([oldStoragePath]);
          } catch (e) {
            console.warn('Could not remove old file from Supabase:', e);
          }
        }
      }

      // 2. Upload new photo to Supabase storage bucket 'loan_documents'
      const { error: uploadError } = await supabase.storage
        .from('loan_documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload photo to storage.');
      }

      // 3. Construct proxy URL matching avatar pattern in EmployeeProfile.jsx
      const documentUrl = window.location.origin + "/Loan-Document/" + fileName;

      const docRecord = {
        url: documentUrl,
        slot_key: slotKey
      };

      const updatedDocs = {
        ...documentsState,
        [slotKey]: docRecord
      };

      // 4. Persist in database
      await saveLoanDocuments(targetId, { [slotKey]: docRecord });

      setDocumentsState(updatedDocs);
      if (onDocumentsUpdated) {
        onDocumentsUpdated(updatedDocs);
      }

      toast.success('Photo uploaded successfully!');
    } catch (err) {
      console.error('Error uploading photo:', err);
      toast.error(err.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingSlot(null);
    }
  };

  // ── Handle Delete Photo ──
  const handleDeletePhoto = async (slotKey) => {
    const doc = documentsState[slotKey];
    if (!doc) return;

    if (!window.confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      setIsUploadingSlot(slotKey);

      // 1. Remove from Supabase storage
      if (doc.file_name) {
        await supabase.storage.from('loan_documents').remove([doc.file_name]);
      } else if (doc.url) {
        const parts = doc.url.split('/loan_documents/');
        if (parts[1]) {
          await supabase.storage.from('loan_documents').remove([parts[1]]);
        }
      }

      // 2. Delete from DB
      await deleteLoanDocument(targetId, slotKey);

      const nextDocs = { ...documentsState };
      delete nextDocs[slotKey];

      setDocumentsState(nextDocs);
      if (onDocumentsUpdated) {
        onDocumentsUpdated(nextDocs);
      }

      toast.success('Photo removed successfully.');
    } catch (err) {
      console.error('Error deleting photo:', err);
      toast.error(err.message || 'Failed to delete photo.');
    } finally {
      setIsUploadingSlot(null);
    }
  };

  const uploadedCount = photoSlots.filter(s => !!documentsState[s.key]?.url).length;

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ========================================================================= */}
          {/* 1. WEB / DESKTOP VIEW: Right Slide-Over Sidebar Drawer (hidden on mobile)  */}
          {/* ========================================================================= */}
          <div className="hidden md:block">
            {/* Desktop Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Desktop Right Sidebar (Matching AddLeadSidebar) */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md sm:max-w-lg bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
            >
              {/* Desktop Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 font-sans">
                      {appId}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {uploadedCount} of {photoSlots.length} photos
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Loan Application Photos
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Desktop Content: Photo Cards */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 hide-scrollbar">
                {photoSlots.map((slot) => {
                  const uploadedDoc = documentsState[slot.key];
                  const isSlotBusy = isUploadingSlot === slot.key;
                  const Icon = slot.icon;

                  return (
                    <div 
                      key={slot.key}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-all"
                    >
                      <div className="flex flex-col gap-3">
                        
                        {/* Person Info */}
                        <div className="flex items-center justify-between gap-3 min-w-0">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-xl ${uploadedDoc ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'} border flex items-center justify-center shrink-0 shadow-2xs`}>
                              <Icon className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {slot.personName}
                              </h4>
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold border ${slot.badgeBg} mt-0.5`}>
                                {slot.relation}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {uploadedDoc ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 size={12} className="text-emerald-600" /> Uploaded
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                          {isSlotBusy ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg">
                              <Loader2 size={14} className="animate-spin" /> Uploading...
                            </div>
                          ) : uploadedDoc ? (
                            <>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className="hidden"
                                ref={(el) => (fileInputRefs.current[slot.key] = el)}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleUploadFile(slot.key, e.target.files[0]);
                                    e.target.value = '';
                                  }
                                }}
                              />

                              <button
                                type="button"
                                onClick={() => {
                                  if (fileInputRefs.current[slot.key]) {
                                    fileInputRefs.current[slot.key].click();
                                  }
                                }}
                                className="inline-flex items-center justify-center rounded-lg text-xs font-semibold bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 h-8 px-3 transition-colors gap-1 shadow-2xs cursor-pointer"
                                title="Replace Photo"
                              >
                                <RefreshCw size={13} /> Replace
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(slot.key)}
                                className="inline-flex items-center justify-center rounded-lg text-xs font-semibold bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 h-8 w-8 transition-colors shadow-2xs cursor-pointer"
                                title="Delete Photo"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className="hidden"
                                ref={(el) => (fileInputRefs.current[slot.key] = el)}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleUploadFile(slot.key, e.target.files[0]);
                                    e.target.value = '';
                                  }
                                }}
                              />

                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[slot.key]?.click()}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 transition-colors gap-2 shadow-sm cursor-pointer"
                              >
                                <UploadCloud size={16} /> Upload Photo
                              </button>
                            </>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}

              </div>
            </motion.div>
          </div>

          {/* ========================================================================= */}
          {/* 2. MOBILE VIEW: Full-Screen Page Style (Matching EditMobileProfile.jsx)   */}
          {/* ========================================================================= */}
          <div className="md:hidden fixed inset-0 z-[100] bg-slate-50 overflow-y-auto pb-6">
            {/* Animated Hero Header */}
            <div className="relative px-6 pt-12 pb-24 rounded-b-[40px] overflow-hidden bg-slate-900 shadow-md">
              {/* Animated Liquid Background Blobs */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  x: [0, 50, 0],
                  y: [0, 30, 0],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-20 -left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
              />
              <motion.div
                animate={{
                  scale: [1, 1.4, 1],
                  x: [0, -40, 0],
                  y: [0, 50, 0],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
              />
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  x: [0, 30, 0],
                  y: [0, -40, 0],
                }}
                transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                className="absolute bottom-0 left-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
              />

              {/* Glass Overlay */}
              <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between px-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 border border-white/20 cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">
                    Origination Module
                  </p>
                  <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-sm">
                    Loan Member Photos
                  </h2>
                </div>
                <div className="w-10 h-10" />
              </div>
            </div>

            {/* Page Content Cards */}
            <div className="space-y-4 relative z-20 -mt-12 mx-4">
              {/* Summary / Progress Card */}
              <div className="bg-white p-5 rounded-[24px] shadow-lg border border-slate-100/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Application ID
                  </span>
                  <p className="text-base font-bold text-slate-800 font-sans tracking-tight">
                    {appId}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Progress
                  </span>
                  <p className="text-xs font-bold text-blue-600">
                    {uploadedCount} of {photoSlots.length} uploaded
                  </p>
                </div>
              </div>

              {/* Member Photo Slots Cards */}
              {photoSlots.map((slot) => {
                const uploadedDoc = documentsState[slot.key];
                const isSlotBusy = isUploadingSlot === slot.key;
                const Icon = slot.icon;

                return (
                  <div
                    key={slot.key}
                    className="bg-white p-5 rounded-[24px] shadow-lg border border-slate-100/80 space-y-4"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl ${
                            uploadedDoc
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          } border flex items-center justify-center shrink-0 shadow-inner`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {slot.personName}
                          </h4>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${slot.badgeBg} mt-1`}
                          >
                            {slot.relation}
                          </span>
                        </div>
                      </div>

                      <div>
                        {uploadedDoc ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 size={12} className="text-emerald-600" /> Uploaded
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Uploaded Photo Preview */}
                    {uploadedDoc && (
                      <div className="flex items-center gap-4 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                        <div className="w-20 h-24 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-white shadow-xs">
                          <img
                            src={uploadedDoc.url}
                            alt={slot.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-xs font-bold text-slate-800">{slot.title}</p>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Photo successfully stored and attached to application record.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Hidden Inputs */}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      ref={(el) => (cameraInputRefs.current[slot.key] = el)}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadFile(slot.key, e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      ref={(el) => (fileInputRefs.current[slot.key] = el)}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadFile(slot.key, e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                      {isSlotBusy ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg">
                          <Loader2 size={14} className="animate-spin" /> Uploading...
                        </div>
                      ) : uploadedDoc ? (
                        <>
                          <button
                            type="button"
                            onClick={() => cameraInputRefs.current[slot.key]?.click()}
                            className="inline-flex items-center justify-center rounded-lg text-xs font-semibold bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 h-8 px-3 transition-colors gap-1 shadow-2xs active:scale-95 cursor-pointer"
                          >
                            <RefreshCw size={13} /> Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(slot.key)}
                            className="inline-flex items-center justify-center rounded-lg text-xs font-semibold bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 h-8 w-8 transition-colors shadow-2xs active:scale-95 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[slot.key]?.click()}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 transition-colors gap-2 shadow-sm active:scale-95 cursor-pointer"
                          >
                            <UploadCloud size={16} /> Upload Photo
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}


            </div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default LoanDocumentsSidebar;
