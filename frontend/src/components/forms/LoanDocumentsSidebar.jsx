import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
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
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 font-mono">
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

                {/* Submit & Cancel Footer matching AddLeadSidebar */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 h-10 px-4 py-2 transition-colors cursor-pointer border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors cursor-pointer shadow-sm"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ========================================================================= */}
          {/* 2. MOBILE VIEW: Bottom Sheet Popup above Nav Bar (Matching Profile Page)  */}
          {/* ========================================================================= */}
          <div className="md:hidden fixed inset-x-0 top-0 bottom-[100px] z-[100] flex flex-col justify-end overflow-hidden">
            {/* Mobile Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
            />

            {/* Mobile Bottom Sheet Popup */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-2xl h-[75dvh] max-h-[82dvh] flex flex-col overflow-hidden"
            >
              {/* Pull handle */}
              <div className="pt-3 pb-2 flex justify-center shrink-0">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full pointer-events-none" />
              </div>

              {/* Mobile Header */}
              <div className="px-5 pb-3 flex items-center justify-between border-b border-slate-100 shrink-0">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                      {appId}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {uploadedCount} of {photoSlots.length} photos
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Loan Member Photos
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Mobile Content: Photo Cards List */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain">
                {photoSlots.map((slot) => {
                  const uploadedDoc = documentsState[slot.key];
                  const isSlotBusy = isUploadingSlot === slot.key;
                  const Icon = slot.icon;

                  return (
                    <div 
                      key={slot.key}
                      className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs"
                    >
                      <div className="flex flex-col gap-2.5">
                        
                        {/* Member Info Row */}
                        <div className="flex items-center justify-between gap-2.5 min-w-0">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-xl ${uploadedDoc ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-400 border-slate-200'} border flex items-center justify-center shrink-0 shadow-2xs`}>
                              <Icon className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {slot.personName}
                              </h4>
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold border ${slot.badgeBg} mt-0.5`}>
                                {slot.relation}
                              </span>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="shrink-0">
                            {uploadedDoc ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 size={11} className="text-emerald-600" /> Uploaded
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Mobile Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                          {isSlotBusy ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg">
                              <Loader2 size={13} className="animate-spin" /> Uploading...
                            </div>
                          ) : uploadedDoc ? (
                            <div className="flex items-center gap-1.5">
                              {/* 1. Camera Input */}
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

                              {/* 2. Gallery Input */}
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
                                onClick={() => cameraInputRefs.current[slot.key]?.click()}
                                className="inline-flex items-center justify-center rounded-lg text-xs font-semibold bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 h-8 px-2.5 transition-colors gap-1 shadow-2xs"
                              >
                                <RefreshCw size={12} /> Retake
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(slot.key)}
                                className="inline-flex items-center justify-center rounded-lg text-xs font-semibold bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 h-8 w-8 transition-colors shadow-2xs"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {/* 1. Camera Input */}
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

                              {/* 2. Gallery Input */}
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

                              {/* Take Photo Camera Button */}
                              <button
                                type="button"
                                onClick={() => cameraInputRefs.current[slot.key]?.click()}
                                className="inline-flex items-center justify-center rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 h-8 px-3 transition-all gap-1.5 shadow-sm shadow-blue-600/20 active:scale-95"
                              >
                                <Camera size={13} /> Take Photo
                              </button>

                              {/* Gallery File Button */}
                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[slot.key]?.click()}
                                className="inline-flex items-center justify-center rounded-lg text-xs font-medium bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 h-8 px-2.5 transition-all shadow-2xs active:scale-95"
                                title="Gallery Upload"
                              >
                                <UploadCloud size={13} />
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}

                {/* Mobile Submit Button Inside Content */}
                <div className="pt-2 pb-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full inline-flex items-center justify-center rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 h-10 px-5 transition-all shadow-sm shadow-blue-600/20 active:scale-95 cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default LoanDocumentsSidebar;
