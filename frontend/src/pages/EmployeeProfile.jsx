import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageLoader from '../components/PageLoader';
import { formatEmployeeId } from '../utils/employeeIdDisplay';
import { 
  User, Mail, Phone, MapPin, Briefcase, CalendarDays, Building2,
  Shield, CreditCard, Heart, HeartHandshake, Globe, Clock3, Laptop,
  Calendar, Clock, UserCheck, Users, Search, Edit3, ChevronDown, ChevronUp, Camera,
  Sparkles, CheckCircle2, History, Award, AlertCircle, Trash2, Lock, ShieldCheck, X
} from 'lucide-react';
import MfaSecurityCard from '../components/MfaSecurityCard';
import { Tree, TreeNode } from 'react-organizational-chart';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useQueryErrorToast } from '../hooks/useQueryErrorToast';
import { useNavigate } from 'react-router-dom';
import EmployeeMobileProfile from './EmployeeMobileProfile';
import { useAuth } from '../contexts/AuthContext';

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fetchProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [isUploading, setIsUploading] = useState(false);
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);

  const { data: profileResponse, isLoading: loading, error: loadError } = useQuery({
    queryKey: ['employee', 'profile'],
    queryFn: async () => {
      const res = await api.get('/employee/profile');
      return res.data;
    },
  });

  useQueryErrorToast(loadError, 'Failed to load profile data.', 'employee-profile-load');

  const { data: mfaStatus } = useQuery({
    queryKey: ['mfa', 'status'],
    queryFn: async () => {
      const res = await api.get('/mfa/status');
      return res.data;
    },
  });

  const profileData = profileResponse?.profile || null;
  const teamData = profileResponse?.team || null;
  const assetsData = profileResponse?.assets || [];

  const {
    firstName = '', lastName = '', email = '', phone = '', address = '', position = '', department = '', branch = '', branch_name = '',
    employeeId = '', dateOfBirth = '', bloodGroup = '', gender = '', maritalStatus = '', nationality = '',
    joinDate = '', workEmail = '', panNumber = '', employmentType = '', noticePeriod = '', shiftTime = '',
    workMode = '', weekOff = '', emergencyContact = '', emergencyPhone = '', avatar = '', timeline = ''
  } = profileData || {};

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

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const avatarUrl = window.location.origin + "/Avatar/" + uploadData.path;

      await api.post('/employee/profile/avatar', { avatar: avatarUrl });
      
      toast.success('Profile picture updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['employee', 'profile'] });
      
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
      <div className="relative border-l border-[var(--line)] ml-3 space-y-6">
        {history.map((event, idx) => (
          <div key={idx} className="relative pl-6">
            <div className="absolute -left-1.5 mt-1.5 flex h-3 w-3 items-center justify-center">
              {idx === 0 && <span className="absolute h-5 w-5 animate-ping rounded-full bg-[var(--brand)]/40"></span>}
              <span className="relative h-3 w-3 rounded-full bg-[var(--brand)] border-2 border-[var(--surface)] ring-4 ring-[var(--surface-alt)]"></span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1">
              <h4 className="text-sm font-semibold text-[var(--text)]">{event.title}</h4>
              <time className="text-xs text-[var(--muted)] font-normal">
                {formatDate(event.date)}
              </time>
            </div>
            <p className="text-xs text-[var(--muted)]">{event.description}</p>
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
      <div className={`relative mt-6 mb-2 flex flex-col items-center rounded-[20px] border ${isSelf ? 'border-[var(--brand)] bg-[var(--brand-tint)]/60 ring-2 ring-[var(--brand)]/30' : 'border-[var(--line)] bg-[var(--surface)]'} shadow-xs min-w-[200px] max-w-[240px] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 z-10 mx-auto group pb-4`}>
        {/* Floating Avatar */}
        <div className="absolute -top-6 w-12 h-12 rounded-[14px] bg-[var(--surface)] flex items-center justify-center p-0.5 border border-[var(--line)] shadow-xs z-20 transition-transform group-hover:scale-105">
          <div className="w-full h-full rounded-[12px] bg-[var(--brand-tint)] flex items-center justify-center text-[var(--brand-deep)] font-bold text-sm overflow-hidden">
            {employee.avatar ? (
              <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              getInitials(employee.firstName, employee.lastName)
            )}
          </div>
        </div>
        
        {/* Card Content */}
        <div className="pt-8 px-4 w-full text-center">
          <div className="text-sm font-semibold text-[var(--text)] truncate group-hover:text-[var(--brand-deep)] transition-colors">
            {employee.firstName} {employee.lastName}
          </div>
          <div className="text-[11px] font-medium text-[var(--muted)] truncate mt-0.5">
            {employee.position || 'Employee'}
          </div>
        </div>

        {/* Expand/Collapse Pill */}
        {hasChildren && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30">
            <button 
              onClick={toggleExpand}
              className="flex items-center justify-center gap-1 bg-[var(--surface)] border border-[var(--line)] text-[10px] font-semibold text-[var(--muted)] px-3 py-1 rounded-full shadow-2xs hover:bg-[var(--surface-alt)] hover:text-[var(--text)] transition-colors cursor-pointer w-max"
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

      {/* Web Desktop Profile Render */}
      <div className="hidden md:block space-y-6 pb-12 antialiased">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-medium text-[var(--muted)]">Staff identity &amp; records</span>
            </div>
            <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
              <span>My employee profile</span>
              <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
                Active staff
              </span>
            </h1>
            <p className="text-[13px] text-[var(--muted)] mt-1">
              Personal credentials, work assignments, organizational hierarchy, and assigned company assets.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/change-password')}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] text-[var(--text)] transition-all cursor-pointer whitespace-nowrap"
            >
              <Lock className="w-4 h-4 shrink-0 text-[var(--brand-deep)]" />
              <span>Change Password</span>
            </button>
            {mfaStatus?.authorized && (
              <button 
                type="button"
                onClick={() => setIsMfaModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] active:scale-95 text-[var(--text)] transition-all cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              >
                <ShieldCheck className={`w-4 h-4 shrink-0 ${mfaStatus?.enabled ? 'text-emerald-500' : 'text-[var(--brand-deep)]'}`} />
                <span className="whitespace-nowrap">Two-Factor Auth</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 ${
                  mfaStatus?.enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-neutral-500/10 text-neutral-500'
                }`}>
                  {mfaStatus?.enabled ? 'Active' : 'Off'}
                </span>
              </button>
            )}
            <button 
              type="button"
              onClick={() => navigate('/employee/profile/edit')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-white transition-all cursor-pointer shadow-none whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Edit profile</span>
            </button>
          </div>
        </div>

        {/* Hero Identity Profile Card */}
        <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group cursor-pointer shrink-0">
              <div className="flex h-24 w-24 items-center justify-center rounded-[18px] bg-[var(--brand-tint)] border border-[var(--line)] overflow-hidden text-2xl font-bold text-[var(--brand-deep)] relative">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
                <label className="absolute inset-0 bg-black/50 hidden group-hover:flex flex-col items-center justify-center text-white cursor-pointer transition-all rounded-[18px]">
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
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{fullName}</h2>
              <p className="text-xs sm:text-sm text-[var(--muted)] font-medium mt-0.5">{position || 'Staff Member'}</p>
              
              <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                {department && (
                  <span className="inline-flex items-center rounded-full bg-[var(--brand-tint)] text-[var(--brand-deep)] px-3 py-0.5 text-xs font-semibold">
                    {department}
                  </span>
                )}
                {employeeId && (
                  <span className="inline-flex items-center rounded-full bg-[var(--surface-alt)] border border-[var(--line)] px-3 py-0.5 text-xs font-semibold text-[var(--text)]">
                    ID: {formatEmployeeId(employeeId)}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full bg-[#E6F6EC] text-[#1F9D55] px-3 py-0.5 text-xs font-semibold">
                  {branch_name || branch || 'Main Branch'}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#FDF3DC] text-[#B7791F] px-3 py-0.5 text-xs font-semibold capitalize">
                  {formatEnum(employmentType) || 'Full Time'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation Bar */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-[18px] overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[var(--ink)] text-white shadow-none'
                    : 'text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[var(--muted)]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Cards */}
        <div className="mt-6">
          
          {/* PERSONAL INFO */}
          {activeTab === 'personal' && (
            <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-[var(--line)]">
                <div className="p-2.5 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text)]">Personal Identity &amp; Information</h3>
                  <p className="text-xs text-[var(--muted)]">Contact particulars and verified identity papers</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Mail className="w-4 h-4 text-[var(--brand-deep)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Personal Email</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{email || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Phone className="w-4 h-4 text-[#1F9D55] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Phone Number</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{phone || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <User className="w-4 h-4 text-[var(--accent-pink-deep)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Gender</p>
                    <p className="text-xs font-semibold text-[var(--text)] capitalize mt-0.5">{gender || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <HeartHandshake className="w-4 h-4 text-[#D64550] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Marital Status</p>
                    <p className="text-xs font-semibold text-[var(--text)] capitalize mt-0.5">{maritalStatus || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Globe className="w-4 h-4 text-[var(--brand-deep)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Nationality</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{nationality || 'Indian'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <CreditCard className="w-4 h-4 text-[#B7791F] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">PAN Number</p>
                    <p className="text-xs font-semibold text-[var(--text)] uppercase mt-0.5">{panNumber || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <CalendarDays className="w-4 h-4 text-[var(--brand-deep)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Date of Birth</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{formatDate(dateOfBirth)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Heart className="w-4 h-4 text-[#D64550] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Blood Group</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{bloodGroup || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)] sm:col-span-2 lg:col-span-3">
                  <MapPin className="w-4 h-4 text-[var(--muted)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Permanent Address</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{address || 'Not set'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WORK INFO */}
          {activeTab === 'work' && (
            <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-[var(--line)]">
                <div className="p-2.5 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text)]">Employment &amp; Work Records</h3>
                  <p className="text-xs text-[var(--muted)]">Official role, reporting line, and branch assignment</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Shield className="w-4 h-4 text-[var(--brand-deep)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Employee ID</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{formatEmployeeId(employeeId)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Mail className="w-4 h-4 text-[#1F9D55] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Official Work Email</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{workEmail || email || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <CalendarDays className="w-4 h-4 text-[var(--accent-pink-deep)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Joining Date</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{formatDate(joinDate)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Briefcase className="w-4 h-4 text-[#B7791F] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Job Designation</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{position || 'Employee'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Building2 className="w-4 h-4 text-[var(--brand-deep)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Department</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{department || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Building2 className="w-4 h-4 text-[#1F9D55] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Assigned Branch</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{branch_name || branch || 'Main Branch'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <UserCheck className="w-4 h-4 text-[var(--accent-pink-deep)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Reporting Manager</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">
                      {teamData?.manager ? `${teamData.manager.firstName} ${teamData.manager.lastName}` : 'Direct Administration'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Shield className="w-4 h-4 text-[var(--brand-deep)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Employment Type</p>
                    <p className="text-xs font-semibold text-[var(--text)] capitalize mt-0.5">{formatEnum(employmentType)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Clock className="w-4 h-4 text-[#D64550] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Notice Period</p>
                    <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{noticePeriod ? `${noticePeriod} Days` : '30 Days'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WORK SHIFT */}
          {activeTab === 'work-shift' && (
            <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-[var(--line)]">
                <div className="p-2.5 rounded-[14px] bg-[#FDF3DC] text-[#B7791F]">
                  <Clock3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text)]">Work Shift &amp; Working Hours</h3>
                  <p className="text-xs text-[var(--muted)]">Timings, weekly off schedule, and workplace mode</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 p-4 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Clock3 className="w-5 h-5 text-[var(--brand-deep)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Shift Timings</p>
                    <p className="text-sm font-semibold text-[var(--text)] mt-1">{shiftTime || '09:00 AM - 06:00 PM'}</p>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-full">
                      Standard Business Hours
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Laptop className="w-5 h-5 text-[#1F9D55] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Work Mode</p>
                    <p className="text-sm font-semibold text-[var(--text)] mt-1 capitalize">{formatEnum(workMode) || 'On-Site'}</p>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-[#1F9D55] bg-[#E6F6EC] px-2.5 py-0.5 rounded-full">
                      Branch Office
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Calendar className="w-5 h-5 text-[var(--accent-pink-deep)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Weekly Off</p>
                    <p className="text-sm font-semibold text-[var(--text)] mt-1">{weekOff || 'Sunday'}</p>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-[var(--accent-pink-deep)] bg-[var(--accent-pink-tint)] px-2.5 py-0.5 rounded-full">
                      Recurring Rest Day
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EMERGENCY */}
          {activeTab === 'emergency' && (
            <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-[var(--line)]">
                <div className="p-2.5 rounded-[14px] bg-[#FDE8EA] text-[#D64550]">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text)]">Emergency Contacts</h3>
                  <p className="text-xs text-[var(--muted)]">Designated point of contact in case of workplace emergency</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-3 p-4 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <User className="w-5 h-5 text-[var(--brand-deep)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Contact Person</p>
                    <p className="text-sm font-semibold text-[var(--text)] mt-1">{emergencyContact || 'Not recorded'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-[18px] bg-[var(--surface-alt)] border border-[var(--line)]">
                  <Phone className="w-5 h-5 text-[#1F9D55] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Emergency Phone</p>
                    <p className="text-sm font-semibold text-[var(--text)] mt-1">{emergencyPhone || 'Not recorded'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MY TEAM */}
          {activeTab === 'my-team' && (
            <div className="h-[600px] bg-[var(--surface-alt)] border border-[var(--line)] rounded-[24px] overflow-hidden relative shadow-inner cursor-grab active:cursor-grabbing">
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
                <div className="flex flex-col items-center justify-center h-full text-[var(--muted)] space-y-2">
                  <Users className="w-10 h-10 text-[var(--line)]" />
                  <p className="text-xs font-semibold">No team reporting hierarchy mapped yet.</p>
                </div>
              )}
            </div>
          )}

          {/* MY ASSETS */}
          {activeTab === 'my-assets' && (
            <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-[var(--line)]">
                <div className="p-2.5 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text)]">Assigned Company Assets</h3>
                  <p className="text-xs text-[var(--muted)]">Hardware equipment, serial identifiers, and custody records</p>
                </div>
              </div>

              {assetsData.length === 0 ? (
                <div className="text-center py-12">
                  <Laptop className="h-10 w-10 text-[var(--line)] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[var(--muted)]">No assets currently assigned to your account.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[18px] border border-[var(--line)]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[var(--surface-alt)] border-b border-[var(--line)] text-[var(--muted)] font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3.5">Product Name</th>
                        <th className="p-3.5">Serial Number</th>
                        <th className="p-3.5">Assigned Date</th>
                        <th className="p-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {assetsData.map((asset, i) => (
                        <tr key={asset.id || i} className="hover:bg-[var(--brand-tint)]/15 transition-colors">
                          <td className="p-3.5 font-semibold text-[var(--text)]">
                            {asset.name}
                            <div className="text-[11px] text-[var(--muted)] font-normal">{asset.category}</div>
                          </td>
                          <td className="p-3.5 text-[var(--text)] font-semibold">{asset.serial_number || '-'}</td>
                          <td className="p-3.5 text-[var(--muted)]">{formatDate(asset.created_at)}</td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center rounded-full bg-[#E6F6EC] text-[#1F9D55] px-2.5 py-0.5 text-[11px] font-semibold capitalize">
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
            <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-[var(--line)]">
                <div className="p-2.5 rounded-[14px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text)]">Career Timeline &amp; Anniversaries</h3>
                  <p className="text-xs text-[var(--muted)]">Milestones, promotion log, and organization tenure</p>
                </div>
              </div>

              <div className="pt-2">
                {renderTimeline()}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 2FA Security Modal Dialog */}
      {isMfaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setIsMfaModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--surface)] rounded-[28px] border border-[var(--line)] shadow-2xl p-6 sm:p-7">
            <button
              type="button"
              onClick={() => setIsMfaModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition-colors cursor-pointer z-20 shrink-0"
              title="Close"
            >
              <X className="w-4 h-4 shrink-0" />
            </button>
            <MfaSecurityCard />
          </div>
        </div>
      )}

    </>
  );
};

export default EmployeeProfile;
