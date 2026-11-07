import { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { Loader2, Save, Globe, CalendarDays, Shield, ChevronLeft, ChevronDown, Sun, Moon, Laptop } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

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
  const { setThemePreference } = useTheme();
  
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
    emergencyPhone: '',
    themePreference: 'system'
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
        emergencyPhone: profileData.emergencyPhone || '',
        themePreference: profileData.themePreference || 'system'
      });
    }
  }, [profileData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      await api.put('/employee/profile', data);
    },
    onSuccess: async () => {
      toast.success('Profile updated successfully!');
      if (formData.themePreference) {
        setThemePreference(formData.themePreference);
      }
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
    <div className="space-y-6 pb-6 font-sans antialiased text-[var(--text)]">

      {/* Header & Action */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1 pl-[48px]">
            Employee Self-Service
          </p>

          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <button 
                type="button"
                onClick={() => navigate('/employee/profile')} 
                className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-alt)] active:scale-95 text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer"
                aria-label="Back to Profile"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
                Edit <span className="text-[var(--brand-deep)]">Profile</span>
              </h2>
            </div>

            <button 
              type="button"
              onClick={handleSaveProfile} 
              disabled={isSaving} 
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-95 text-white rounded-full text-xs font-semibold tracking-wide shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Save className="w-3.5 h-3.5 text-white" />}
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-1 pl-[48px]">
            Update your personal credentials & contact details
          </p>
        </div>
      </section>

      {/* Edit Form */}
      <form onSubmit={handleSaveProfile} className="space-y-4 relative z-20 mx-0.5">
        
        {/* Personal Details Card */}
        <div className="bg-[var(--surface)] p-5 rounded-[24px] border border-[var(--line)] shadow-xs space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
            Personal Information
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">First Name *</label>
              <input 
                type="text" 
                value={formData.firstName} 
                disabled 
                className="w-full bg-[var(--surface-alt)]/60 border border-[var(--line)] rounded-[14px] px-4 py-2.5 text-xs font-medium text-[var(--muted)] cursor-not-allowed outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Last Name *</label>
              <input 
                type="text" 
                value={formData.lastName} 
                disabled 
                className="w-full bg-[var(--surface-alt)]/60 border border-[var(--line)] rounded-[14px] px-4 py-2.5 text-xs font-medium text-[var(--muted)] cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Email Address *</label>
            <input 
              type="email" 
              value={formData.email} 
              disabled 
              className="w-full bg-[var(--surface-alt)]/60 border border-[var(--line)] rounded-[14px] px-4 py-2.5 text-xs font-medium text-[var(--muted)] cursor-not-allowed outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Phone Number</label>
            <input 
              type="tel" 
              value={formData.phone} 
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
              placeholder="+91 98765 43210"
              className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Date of Birth</label>
            <input 
              type="date" 
              value={formData.dateOfBirth} 
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} 
              className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Gender</label>
              <div className="relative">
                <select 
                  value={formData.gender} 
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })} 
                  className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 pr-9 text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select Gender</option>
                  {GENDER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Blood Group</label>
              <div className="relative">
                <select 
                  value={formData.bloodGroup} 
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })} 
                  className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 pr-9 text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select Group</option>
                  {BLOOD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Marital Status</label>
              <div className="relative">
                <select 
                  value={formData.maritalStatus} 
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })} 
                  className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 pr-9 text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select Status</option>
                  {MARITAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Nationality</label>
              <div className="relative">
                <select 
                  value={formData.nationality} 
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} 
                  className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 pr-9 text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select</option>
                  {NATIONALITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Residential Address</label>
            <textarea 
              rows="2"
              value={formData.address} 
              onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
              placeholder="Enter current residential address..."
              className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] p-3 text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Emergency Contact Card */}
        <div className="bg-[var(--surface)] p-5 rounded-[24px] border border-[var(--line)] shadow-xs space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
            Emergency Contact Details
          </h3>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Emergency Contact Person</label>
            <input 
              type="text" 
              value={formData.emergencyContact} 
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })} 
              placeholder="e.g. John Doe (Spouse)"
              className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Emergency Phone Number</label>
            <input 
              type="tel" 
              value={formData.emergencyPhone} 
              onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })} 
              placeholder="+91 98765 43210"
              className="w-full bg-[var(--surface-alt)] border border-[var(--line)] rounded-[14px] px-4 py-2.5 text-xs font-medium text-[var(--text)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] outline-none transition-all"
            />
          </div>
        </div>

        {/* Theme Preference Card */}
        <div className="bg-[var(--surface)] p-5 rounded-[24px] border border-[var(--line)] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-semibold text-[var(--muted)] tracking-wider">DISPLAY PREFERENCE</p>
              <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mt-0.5">
                Workspace Theme
              </h3>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--surface-alt)] border border-[var(--line)] text-[var(--muted)] capitalize">
              {formData.themePreference}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, themePreference: 'light' })}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-[16px] border transition-all cursor-pointer ${
                formData.themePreference === 'light'
                  ? 'bg-[var(--ink)] text-white border-[var(--ink)] shadow-xs'
                  : 'bg-[var(--surface-alt)] border-[var(--line)] text-[var(--text)]'
              }`}
            >
              <Sun size={18} className={formData.themePreference === 'light' ? 'text-[#E6B350]' : 'text-[var(--muted)]'} />
              <span className="text-xs font-semibold">Light</span>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, themePreference: 'dark' })}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-[16px] border transition-all cursor-pointer ${
                formData.themePreference === 'dark'
                  ? 'bg-[var(--ink)] text-white border-[var(--ink)] shadow-xs'
                : 'bg-[var(--surface-alt)] border-[var(--line)] text-[var(--text)]'
              }`}
            >
              <Moon size={18} className={formData.themePreference === 'dark' ? 'text-white' : 'text-[var(--muted)]'} />
              <span className="text-xs font-semibold">Dark</span>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, themePreference: 'system' })}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-[16px] border transition-all cursor-pointer ${
                formData.themePreference === 'system'
                  ? 'bg-[var(--brand-deep)] text-white border-[var(--brand-deep)] shadow-xs'
                  : 'bg-[var(--surface-alt)] border-[var(--line)] text-[var(--text)]'
              }`}
            >
              <Laptop size={18} className={formData.themePreference === 'system' ? 'text-white' : 'text-[var(--muted)]'} />
              <span className="text-xs font-semibold">System</span>
            </button>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-11 rounded-full bg-[var(--ink)] hover:bg-[var(--ink-2)] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
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
