import React, { useEffect, useState } from 'react';
import PageLoader from '../components/PageLoader';
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  AlertCircle, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Heart, 
  HeartHandshake, 
  Globe, 
  CalendarDays, 
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import EditMobileProfile from './EditMobileProfile';

const EditProfile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fetchProfile } = useAuth();
  
  const [error, setError] = useState('');
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
        gender: profileData.gender || '',
        maritalStatus: profileData.maritalStatus || '',
        nationality: profileData.nationality || '',
        dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString().split('T')[0] : '',
        bloodGroup: profileData.bloodGroup || '',
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
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries(['employee', 'profile']);
      if (fetchProfile) {
        await fetchProfile();
      }
      navigate('/employee/profile');
    },
    onError: (err) => {
      const errMsg = err.response?.data?.error || 'Failed to update profile';
      setError(errMsg);
      toast.error(errMsg);
    }
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    updateProfileMutation.mutate(formData);
  };

  const submitting = updateProfileMutation.isPending;

  if (loading) return <PageLoader message="Loading Profile Details..." />;

  return (
    <>
      {/* Mobile Experience Render */}
      <div className="md:hidden">
        <EditMobileProfile />
      </div>

      {/* Web Desktop Experience (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Staff Identity &amp; Records</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight flex items-center gap-2" style={{ fontWeight: 500 }}>
              <span>Edit Profile <span className="font-medium italic text-[#1a73e8]">Details</span></span> <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">Self-Service</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Update personal demographic details, communication coordinates, and emergency contacts.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              type="button"
              onClick={() => navigate('/employee/profile')}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-semibold bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button 
              form="editProfileForm"
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white disabled:opacity-50 transition-all shadow-xs cursor-pointer min-w-[130px]"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-[#fad2cf] bg-[#fce8e6] p-4 text-xs font-medium text-[#c5221f] flex items-center gap-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form id="editProfileForm" onSubmit={handleSubmit} className="space-y-6">
          
          {/* Personal Demographic Info Card */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-[#e0e3e7]">
              <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1f1f1f]">Personal &amp; Contact Particulars</h3>
                <p className="text-xs text-[#5f6368]">Locked fields can only be modified by your HR administrator</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* First Name (Locked) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5f6368] flex items-center gap-1.5">
                  First Name <Lock className="w-3 h-3 text-[#70757a]" />
                </label>
                <input 
                  type="text" 
                  name="firstName" 
                  required 
                  value={formData.firstName} 
                  onChange={handleChange} 
                  disabled 
                  className="w-full rounded-xl border border-[#e0e3e7] bg-[#f8fafd] px-3.5 py-2.5 text-xs text-[#70757a] cursor-not-allowed" 
                  title="Contact your administrator to change your legal name" 
                />
              </div>

              {/* Last Name (Locked) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5f6368] flex items-center gap-1.5">
                  Last Name <Lock className="w-3 h-3 text-[#70757a]" />
                </label>
                <input 
                  type="text" 
                  name="lastName" 
                  required 
                  value={formData.lastName} 
                  onChange={handleChange} 
                  disabled 
                  className="w-full rounded-xl border border-[#e0e3e7] bg-[#f8fafd] px-3.5 py-2.5 text-xs text-[#70757a] cursor-not-allowed" 
                  title="Contact your administrator to change your legal name" 
                />
              </div>

              {/* Email (Locked) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#5f6368] flex items-center gap-1.5">
                  Official Email <Lock className="w-3 h-3 text-[#70757a]" />
                </label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  value={formData.email} 
                  onChange={handleChange} 
                  disabled 
                  className="w-full rounded-xl border border-[#e0e3e7] bg-[#f8fafd] px-3.5 py-2.5 text-xs text-[#70757a] cursor-not-allowed" 
                  title="Contact your administrator to change your primary account email" 
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1f1f1f]">Mobile Phone Number</label>
                <input 
                  type="text" 
                  name="phone" 
                  placeholder="+91 98765 43210"
                  value={formData.phone} 
                  onChange={handleChange} 
                  className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none transition-all" 
                />
              </div>
              
              {/* Gender */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1f1f1f]">Gender</label>
                <select 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleChange} 
                  className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              {/* Marital Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1f1f1f]">Marital Status</label>
                <select 
                  name="maritalStatus" 
                  value={formData.maritalStatus} 
                  onChange={handleChange} 
                  className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">Select Marital Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                </select>
              </div>

              {/* Nationality */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1f1f1f]">Nationality</label>
                <select 
                  name="nationality" 
                  value={formData.nationality} 
                  onChange={handleChange} 
                  className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">Select Nationality</option>
                  <option value="Indian">Indian</option>
                  <option value="American">American</option>
                  <option value="British">British</option>
                  <option value="Canadian">Canadian</option>
                  <option value="Australian">Australian</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1f1f1f]">Date of Birth</label>
                <input 
                  type="date" 
                  name="dateOfBirth" 
                  value={formData.dateOfBirth} 
                  onChange={handleChange} 
                  className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none transition-all" 
                />
              </div>

              {/* Blood Group */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1f1f1f]">Blood Group</label>
                <select 
                  name="bloodGroup" 
                  value={formData.bloodGroup} 
                  onChange={handleChange} 
                  className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              {/* Permanent Address */}
              <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                <label className="text-xs font-semibold text-[#1f1f1f]">Residential &amp; Postal Address</label>
                <input 
                  type="text" 
                  name="address" 
                  placeholder="Street, City, State, PIN Code"
                  value={formData.address} 
                  onChange={handleChange} 
                  className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none transition-all" 
                />
              </div>

            </div>
          </div>

          {/* Emergency Contact Particulars Card */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-[#e0e3e7]">
              <div className="p-2 rounded-xl bg-[#fce8e6] text-[#c5221f]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1f1f1f]">Emergency Point of Contact</h3>
                <p className="text-xs text-[#5f6368]">Person to notify immediately in case of medical or occupational contingency</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1f1f1f]">Emergency Contact Person</label>
                <input 
                  type="text" 
                  name="emergencyContact" 
                  placeholder="e.g. Spouse, Parent, Sibling Name"
                  value={formData.emergencyContact} 
                  onChange={handleChange} 
                  className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none transition-all" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1f1f1f]">Emergency Phone Number</label>
                <input 
                  type="text" 
                  name="emergencyPhone" 
                  placeholder="+91 98765 43210"
                  value={formData.emergencyPhone} 
                  onChange={handleChange} 
                  className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs text-[#1f1f1f] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] focus:outline-none transition-all" 
                />
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => navigate('/employee/profile')} 
              className="px-5 py-2.5 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting} 
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white disabled:opacity-50 transition-all cursor-pointer shadow-xs min-w-[140px]"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{submitting ? 'Saving Changes...' : 'Save Profile'}</span>
            </button>
          </div>

        </form>

      </div>
    </>
  );
};

export default EditProfile;
