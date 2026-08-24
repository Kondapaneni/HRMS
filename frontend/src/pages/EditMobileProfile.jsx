import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { ArrowLeft, Loader2, Save, X, Sparkles, User, Mail, Phone, MapPin, Heart, HeartHandshake, Globe, CalendarDays, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const MARITAL_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'];
const NATIONALITY_OPTIONS = ['Indian', 'American', 'British', 'Canadian', 'Australian', 'Other'];
const BLOOD_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const matchOption = (val, options) => {
  if (!val) return '';
  const found = options.find(opt => opt.toLowerCase() === String(val).toLowerCase());
  return found || val;
};

const EditMobileProfile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fetchProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    gender: '',
    maritalStatus: '',
    nationality: '',
    dateOfBirth: '',
    bloodGroup: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  const { data: responseData, isLoading: loading } = useQuery({
    queryKey: ['employee', 'profile'],
    queryFn: async () => {
      const res = await api.get('/employee/profile');
      return res.data;
    }
  });

  const profileData = responseData?.profile;

  useEffect(() => {
    if (profileData) {
      setFormData({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        gender: matchOption(profileData.gender, GENDER_OPTIONS),
        maritalStatus: matchOption(profileData.maritalStatus, MARITAL_OPTIONS),
        nationality: matchOption(profileData.nationality, NATIONALITY_OPTIONS),
        dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString().split('T')[0] : '',
        bloodGroup: matchOption(profileData.bloodGroup, BLOOD_OPTIONS),
        emergencyContact: profileData.emergencyContact || '',
        emergencyPhone: profileData.emergencyPhone || ''
      });
    }
  }, [profileData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      await api.put('/employee/profile', data);
    },
    onSuccess: async () => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries(['employee', 'profile']);
      if (fetchProfile) await fetchProfile();
      navigate('/employee/profile');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    }
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
       toast.error('First name, last name, and email are required');
       return;
    }
    updateProfileMutation.mutate(formData);
  };

  const isSaving = updateProfileMutation.isPending;

  if (loading) return <PageLoader message="Loading Profile Form..." />;

  return (
    <div className="space-y-4 pb-8">

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/employee/profile')}
              className="p-2 rounded-full border border-[#dadce0] bg-[#f8fafd] hover:bg-[#e8f0fe] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368] ml-1">
                  Profile Editor
                </span>
              </div>
              <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight mt-0.5">
                Edit Profile
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSaveProfile} className="space-y-4">
        
        {/* Personal Details Card */}
        <div className="bg-white p-5 rounded-3xl border border-[#e0e3e7] shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
            Personal Information
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#5f6368] uppercase">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#5f6368] uppercase">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#5f6368] uppercase">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#5f6368] uppercase">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              placeholder="+91 98765 43210"
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#5f6368] uppercase">Gender</label>
              <select
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none cursor-pointer"
              >
                <option value="">Select Gender</option>
                {GENDER_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#5f6368] uppercase">Marital Status</label>
              <select
                value={formData.maritalStatus}
                onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })}
                className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none cursor-pointer"
              >
                <option value="">Select Status</option>
                {MARITAL_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#5f6368] uppercase">Nationality</label>
              <select
                value={formData.nationality}
                onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none cursor-pointer"
              >
                <option value="">Select Nationality</option>
                {NATIONALITY_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#5f6368] uppercase">Blood Group</label>
              <select
                value={formData.bloodGroup}
                onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none cursor-pointer"
              >
                <option value="">Select Blood Group</option>
                {BLOOD_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#5f6368] uppercase">Date of Birth</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#5f6368] uppercase">Residential Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street, City, State, PIN Code"
              className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl p-3 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none resize-none"
            />
          </div>
        </div>

        {/* Emergency Contact Card */}
        <div className="bg-white p-5 rounded-3xl border border-[#e0e3e7] shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
            Emergency Contact Information
          </h3>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#5f6368] uppercase">Contact Person Name</label>
            <input
              type="text"
              value={formData.emergencyContact}
              onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
              placeholder="e.g. Spouse / Parent / Relative"
              className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#5f6368] uppercase">Emergency Phone Number</label>
            <input
              type="tel"
              value={formData.emergencyPhone}
              onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })}
              placeholder="e.g. +91 98765 43210"
              className="w-full bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl px-3.5 py-2.5 text-xs text-[#1f1f1f] font-medium focus:bg-white focus:ring-1 focus:ring-[#1a73e8] outline-none"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};

export default EditMobileProfile;
