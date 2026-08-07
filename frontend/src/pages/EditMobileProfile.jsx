import React, { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { ArrowLeft, Loader2, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

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
import { ArrowLeft, Loader2, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

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
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries(['employee', 'profile']);
      if (fetchProfile) await fetchProfile();
      navigate('/employee/profile');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    }
  });

  const handleSaveProfile = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
       toast.error('First name, last name, and email are required');
       return;
    }
    updateProfileMutation.mutate(formData);
  };

  const isSaving = updateProfileMutation.isPending;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (loading) return <PageLoader message="Loading Profile..." />;

          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Address</label>
            <textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} rows="3" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"></textarea>
          </div>
        </div>

        {/* Emergency Section */}
        <div className="bg-white p-5 rounded-[24px] shadow-lg border border-slate-100/50 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 text-rose-500">Emergency Contact</h3>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Contact Name</label>
            <input type="text" value={formData.emergencyContact} onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Contact Phone</label>
            <input type="tel" value={formData.emergencyPhone} onChange={(e) => setFormData({...formData, emergencyPhone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default EditMobileProfile;
