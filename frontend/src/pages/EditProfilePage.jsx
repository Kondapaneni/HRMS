import React, { useEffect, useState } from 'react';
import PageLoader from '../components/PageLoader';
import { ArrowLeft, Loader2, Save, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import EditMobileProfilePage from './EditMobileProfilePage';

const EditProfilePage = () => {
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
        await fetchProfile(); // Refresh global auth context
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (loading) return <PageLoader message="Loading Profile..." />;

  return (
    <>
      <div className="md:hidden">
        <EditMobileProfilePage />
      </div>
      <div className="hidden md:block space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Edit Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Update your personal information and emergency contact</p>
        </div>
        <button 
          onClick={() => navigate('/employee/profile')}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form id="editProfileForm" onSubmit={handleSubmit} className="space-y-6">
        
        {/* Personal Info Section */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-semibold text-slate-900">Personal Info</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">First Name <span className="text-red-500">*</span></label>
              <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} disabled className="flex h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed transition-colors" title="Contact your administrator to change your name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Last Name <span className="text-red-500">*</span></label>
              <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} disabled className="flex h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed transition-colors" title="Contact your administrator to change your name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} disabled className="flex h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed transition-colors" title="Contact your administrator to change your email" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Marital Status</label>
              <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                <option value="">Select marital status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nationality</label>
              <select name="nationality" value={formData.nationality} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                <option value="">Select nationality</option>
                <option value="Indian">Indian</option>
                <option value="American">American</option>
                <option value="British">British</option>
                <option value="Canadian">Canadian</option>
                <option value="Australian">Australian</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date of Birth</label>
              <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Blood Group</label>
              <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
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
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-semibold text-slate-900">Emergency Contact</h3>
            <p className="text-sm text-slate-500 mt-1">Contact details in case of emergency</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Contact Name</label>
              <input type="text" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Contact Phone</label>
              <input type="text" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button 
            type="button" 
            onClick={() => navigate('/employee/profile')} 
            className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={submitting} 
            className="flex items-center justify-center rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 min-w-[140px]"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </form>
      </div>
    </>
  );
};

export default EditProfilePage;
