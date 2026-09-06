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

      {/* Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-14 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#ff928b] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-[#7bdff2] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-[#84dcc6] rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 flex items-center justify-between px-2">
          <button 
            type="button"
            onClick={() => navigate('/employee/profile')} 
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest drop-shadow-md">Employee Self-Service</p>
            <h2 className="text-xl font-medium text-white tracking-tight drop-shadow-sm" style={{ fontWeight: 500 }}>
              Edit <span className="font-medium italic text-[#7bdff2]">Profile</span>
            </h2>
          </div>

          <button 
            type="button"
            onClick={handleSaveProfile} 
            disabled={isSaving} 
            className="px-4 py-3 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save</span>
          </button>
        </div>
      </section>

      {/* Edit Form */}
      <form onSubmit={handleSaveProfile} className="space-y-4 relative z-20 -mt-12 mx-0.5">
        
        {/* Personal Details Card */}
        <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-md space-y-4">
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
        <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-md space-y-4">
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
            className="w-full py-3.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Profile Updates</span>
          </button>
        </div>

      </form>

    </div>
  );
};

export default EditMobileProfile;
