import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Heart, 
  HeartHandshake, 
  Globe, 
  CalendarDays, 
  Shield,
  ChevronLeft,
  ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
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
    <div className="space-y-6 pb-6 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>

      {/* Clean White Header & Action */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-bold text-[#5f6368] uppercase tracking-wider mb-1 pl-[50px]">
            Employee Self-Service
          </p>

          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <button 
                type="button"
                onClick={() => navigate('/employee/profile')} 
                className="w-10 h-10 rounded-full bg-white border border-[#e0e3e7] hover:bg-[#f1f3f4] active:scale-95 text-[#5f6368] flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer"
                aria-label="Back to Profile"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight leading-tight min-w-0" style={{ fontWeight: 500 }}>
                Edit <span className="font-medium italic text-[#1a73e8]">Profile</span>
              </h2>
            </div>

            {/* Unified Action Button Aligned Straight to Main Heading */}
            <button 
              type="button"
              onClick={handleSaveProfile} 
              disabled={isSaving} 
              className="shrink-0 h-10 px-4 inline-flex items-center justify-center gap-1.5 bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white rounded-full text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Save className="w-3.5 h-3.5 text-white" />}
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm font-medium text-[#5f6368] mt-1 pl-[50px]">
            Update your personal credentials & contact details
          </p>
        </div>
      </section>

      {/* Edit Form */}
      <form onSubmit={handleSaveProfile} className="space-y-4 relative z-20 mx-0.5">
        
        {/* Personal Details Card */}
        <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-[#e0e3e7] shadow-xs space-y-4">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Personal Information
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">First Name *</label>
              <input 
                type="text" 
                value={formData.firstName} 
                disabled 
                className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs font-semibold text-slate-400 cursor-not-allowed outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Last Name *</label>
              <input 
                type="text" 
                value={formData.lastName} 
                disabled 
                className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs font-semibold text-slate-400 cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Email Address *</label>
            <input 
              type="email" 
              value={formData.email} 
              disabled 
              className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs font-semibold text-slate-400 cursor-not-allowed outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Phone Number</label>
            <input 
              type="tel" 
              value={formData.phone} 
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
              placeholder="+91 98765 43210"
              className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Date of Birth</label>
            <input 
              type="date" 
              value={formData.dateOfBirth} 
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} 
              className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Gender</label>
              <div className="relative">
                <select 
                  value={formData.gender} 
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 pr-9 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select Gender</option>
                  {GENDER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Blood Group</label>
              <div className="relative">
                <select 
                  value={formData.bloodGroup} 
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 pr-9 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select Group</option>
                  {BLOOD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Marital Status</label>
              <div className="relative">
                <select 
                  value={formData.maritalStatus} 
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 pr-9 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select Status</option>
                  {MARITAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Nationality</label>
              <div className="relative">
                <select 
                  value={formData.nationality} 
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 pr-9 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select</option>
                  {NATIONALITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Residential Address</label>
            <textarea 
              rows="2"
              value={formData.address} 
              onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
              placeholder="Enter current residential address..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Emergency Contact Card */}
        <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] border border-[#e0e3e7] shadow-xs space-y-4">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Emergency Contact Details
          </h3>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Emergency Contact Person</label>
            <input 
              type="text" 
              value={formData.emergencyContact} 
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })} 
              placeholder="e.g. John Doe (Spouse)"
              className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Emergency Phone Number</label>
            <input 
              type="tel" 
              value={formData.emergencyPhone} 
              onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })} 
              placeholder="+91 98765 43210"
              className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-12 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-white" />}
            <span>Save Profile Updates</span>
          </button>
        </div>

      </form>

    </div>
  );
};

export default EditMobileProfile;
