import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, MapPin, Briefcase, UploadCloud, Save, FileText, Camera, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../api/supabase';

const CandidateProfile = () => {
  const { profile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(null);

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
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', profile.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    },
    enabled: !!profile?.id
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
      const { error } = await supabase
        .from('candidate_profiles')
        .upsert({
          user_id: profile.id,
          phone: updatedData.phone,
          address: updatedData.address,
          current_title: updatedData.currentTitle,
          experience: updatedData.experience,
          bio: updatedData.bio,
          resume_url: updatedData.resumes,
          avatar_url: updatedData.avatarUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      if (error) throw error;
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
        const fileName = `resume-${profile?.id || 'new'}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('resumes')
          .getPublicUrl(fileName);

        const newResume = {
          name: file.name,
          url: data.publicUrl,
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

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, avatarUrl: data.publicUrl }));
      toast.success('Profile picture uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload profile picture');
      console.error(error);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your personal information and resume to speed up applications.</p>
        </div>

        {/* Profile Avatar Upload */}
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
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Personal Information Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm border border-white">
              <User size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Personal Information</h2>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none transition-all text-slate-500 font-medium bg-slate-100 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 9440230003"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Address / Location</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="City, State, Country"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Professional Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-white">
              <Briefcase size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Professional Details</h2>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Current Job Title</label>
              <input
                type="text"
                name="currentTitle"
                value={formData.currentTitle}
                onChange={handleInputChange}
                placeholder="e.g. Software Engineer"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Years of Experience</label>
              <select
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white appearance-none cursor-pointer"
              >
                <option value="" disabled>Select experience level</option>
                <option value="0-1">0-1 years (Entry Level)</option>
                <option value="1-3">1-3 years (Junior)</option>
                <option value="3-5">3-5 years (Mid-Level)</option>
                <option value="5-10">5-10 years (Senior)</option>
                <option value="10+">10+ years (Lead/Principal)</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Professional Summary</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={4}
                placeholder="A brief summary of your skills and career goals..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium bg-slate-50 focus:bg-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Resume Upload Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm border border-white">
              <FileText size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Resume / CV</h2>
          </div>

          <div className="p-6 space-y-6">
            {formData.resumes.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Uploaded Resumes ({formData.resumes.length}/3)</h3>
                <div className="grid gap-3">
                  {formData.resumes.map((resume, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 text-blue-600 shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-medium text-slate-800 truncate">{resume.name}</p>
                          <a href={resume.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View File</a>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="primaryResume" 
                            checked={resume.isPrimary} 
                            onChange={() => handleSetPrimaryResume(index)} 
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-xs font-medium text-slate-600">Primary</span>
                        </label>
                        <button type="button" onClick={() => handleDeleteResume(index)} className="text-rose-500 hover:text-rose-700 text-sm font-medium">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.resumes.length < 3 && (
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100/50 transition-colors relative">
                {isUploadingResume && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-semibold text-slate-700">Uploading Resume...</span>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
                  onChange={handleFileUpload}
                  disabled={isUploadingResume}
                />
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 text-blue-500 mb-4">
                  <UploadCloud size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Upload a new resume</h3>
                <p className="text-sm text-slate-500 mb-4">PDF, DOC, DOCX (Max 5MB)</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 pb-12">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold text-base transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? (
              <>Saving...</>
            ) : (
              <>
                <Save size={20} />
                Save Profile Updates
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default CandidateProfile;
