import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageLoader from '../components/PageLoader';
import { 
  User, Mail, Phone, MapPin, Briefcase, CalendarDays, Building2,
  Shield, CreditCard, Heart, HeartHandshake, Globe, Clock3, Laptop,
  Calendar, Clock, UserCheck, Users, Search, Edit3, ChevronDown, ChevronUp, Camera,
  Sparkles, CheckCircle2, History, Award, AlertCircle, ScanFace, Trash2, Fingerprint, RefreshCw
} from 'lucide-react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import EmployeeMobileProfile from './EmployeeMobileProfile';
import { useAuth } from '../contexts/AuthContext';

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fetchProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [isUploading, setIsUploading] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { data: profileResponse, isLoading: loading } = useQuery({
    queryKey: ['employee', 'profile'],
    queryFn: async () => {
      const res = await api.get('/employee/profile');
      return res.data;
    },
    onError: () => toast.error('Failed to load profile data.'),
  });

  const profileData = profileResponse?.profile || null;
  const teamData = profileResponse?.team || null;
  const assetsData = profileResponse?.assets || [];

  const {
    firstName = '', lastName = '', email = '', phone = '', address = '', position = '', department = '', branch = '', branch_name = '',
    employeeId = '', dateOfBirth = '', bloodGroup = '', gender = '', maritalStatus = '', nationality = '',
    joinDate = '', workEmail = '', panNumber = '', employmentType = '', noticePeriod = '', shiftTime = '',
    workMode = '', weekOff = '', emergencyContact = '', emergencyPhone = '', avatar = '', timeline = '',
    isFaceRegistered = false, biometricsUpdatedAt = null
  } = profileData || {};

  const handleRemoveBiometrics = async () => {
    try {
      setIsResetting(true);
      await api.delete('/employee/biometrics/face');
      toast.success('Biometric data removed successfully');
      setIsResetModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['employee', 'profile'] });
      if (fetchProfile) {
        await fetchProfile();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove biometric data');
    } finally {
      setIsResetting(false);
    }
  };

  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Employee Profile';
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'work', label: 'Work Info', icon: Briefcase },
    { id: 'work-shift', label: 'Work Shift', icon: Clock3 },
    { id: 'emergency', label: 'Emergency', icon: Shield },
    { id: 'my-team', label: 'My Team', icon: Users },
    { id: 'my-assets', label: 'My Assets', icon: Laptop },
    { id: 'timeline', label: 'Timeline', icon: History },
  ];

  const formatEnum = (val) => {
    if (!val) return 'Not set';
    return val.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatDate = (val) => {
    if (!val) return 'Not set';
    return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${employeeId || 'avatar'}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete old avatar if it exists
      if (avatar) {
        const parts = avatar.split('/Avatar/');
        if (parts.length > 1) {
          const oldStoragePath = parts[1];
          await supabase.storage.from('avatars').remove([oldStoragePath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const avatarUrl = window.location.origin + "/Avatar/" + fileName;

      await api.post('/employee/profile/avatar', { avatar: avatarUrl });
      
      toast.success('Profile picture updated successfully!');
      queryClient.invalidateQueries(['employee', 'profile']);
      
      if (fetchProfile) {
        await fetchProfile();
      }
    } catch (error) {
      toast.error(error.message || 'Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };

  const renderTimeline = () => {
    let history = [];
    if (timeline) {
      try { history = JSON.parse(timeline); } catch (e) { history = []; }
    }
    if (!history.length) {
      history = [{ date: joinDate, title: 'Joined Company', description: `Started as ${position || 'Employee'}` }];
    } else {
      const hasJoined = history.some(e => e.title === 'Joined Company');
      if (!hasJoined && joinDate) {
        history.unshift({ date: joinDate, title: 'Joined Company', description: `Started as ${position || 'Employee'}` });
      }
    }

    if (joinDate) {
      const join = new Date(joinDate);
      const now = new Date();
      let yearsCompleted = 0;
      while (true) {
        yearsCompleted++;
        const anniversaryDate = new Date(join);
        anniversaryDate.setFullYear(join.getFullYear() + yearsCompleted);
        
        if (anniversaryDate > now) {
           break;
        }
        
        if (profileData?.status?.toLowerCase() !== 'active' && profileData?.employmentStatusDate) {
           const exitDate = new Date(profileData.employmentStatusDate);
           if (anniversaryDate > exitDate) {
               break;
           }
        }
        
        const title = `${yearsCompleted}${yearsCompleted === 1 ? 'st' : yearsCompleted === 2 ? 'nd' : yearsCompleted === 3 ? 'rd' : 'th'} Work Anniversary`;
        const exists = history.some(e => e.title === title);
        
        if (!exists) {
           history.push({
             date: anniversaryDate.toISOString().split('T')[0],
             title: title,
             description: `Completed ${yearsCompleted} year${yearsCompleted > 1 ? 's' : ''} with the organization.`
           });
        }
      }
    }

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div className="relative border-l border-[#e0e3e7] ml-3 space-y-6">
        {history.map((event, idx) => (
          <div key={idx} className="relative pl-6">
            <div className="absolute -left-1.5 mt-1.5 flex h-3 w-3 items-center justify-center">
              {idx === 0 && <span className="absolute h-5 w-5 animate-ping rounded-full bg-[#4285F4]/40"></span>}
              <span className="relative h-3 w-3 rounded-full bg-[#1a73e8] border-2 border-white ring-4 ring-[#f8fafd]"></span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1">
              <h4 className="text-sm font-semibold text-[#1f1f1f]">{event.title}</h4>
              <time className="text-xs text-[#5f6368] font-normal">
                {formatDate(event.date)}
              </time>
            </div>
            <p className="text-xs text-[#5f6368]">{event.description}</p>
          </div>
        ))}
      </div>
    );
  };

  const getInitials = (firstName, lastName) => {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase() || 'U';
  };

  const OrgNode = ({ employee, isSelf, isExpanded, toggleExpand, hasChildren }) => {
    if (!employee) return null;
    return (
      <div className={`relative mt-6 mb-2 flex flex-col items-center rounded-2xl border ${isSelf ? 'border-[#1a73e8] bg-[#e8f0fe]/60 ring-2 ring-[#d2e3fc]' : 'border-[#e0e3e7] bg-white'} shadow-xs min-w-[200px] max-w-[240px] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 z-10 mx-auto group pb-4`}>
        {/* Floating Avatar */}
        <div className="absolute -top-6 w-12 h-12 rounded-full bg-white flex items-center justify-center p-0.5 border border-[#e0e3e7] shadow-xs z-20 transition-transform group-hover:scale-105">
          <div className="w-full h-full rounded-full bg-[#e8f0fe] flex items-center justify-center text-[#1a73e8] font-bold text-sm overflow-hidden">
            {employee.avatar ? (
              <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              getInitials(employee.firstName, employee.lastName)
            )}
          </div>
        </div>
        
        {/* Card Content */}
        <div className="pt-8 px-4 w-full text-center">
          <div className="text-sm font-semibold text-[#1f1f1f] truncate group-hover:text-[#1a73e8] transition-colors">
            {employee.firstName} {employee.lastName}
          </div>
          <div className="text-[11px] font-medium text-[#5f6368] truncate mt-0.5">
            {employee.position || 'Employee'}
          </div>
        </div>

        {/* Expand/Collapse Pill */}
        {hasChildren && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30">
            <button 
              onClick={toggleExpand}
              className="flex items-center justify-center gap-1 bg-white border border-[#dadce0] text-[10px] font-semibold text-[#5f6368] px-3 py-1 rounded-full shadow-2xs hover:bg-[#f1f3f4] hover:text-[#1f1f1f] transition-colors cursor-pointer w-max"
            >
              {isExpanded ? (
                <>Collapse <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>{employee.childrenCount || 'View'} Reports <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  const MeNodeWithChildren = ({ me, subordinates }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = subordinates && subordinates.length > 0;
    
    const meContent = (
      <OrgNode 
        employee={{...me, childrenCount: subordinates?.length || 0}} 
        isSelf={true} 
        hasChildren={hasChildren} 
        isExpanded={isExpanded} 
        toggleExpand={() => setIsExpanded(!isExpanded)} 
      />
    );
    
    if (isExpanded && hasChildren) {
      return (
        <TreeNode label={meContent}>
          {subordinates.map(sub => (
            <TreeNode key={sub.id} label={<OrgNode employee={sub} />} />
          ))}
        </TreeNode>
      );
    }
    return <TreeNode label={meContent} />;
  };

  const ManagerTreeRoot = ({ manager, peers, me, subordinates }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const totalReports = (peers?.length || 0) + 1;
  
    const managerContent = (
      <OrgNode 
        employee={{...manager, childrenCount: totalReports}} 
        hasChildren={true} 
        isExpanded={isExpanded} 
        toggleExpand={() => setIsExpanded(!isExpanded)} 
      />
    );
  
    if (isExpanded) {
      return (
        <Tree
          lineWidth={'2px'}
          lineColor={'#dadce0'}
          lineBorderRadius={'8px'}
          lineHeight={'40px'}
          nodePadding={'20px'}
          label={managerContent}
        >
          {peers?.map(peer => (
            <TreeNode key={peer.id} label={<OrgNode employee={peer} />} />
          ))}
          <MeNodeWithChildren me={me} subordinates={subordinates} />
        </Tree>
      );
    }
  
    return (
      <Tree
        lineWidth={'2px'}
        lineColor={'#dadce0'}
        lineBorderRadius={'8px'}
        lineHeight={'40px'}
        nodePadding={'20px'}
        label={managerContent}
      />
    );
  };

  const MeTreeRoot = ({ me, subordinates }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = subordinates && subordinates.length > 0;
  
    const meContent = (
      <OrgNode 
        employee={{...me, childrenCount: subordinates?.length || 0}} 
        isSelf={true} 
        hasChildren={hasChildren} 
        isExpanded={isExpanded} 
        toggleExpand={() => setIsExpanded(!isExpanded)} 
      />
    );
  
    if (isExpanded && hasChildren) {
      return (
        <Tree
          lineWidth={'2px'}
          lineColor={'#dadce0'}
          lineBorderRadius={'8px'}
          lineHeight={'40px'}
          nodePadding={'20px'}
          label={meContent}
        >
          {subordinates.map(sub => (
            <TreeNode key={sub.id} label={<OrgNode employee={sub} />} />
          ))}
        </Tree>
      );
    }
    return (
      <Tree
        lineWidth={'2px'}
        lineColor={'#dadce0'}
        lineBorderRadius={'8px'}
        lineHeight={'40px'}
        nodePadding={'20px'}
        label={meContent}
      />
    );
  };

  if (loading) return <PageLoader message="Loading Profile..." />;

  return (
    <>
      {/* Mobile Profile Render */}
      <div className="md:hidden">
        <EmployeeMobileProfile />
      </div>

      {/* Web Desktop Profile Render (Google Material 3 Workspace UI) */}
      <div className="hidden md:block space-y-6 pb-12">
        
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
            <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
              My Employee Profile <span className="text-xs font-semibold text-[#137333] bg-[#e6f4ea] border border-[#ceead6] px-2.5 py-0.5 rounded-full">Active Record</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
              Personal credentials, work assignments, organizational hierarchy, and assigned company assets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFaceRegistered ? (
              <button 
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all shadow-xs cursor-pointer"
                title="Remove registered biometric face data"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Biometrics</span>
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => navigate('/employee/face-registration')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all shadow-xs cursor-pointer"
                title="Set up face recognition for quick login and attendance"
              >
                <ScanFace className="w-3.5 h-3.5" />
                <span>Register Face</span>
              </button>
            )}

            <button 
              type="button"
              onClick={() => navigate('/employee/profile/edit')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-all shadow-xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* Hero Identity Profile Card */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group cursor-pointer shrink-0">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#e8f0fe] border border-[#d2e3fc] overflow-hidden text-2xl font-bold text-[#1a73e8] relative shadow-xs">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
                <label className="absolute inset-0 bg-black/50 hidden group-hover:flex flex-col items-center justify-center text-white cursor-pointer transition-all">
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Camera className="h-5 w-5 mb-1" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider">Change</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="text-center sm:text-left flex-1 mt-2 sm:mt-0">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1f1f1f]">{fullName}</h2>
              <p className="text-xs sm:text-sm text-[#5f6368] font-medium mt-0.5">{position || 'Staff Member'}</p>
              
              <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                {department && (
                  <span className="inline-flex items-center rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] px-3 py-0.5 text-xs font-semibold">
                    {department}
                  </span>
                )}
                {employeeId && (
                  <span className="inline-flex items-center rounded-full bg-[#f8fafd] border border-[#e0e3e7] px-3 py-0.5 text-xs font-semibold text-[#1f1f1f]">
                    ID: {employeeId}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6] px-3 py-0.5 text-xs font-semibold">
                  {branch_name || branch || 'Main Branch'}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#fef7e0] text-[#b06000] border border-[#feefc3] px-3 py-0.5 text-xs font-semibold capitalize">
                  {formatEnum(employmentType) || 'Full Time'}
                </span>
                {isFaceRegistered ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6] px-3 py-0.5 text-xs font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Face Biometrics Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] px-3 py-0.5 text-xs font-semibold">
                    <AlertCircle className="w-3 h-3" /> Biometrics Not Configured
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Material 3 Tabs Navigation Bar */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#f8fafd] border border-[#e0e3e7] rounded-full overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#c2e7ff]/70 text-[#001d35] shadow-xs'
                    : 'text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#001d35]' : 'text-[#5f6368]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Cards */}
        <div className="mt-6">
          
          {/* PERSONAL INFO */}
          {activeTab === 'personal' && (
            <div className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-[#e0e3e7]">
                <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1f1f1f]">Personal Identity &amp; Information</h3>
                  <p className="text-xs text-[#5f6368]">Contact particulars and verified identity papers</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Mail className="w-4 h-4 text-[#1a73e8] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Personal Email</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{email || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Phone className="w-4 h-4 text-[#137333] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Phone Number</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{phone || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <User className="w-4 h-4 text-[#8430ce] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Gender</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] capitalize mt-0.5">{gender || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <HeartHandshake className="w-4 h-4 text-[#d93025] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Marital Status</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] capitalize mt-0.5">{maritalStatus || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Globe className="w-4 h-4 text-[#1a73e8] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Nationality</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{nationality || 'Indian'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <CreditCard className="w-4 h-4 text-[#b06000] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">PAN Number</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] uppercase mt-0.5">{panNumber || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <CalendarDays className="w-4 h-4 text-[#1a73e8] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Date of Birth</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{formatDate(dateOfBirth)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Heart className="w-4 h-4 text-[#d93025] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Blood Group</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{bloodGroup || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] sm:col-span-2 lg:col-span-3">
                  <MapPin className="w-4 h-4 text-[#5f6368] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Permanent Address</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{address || 'Not set'}</p>
                  </div>
                </div>

                {/* Facial Biometrics & Security Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7] sm:col-span-2 lg:col-span-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl ${isFaceRegistered ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      <ScanFace className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Facial Biometrics &amp; Security</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isFaceRegistered ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {isFaceRegistered ? 'Registered & Active' : 'Not Configured'}
                        </span>
                      </div>
                      <p className="text-xs text-[#5f6368] mt-1">
                        {isFaceRegistered 
                          ? `Your facial biometric descriptor is registered for quick face login and terminal attendance verification.${biometricsUpdatedAt ? ` (Updated: ${formatDate(biometricsUpdatedAt)})` : ''}`
                          : 'Register your face to enable instant 1-click camera login and biometric attendance verification.'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isFaceRegistered ? (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate('/employee/face-registration')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#dadce0] text-[#1f1f1f] hover:bg-[#f1f3f4] transition-all cursor-pointer shadow-2xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#1a73e8]" />
                          <span>Re-scan Face</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsResetModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Remove</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/employee/face-registration')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-all cursor-pointer shadow-xs"
                      >
                        <ScanFace className="w-3.5 h-3.5" />
                        <span>Register Face Biometrics</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WORK INFO */}
          {activeTab === 'work' && (
            <div className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-[#e0e3e7]">
                <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1f1f1f]">Employment &amp; Work Records</h3>
                  <p className="text-xs text-[#5f6368]">Official role, reporting line, and branch assignment</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Shield className="w-4 h-4 text-[#1a73e8] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Employee ID</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{employeeId || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Mail className="w-4 h-4 text-[#137333] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Official Work Email</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{workEmail || email || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <CalendarDays className="w-4 h-4 text-[#8430ce] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Joining Date</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{formatDate(joinDate)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Briefcase className="w-4 h-4 text-[#b06000] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Job Designation</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{position || 'Employee'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Building2 className="w-4 h-4 text-[#1a73e8] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Department</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{department || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Building2 className="w-4 h-4 text-[#137333] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Assigned Branch</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{branch_name || branch || 'Main Branch'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <UserCheck className="w-4 h-4 text-[#8430ce] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Reporting Manager</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">
                      {teamData?.manager ? `${teamData.manager.firstName} ${teamData.manager.lastName}` : 'Direct Administration'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Shield className="w-4 h-4 text-[#1a73e8] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Employment Type</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] capitalize mt-0.5">{formatEnum(employmentType)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Clock className="w-4 h-4 text-[#d93025] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Notice Period</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{noticePeriod ? `${noticePeriod} Days` : '30 Days'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WORK SHIFT */}
          {activeTab === 'work-shift' && (
            <div className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-[#e0e3e7]">
                <div className="p-2 rounded-xl bg-[#fef7e0] text-[#b06000]">
                  <Clock3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1f1f1f]">Work Shift &amp; Working Hours</h3>
                  <p className="text-xs text-[#5f6368]">Timings, weekly off schedule, and workplace mode</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Clock3 className="w-5 h-5 text-[#1a73e8] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Shift Timings</p>
                    <p className="text-sm font-semibold text-[#1f1f1f] mt-1">{shiftTime || '09:00 AM - 06:00 PM'}</p>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded-full">
                      Standard Business Hours
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Laptop className="w-5 h-5 text-[#137333] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Work Mode</p>
                    <p className="text-sm font-semibold text-[#1f1f1f] mt-1 capitalize">{formatEnum(workMode) || 'On-Site'}</p>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-[#137333] bg-[#e6f4ea] px-2 py-0.5 rounded-full">
                      Branch Office
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Calendar className="w-5 h-5 text-[#8430ce] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Weekly Off</p>
                    <p className="text-sm font-semibold text-[#1f1f1f] mt-1">{weekOff || 'Sunday'}</p>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-[#8430ce] bg-[#f3e8fd] px-2 py-0.5 rounded-full">
                      Recurring Rest Day
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EMERGENCY */}
          {activeTab === 'emergency' && (
            <div className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-[#e0e3e7]">
                <div className="p-2 rounded-xl bg-[#fce8e6] text-[#c5221f]">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1f1f1f]">Emergency Contacts</h3>
                  <p className="text-xs text-[#5f6368]">Designated point of contact in case of workplace emergency</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <User className="w-5 h-5 text-[#1a73e8] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Contact Person</p>
                    <p className="text-sm font-semibold text-[#1f1f1f] mt-1">{emergencyContact || 'Not recorded'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#f8fafd] border border-[#e0e3e7]">
                  <Phone className="w-5 h-5 text-[#137333] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#5f6368] uppercase tracking-wider">Emergency Phone</p>
                    <p className="text-sm font-semibold text-[#1f1f1f] mt-1">{emergencyPhone || 'Not recorded'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MY TEAM */}
          {activeTab === 'my-team' && (
            <div className="h-[600px] bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl overflow-hidden relative shadow-inner cursor-grab active:cursor-grabbing">
              {teamData ? (
                <TransformWrapper
                  initialScale={1}
                  minScale={1}
                  maxScale={1}
                  centerOnInit={true}
                  limitToBounds={false}
                  wheel={{ disabled: true }}
                  pinch={{ disabled: true }}
                  doubleClick={{ disabled: true }}
                  panOnScroll={true}
                >
                  {({ zoomIn, zoomOut, resetTransform }) => {
                    return (
                      <div className="relative w-full h-full">
                        <TransformComponent wrapperClass="!w-full !h-full" contentClass="min-w-max min-h-max flex items-start justify-center pt-16 pb-32 px-16">
                          {teamData.manager ? (
                            <ManagerTreeRoot 
                              manager={teamData.manager} 
                              peers={teamData.peers} 
                              me={profileData} 
                              subordinates={teamData.subordinates} 
                            />
                          ) : (
                            <MeTreeRoot 
                              me={profileData} 
                              subordinates={teamData.subordinates} 
                            />
                          )}
                        </TransformComponent>
                      </div>
                    );
                  }}
                </TransformWrapper>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[#5f6368] space-y-2">
                  <Users className="w-10 h-10 text-[#dadce0]" />
                  <p className="text-xs font-semibold">No team reporting hierarchy mapped yet.</p>
                </div>
              )}
            </div>
          )}

          {/* MY ASSETS */}
          {activeTab === 'my-assets' && (
            <div className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-[#e0e3e7]">
                <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1f1f1f]">Assigned Company Assets</h3>
                  <p className="text-xs text-[#5f6368]">Hardware equipment, serial identifiers, and custody records</p>
                </div>
              </div>

              {assetsData.length === 0 ? (
                <div className="text-center py-12">
                  <Laptop className="h-10 w-10 text-[#dadce0] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#5f6368]">No assets currently assigned to your account.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#e0e3e7]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3.5">Product Name</th>
                        <th className="p-3.5">Serial Number</th>
                        <th className="p-3.5">Assigned Date</th>
                        <th className="p-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f3f4]">
                      {assetsData.map((asset, i) => (
                        <tr key={asset.id || i} className="hover:bg-[#f8fafd] transition-colors">
                          <td className="p-3.5 font-semibold text-[#1f1f1f]">
                            {asset.name}
                            <div className="text-[11px] text-[#5f6368] font-normal">{asset.category}</div>
                          </td>
                          <td className="p-3.5 text-[#1f1f1f] font-semibold">{asset.serial_number || '-'}</td>
                          <td className="p-3.5 text-[#5f6368]">{formatDate(asset.created_at)}</td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6] px-2.5 py-0.5 text-[11px] font-semibold capitalize">
                              {asset.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="bg-white rounded-2xl border border-[#e0e3e7] p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-[#e0e3e7]">
                <div className="p-2 rounded-xl bg-[#f3e8fd] text-[#8430ce]">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1f1f1f]">Career Timeline &amp; Anniversaries</h3>
                  <p className="text-xs text-[#5f6368]">Milestones, promotion log, and organization tenure</p>
                </div>
              </div>

              <div className="pt-2">
                {renderTimeline()}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Remove / Reset Biometrics Confirmation Modal */}
      {createPortal(
        <AnimatePresence>
          {isResetModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              {/* Backdrop covering entire screen, sidebar & header */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isResetting && setIsResetModalOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              />

              {/* Centered Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15 }}
                className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#e0e3e7] overflow-hidden z-10 p-6 text-center space-y-4"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl bg-[#fce8e6] border border-[#fad2cf] text-[#d93025] flex items-center justify-center mx-auto shadow-2xs">
                  <Trash2 className="w-6 h-6" />
                </div>

                {/* Text */}
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-[#1f1f1f] tracking-tight">
                    Remove Biometric Data?
                  </h3>
                  <p className="text-xs text-[#5f6368] leading-relaxed">
                    This will permanently delete your registered facial biometric descriptor. You will need to re-register before using face login or camera attendance.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    disabled={isResetting}
                    className="flex-1 py-3 px-4 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-sm font-semibold text-[#1f1f1f] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveBiometrics}
                    disabled={isResetting}
                    className="flex-1 py-3 px-4 rounded-full bg-[#d93025] hover:bg-[#b3261e] text-white text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    {isResetting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Removing...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Remove</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default EmployeeProfile;
