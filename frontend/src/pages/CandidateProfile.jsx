import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Save, FileText, UploadCloud } from 'lucide-react';
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
    bio: '',
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
        bio: profileData.bio || '',
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
        bio: updatedData.bio,
        resumes: updatedData.resumes,
        avatar: updatedData.avatarUrl
      });
    },
    onSuccess: () => {
      toast.success('Profile saved successfully!');
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
        const fileName = `Resume-${Date.now()}-${safeName}`;

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
        toast.error('Failed to Upload Resume!');
      } finally {
        setIsUploadingResume(false);
      }
    }
  };

  const handleSetPrimaryResume = (index) => {
    setFormData(prev => ({
      ...prev,
      resumes: prev.resumes.map((r, i) => ({ ...r, isPrimary: i === index }))
    }));
  };

  const handleDeleteResume = (index) => {
    const updatedResumes = formData.resumes.filter((_, i) => i !== index);
    if (updatedResumes.length > 0 && formData.resumes[index].isPrimary) {
      updatedResumes[0].isPrimary = true;
    }
    setFormData(prev => ({ ...prev, resumes: updatedResumes }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `candidate-${profile?.id || 'avatar'}-${Math.random()}.${fileExt}`;

      // Delete old avatar if it exists
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
      toast.success('Profile picture uploaded successfully!');
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
      <div className="space-y-6 hidden md:block">
        {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your personal information and resume to speed up applications.</p>
      </div>

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* Left Column: Personal Information */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm self-start">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Personal Information</h2>
          </div>
          <div className="p-6 space-y-5">
            {/* Avatar section */}
            <div className="flex flex-col items-center gap-4 pb-4">
              <div className="relative group cursor-pointer shrink-0">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden text-2xl font-medium text-slate-600 relative">
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span>{formData.firstName?.charAt(0) || 'C'}</span>
                  )}
                  <label className="absolute inset-0 bg-black/50 hidden group-hover:flex flex-col items-center justify-center text-white cursor-pointer transition-all">
                    {isUploadingAvatar ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Camera className="h-6 w-6 mb-1" />
                        <span className="text-[10px] font-medium uppercase tracking-wider">Upload</span>
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
              <p className="text-sm text-slate-500 text-center">Click the avatar to upload a professional photo.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="flex h-10 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Address / Location</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Professional Details & Resumes */}
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Professional Details</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Current Job Title</label>
                  <input
                    type="text"
                    name="currentTitle"
                    value={formData.currentTitle}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Years of Experience</label>
                  <select
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  >
                    <option value="" disabled>Select experience level</option>
                    <option value="0-1">0-1 years (Entry Level)</option>
                    <option value="1-3">1-3 years (Junior)</option>
                    <option value="3-5">3-5 years (Mid-Level)</option>
                    <option value="5-10">5-10 years (Senior)</option>
                    <option value="10+">10+ years (Lead/Principal)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Professional Summary</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={5}
                  className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Resumes ({formData.resumes.length}/3)</h2>
            </div>
            <div className="p-6 space-y-5">
              {formData.resumes.length > 0 && (
                <div className="space-y-3">
                  {formData.resumes.map((resume, index) => (
                    <div key={index} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="flex items-center gap-3">
                        <FileText className="text-slate-400 h-5 w-5 shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium text-slate-900 truncate">{resume.name}</p>
                          <a href={resume.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700">View file</a>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="primaryResume" 
                            checked={resume.isPrimary} 
                            onChange={() => handleSetPrimaryResume(index)} 
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                          <span className="text-xs font-medium text-slate-600">Primary</span>
                        </label>
                        <button type="button" onClick={() => handleDeleteResume(index)} className="text-xs font-medium text-rose-600 hover:text-rose-700">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {formData.resumes.length < 3 && (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center bg-slate-50 hover:bg-slate-100/50 transition-colors relative">
                  {isUploadingResume && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-lg z-10">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                      <span className="text-sm font-medium text-slate-700">Uploading...</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
                    onChange={handleFileUpload}
                    disabled={isUploadingResume}
                  />
                  <UploadCloud className="mx-auto h-8 w-8 text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-900">Click to upload a new resume</p>
                  <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX (Max 5MB)</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end pt-2 pb-6">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 h-11 px-8 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </form>
      </div>
    </>
  );
};

export default CandidateProfile;
