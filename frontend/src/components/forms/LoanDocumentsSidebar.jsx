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
  RefreshCw,
  Image as ImageIcon,
  Clock,
  Sparkles
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
    badgeBg: 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]'
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
      badgeBg: 'bg-[#f3e8fd] text-[#9333ea] border-[#e9d5ff]'
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
      badgeBg: 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
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
      badgeBg: 'bg-[#fef7e0] text-[#b06000] border-[#feefc3]'
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
      badgeBg: 'bg-[#fce8e6] text-[#c5221f] border-[#fad2cf]'
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
        const parts = doc.url.split('/Loan-Document/');
        if (parts.length > 1) {
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
          {/* 1. WEB / DESKTOP VIEW: Right Slide-Over Sidebar Drawer                     */}
          {/* ========================================================================= */}
          <div className="hidden md:block">
            {/* Desktop Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-[#1f1f1f]/30 backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Desktop Right Sidebar */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md sm:max-w-lg bg-white shadow-2xl z-50 flex flex-col border-l border-[#e0e3e7]"
            >
              {/* Google 4-Color Top Banner */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

              {/* Desktop Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#e0e3e7] bg-[#f8fafd] shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                      {appId}
                    </span>
                    <span className="text-xs text-[#5f6368] font-medium">
                      {uploadedCount} of {photoSlots.length} photos
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[#1f1f1f]">
                    Loan Application Photos
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-2 rounded-full transition-all cursor-pointer"
                >
                  <X size={18} />
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
                      className="bg-white border border-[#e0e3e7] rounded-2xl p-4 shadow-xs hover:border-[#dadce0] transition-all"
                    >
                      <div className="flex flex-col gap-3">
                        
                        {/* Person Info */}
                        <div className="flex items-center justify-between gap-3 min-w-0">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-xl ${uploadedDoc ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]' : 'bg-[#f8fafd] text-[#80868b] border-[#e0e3e7]'} border flex items-center justify-center shrink-0 shadow-2xs`}>
                              <Icon className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-[#1f1f1f] truncate">
                                {slot.personName}
                              </h4>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${slot.badgeBg} mt-0.5`}>
                                {slot.relation}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {uploadedDoc ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#137333] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#ceead6]">
                                <CheckCircle2 size={12} className="text-[#137333]" /> Uploaded
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#b06000] bg-[#fef7e0] px-2.5 py-0.5 rounded-full border border-[#feefc3] font-semibold">
                                <Clock size={11} /> Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Uploaded Photo Thumbnail Preview */}
                        {uploadedDoc && (
                          <div className="flex items-center gap-3 bg-[#f8fafd] p-2.5 rounded-xl border border-[#e0e3e7]">
                            <div className="w-14 h-16 rounded-lg overflow-hidden border border-[#dadce0] shrink-0 bg-white shadow-2xs">
                              <img
                                src={uploadedDoc.url}
                                alt={slot.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#1f1f1f] truncate">{slot.title}</p>
                              <p className="text-[11px] text-[#5f6368] truncate">Verified and linked to profile</p>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[#f1f3f4]">
                          {isSlotBusy ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] rounded-full border border-[#d2e3fc]">
                              <Loader2 size={13} className="animate-spin" /> Uploading...
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
                                onClick={() => fileInputRefs.current[slot.key]?.click()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-[#f1f3f4] border border-[#dadce0] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs"
                              >
                                <UploadCloud size={13} className="text-[#5f6368]" /> Replace
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(slot.key)}
                                className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#c5221f] hover:bg-[#fce8e6] border border-[#fad2cf] p-2 transition-all shadow-2xs cursor-pointer"
                                title="Delete Photo"
                              >
                                <Trash2 size={14} />
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
                                className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[#1a73e8] text-white hover:bg-[#1557b0] px-4 py-2 transition-all gap-1.5 shadow-xs cursor-pointer"
                              >
                                <UploadCloud size={14} /> Upload Photo
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
          {/* 2. MOBILE VIEW: Full-Screen Page Style                                    */}
          {/* ========================================================================= */}
          <div className="md:hidden fixed inset-0 z-[100] bg-[#f8fafd] overflow-y-auto pb-8">
            {/* Google Top Color Strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

            {/* Clean Mobile Header */}
            <div className="bg-white border-b border-[#e0e3e7] p-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-[#f1f3f4] text-[#1f1f1f] flex items-center justify-center transition-transform active:scale-95 border border-[#dadce0] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <p className="text-[10px] font-bold text-[#1a73e8] uppercase tracking-widest">
                  Origination Module
                </p>
                <h2 className="text-sm font-bold text-[#1f1f1f]">
                  Member Photos
                </h2>
              </div>
              <div className="w-9 h-9" />
            </div>

            {/* Page Content Cards */}
            <div className="p-4 space-y-3.5">
              {/* Summary / Progress Card */}
              <div className="bg-white p-4 rounded-2xl shadow-xs border border-[#e0e3e7] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider block">
                    Application ID
                  </span>
                  <p className="text-sm font-bold text-[#1f1f1f] font-sans">
                    {appId}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider block">
                    Progress
                  </span>
                  <p className="text-xs font-bold text-[#1a73e8]">
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
                    className="bg-white p-4 rounded-2xl shadow-xs border border-[#e0e3e7] space-y-3.5"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between border-b border-[#f1f3f4] pb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-xl ${
                            uploadedDoc
                              ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]'
                              : 'bg-[#f8fafd] text-[#80868b] border-[#e0e3e7]'
                          } border flex items-center justify-center shrink-0 shadow-2xs`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#1f1f1f] leading-tight">
                            {slot.personName}
                          </h4>
                          <span
                            className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold border ${slot.badgeBg} mt-0.5`}
                          >
                            {slot.relation}
                          </span>
                        </div>
                      </div>

                      <div>
                        {uploadedDoc ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#137333] bg-[#e6f4ea] px-2.5 py-0.5 rounded-full border border-[#ceead6]">
                            <CheckCircle2 size={11} className="text-[#137333]" /> Uploaded
                          </span>
                        ) : (
                          <span className="text-[10.5px] text-[#b06000] font-bold bg-[#fef7e0] px-2.5 py-0.5 rounded-full border border-[#feefc3]">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Uploaded Photo Preview */}
                    {uploadedDoc && (
                      <div className="flex items-center gap-3 bg-[#f8fafd] p-2.5 rounded-xl border border-[#e0e3e7]">
                        <div className="w-16 h-20 rounded-lg overflow-hidden border border-[#dadce0] shrink-0 bg-white shadow-2xs">
                          <img
                            src={uploadedDoc.url}
                            alt={slot.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 space-y-0.5 min-w-0">
                          <p className="text-xs font-bold text-[#1f1f1f]">{slot.title}</p>
                          <p className="text-[11px] text-[#5f6368] leading-relaxed">
                            Stored and attached to application record.
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
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f1f3f4]">
                      {isSlotBusy ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] rounded-full border border-[#d2e3fc]">
                          <Loader2 size={13} className="animate-spin" /> Uploading...
                        </div>
                      ) : uploadedDoc ? (
                        <>
                          <button
                            type="button"
                            onClick={() => cameraInputRefs.current[slot.key]?.click()}
                            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-3 py-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer gap-1"
                          >
                            <Camera size={13} className="text-[#5f6368]" /> Retake
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[slot.key]?.click()}
                            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-3 py-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer gap-1"
                          >
                            <UploadCloud size={13} className="text-[#5f6368]" /> Gallery
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(slot.key)}
                            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#c5221f] hover:bg-[#fce8e6] border border-[#fad2cf] p-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                            title="Delete Photo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => cameraInputRefs.current[slot.key]?.click()}
                            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-[#1a73e8] text-white hover:bg-[#1557b0] px-3.5 py-1.5 transition-all gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                          >
                            <Camera size={13} /> Take Photo
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[slot.key]?.click()}
                            className="inline-flex items-center justify-center rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] px-3 py-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer gap-1"
                            title="Gallery Upload"
                          >
                            <UploadCloud size={13} className="text-[#5f6368]" /> Gallery
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
