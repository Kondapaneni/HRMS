import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Camera, 
  Save, 
  FileText, 
  UploadCloud, 
  User, 
  Briefcase, 
  Phone, 
  MapPin, 
  Mail, 
  Trash2, 
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import api from '../api/axios';
import CandidateMobileProfile from './CandidateMobileProfile';

const CandidateProfile = () => {
  const { profile } = useAuth();
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    email: profile?.email || '',
    phone: '',
    address: '',
    currentTitle: '',
    experience: '',
    resumes: [],
    avatarUrl: profile?.avatar || ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const queryClient = useQueryClient();

  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['candidate', 'profile', profile?.id],
    queryFn: async () => {
      const res = await api.get('/candidate/profile');
      return res.data.profile || null;
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000
  });

  useEffect(() => {
    if (profileData) {
      setFormData(prev => ({
        ...prev,
        phone: profileData.phone || '',
        address: profileData.address || '',
        currentTitle: profileData.current_title || '',
        experience: profileData.experience || '',
        resumes: Array.isArray(profileData.resume_url) ? profileData.resume_url : [],
        avatarUrl: profileData.avatar_url || prev.avatarUrl
      }));
    }
  }, [profileData]);

  const saveMutation = useMutation({
    mutationFn: async (updatedData) => {
      await api.put('/candidate/profile', {
        phone: updatedData.phone,
        address: updatedData.address,
        currentTitle: updatedData.currentTitle,
        experience: updatedData.experience,
        resumes: updatedData.resumes,
        avatar: updatedData.avatarUrl
      });
    },
    onSuccess: () => {
      toast.success('Candidate profile updated successfully!');
      queryClient.invalidateQueries(['candidate', 'profile']);
      queryClient.invalidateQueries(['candidate', 'dashboard']);
    },
    onError: (error) => {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    }
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!profile?.id) {
      toast.error('You must be logged in to save your profile.');
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (formData.resumes.length >= 3) {
        toast.error('You can only upload a maximum of 3 resumes.');
        return;
      }
      
      setIsUploadingResume(true);

      try {
        const fileExt = file.name.split('.').pop();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
        const fileName = `Resume-${profile.id}-${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const proxyUrl = window.location.origin + "/Resume/" + fileName;

        const newResume = {
          name: file.name,
          url: proxyUrl,
          isPrimary: formData.resumes.length === 0
        };

        const newResumes = [...formData.resumes, newResume];
        setFormData(prev => {
          const newData = { ...prev, resumes: newResumes };
          saveMutation.mutate(newData);
          return newData;
        });
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload resume file.');
      } finally {
        setIsUploadingResume(false);
      }
    }
  };

  const handleSetPrimaryResume = (index) => {
    const updated = formData.resumes.map((r, i) => ({ ...r, isPrimary: i === index }));
    setFormData(prev => ({ ...prev, resumes: updated }));
    saveMutation.mutate({ ...formData, resumes: updated });
  };

  const handleDeleteResume = (index) => {
    const updatedResumes = formData.resumes.filter((_, i) => i !== index);
    if (updatedResumes.length > 0 && formData.resumes[index].isPrimary) {
      updatedResumes[0].isPrimary = true;
    }
    setFormData(prev => ({ ...prev, resumes: updatedResumes }));
    saveMutation.mutate({ ...formData, resumes: updatedResumes });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `candidate-${profile?.id || 'avatar'}-${Math.random()}.${fileExt}`;

      if (formData.avatarUrl) {
        const parts = formData.avatarUrl.split('/Avatar/');
        if (parts.length > 1) {
          const oldStoragePath = parts[1];
          await supabase.storage.from('avatars').remove([oldStoragePath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const proxyUrl = window.location.origin + "/Avatar/" + fileName;

      setFormData(prev => {
        const newData = { ...prev, avatarUrl: proxyUrl };
        saveMutation.mutate(newData);
        return newData;
      });
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      toast.error('Failed to upload profile picture');
      console.error(error);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (isLoadingProfile && !profileData) {
    return <PageLoader message="Loading Profile..." />;
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <CandidateMobileProfile 
          formData={formData}
          handleInputChange={handleInputChange}
          handleSave={handleSave}
          handleAvatarUpload={handleAvatarUpload}
          isUploadingAvatar={isUploadingAvatar}
          isUploadingResume={isUploadingResume}
          handleFileUpload={handleFileUpload}
          handleSetPrimaryResume={handleSetPrimaryResume}
          handleDeleteResume={handleDeleteResume}
        />
      </div>

      {/* Web Desktop View */}
      <div className="space-y-6 hidden md:block pb-12 antialiased">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] border border-[var(--accent-pink)]/20">
                Candidate Account
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight flex items-center gap-2.5">
              <span>My Profile &amp; Resumes</span>
              <span className="text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] border border-[var(--brand)]/20 px-2.5 py-0.5 rounded-full">
                Workspace Profile
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
              Keep your contact information, experience, and resumes updated for recruitment applications.
            </p>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
          {/* Left Column: Personal Details & Avatar */}
          <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-6 shadow-xs space-y-6 self-start">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                  <User size={16} />
                </div>
                <h2 className="text-base font-semibold text-[var(--text)]">Personal Information</h2>
              </div>
            </div>

            {/* Avatar Uploader (Rounded Square per Ronas IT Guidelines) */}
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative group cursor-pointer shrink-0">
                <div className="w-24 h-24 rounded-[20px] bg-[var(--brand-tint)] border border-[var(--line)] shadow-xs overflow-hidden text-2xl font-bold text-[var(--brand-deep)] flex items-center justify-center relative">
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Candidate Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span>{formData.firstName?.charAt(0) || 'C'}</span>
                  )}
                  
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-all rounded-[20px]">
                    {isUploadingAvatar ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      <>
                        <Camera className="h-5 w-5 mb-0.5" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Change</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                          disabled={isUploadingAvatar}
                        />
                      </>
                    )}
                  </label>
                </div>
              </div>
              <p className="text-[11px] text-[var(--muted)] text-center max-w-xs">
                Click on the avatar to upload a professional profile image.
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full h-10 px-4 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full h-10 px-4 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="w-full h-10 pl-11 pr-4 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs text-[var(--muted)] cursor-not-allowed outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full h-10 pl-11 pr-4 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Address / Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                  <input
                    type="text"
                    name="address"
                    placeholder="City, State, Country"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full h-10 pl-11 pr-4 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Professional Details & Resume Locker */}
          <div className="space-y-6">
            {/* Professional Details Card */}
            <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                    <Briefcase size={16} />
                  </div>
                  <h2 className="text-base font-semibold text-[var(--text)]">Professional Background</h2>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Current Job Title</label>
                  <input
                    type="text"
                    name="currentTitle"
                    placeholder="e.g. Senior Frontend Engineer"
                    value={formData.currentTitle}
                    onChange={handleInputChange}
                    className="w-full h-10 px-4 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Years of Experience</label>
                  <select
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className="w-full h-10 px-4 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:border-[var(--brand)] transition-all outline-none cursor-pointer"
                  >
                    <option value="" disabled>Select experience range</option>
                    <option value="0-1">0-1 years (Entry Level)</option>
                    <option value="1-3">1-3 years (Junior)</option>
                    <option value="3-5">3-5 years (Mid-Level)</option>
                    <option value="5-10">5-10 years (Senior)</option>
                    <option value="10+">10+ years (Lead / Principal)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Resumes Locker Card */}
            <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[10px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <h2 className="text-base font-semibold text-[var(--text)]">Attached Resumes</h2>
                </div>
                <span className="text-xs font-semibold text-[var(--muted)] bg-[var(--surface-alt)] border border-[var(--line)] px-2.5 py-0.5 rounded-full">
                  {formData.resumes.length} / 3 Uploaded
                </span>
              </div>

              {formData.resumes.length > 0 && (
                <div className="space-y-3">
                  {formData.resumes.map((resume, index) => (
                    <div 
                      key={index} 
                      className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-[16px] border transition-all ${
                        resume.isPrimary ? 'bg-[var(--brand-tint)]/40 border-[var(--brand)]/30' : 'bg-[var(--surface-alt)] border-[var(--line)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-[10px] bg-[var(--surface)] text-[var(--brand-deep)] flex items-center justify-center shrink-0 border border-[var(--line)] shadow-xs">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--text)] truncate">{resume.name}</p>
                          <a 
                            href={resume.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-[11px] font-semibold text-[var(--brand-deep)] hover:underline inline-flex items-center gap-1 mt-0.5"
                          >
                            <span>Preview document</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]">
                          <input 
                            type="radio" 
                            name="primaryResume" 
                            checked={resume.isPrimary} 
                            onChange={() => handleSetPrimaryResume(index)} 
                            className="w-4 h-4 text-[var(--brand)] focus:ring-[var(--brand)] border-[var(--line)]"
                          />
                          <span>Primary</span>
                        </label>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteResume(index)} 
                          className="w-8 h-8 rounded-full text-[#D64550] hover:bg-[#FDE8EA] flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete resume"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {formData.resumes.length < 3 && (
                <div className="rounded-[16px] border-2 border-dashed border-[var(--line)] p-8 text-center bg-[var(--surface-alt)] hover:bg-[var(--surface-alt)]/80 transition-colors relative">
                  {isUploadingResume && (
                    <div className="absolute inset-0 bg-[var(--surface)]/80 backdrop-blur-xs flex flex-col items-center justify-center rounded-[16px] z-10">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[var(--brand-deep)] mb-2" />
                      <span className="text-xs font-semibold text-[var(--brand-deep)]">Uploading Resume...</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
                    onChange={handleFileUpload}
                    disabled={isUploadingResume}
                  />
                  <UploadCloud className="mx-auto h-8 w-8 text-[var(--brand-deep)] mb-2" />
                  <p className="text-xs font-semibold text-[var(--text)]">Click to upload a new resume</p>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5">Supports PDF, DOC, DOCX (Max 5MB)</p>
                </div>
              )}
            </div>

            {/* Save Action Bar */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 px-8 py-2.5 rounded-full bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white text-xs font-semibold tracking-wide transition-all shadow-xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <Save size={15} />
                <span>{saveMutation.isPending ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default CandidateProfile;
