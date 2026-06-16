import React, { useState } from 'react';
import { 
  User, Mail, Phone, MapPin, Briefcase, CalendarDays, Building2,
  Shield, CreditCard, Heart, HeartHandshake, Globe, Clock3, Laptop,
  Calendar, Clock, UserCheck, Users, Search, Edit3, ChevronDown, ChevronUp, Camera
} from 'lucide-react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { supabase } from '../api/supabase';
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
    workMode = '', weekOff = '', emergencyContact = '', emergencyPhone = '', avatar = '', timeline = ''
  } = profileData || {};

  const fullName = `${firstName || ''} ${lastName || ''}`.trim();
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';

  const tabs = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'work', label: 'Work Info' },
    { id: 'work-shift', label: 'Work Shift' },
    { id: 'emergency', label: 'Emergency' },
    { id: 'my-team', label: 'My Team' },
    { id: 'my-assets', label: 'My Assets' },
    { id: 'timeline', label: 'Timeline' },
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

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = data.publicUrl;

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
      // Ensure "Joined Company" is always present if not already added
      const hasJoined = history.some(e => e.title === 'Joined Company');
      if (!hasJoined && joinDate) {
        history.unshift({ date: joinDate, title: 'Joined Company', description: `Started as ${position || 'Employee'}` });
      }
    }

    // Dynamically calculate work anniversaries
    if (joinDate) {
      const join = new Date(joinDate);
      const now = new Date();
      // If inactive, we could theoretically stop at an exit date, but here we'll just stop at the current date
      // or realistically not add new anniversaries after they become inactive.
      
      let yearsCompleted = 0;
      while (true) {
        yearsCompleted++;
        const anniversaryDate = new Date(join);
        anniversaryDate.setFullYear(join.getFullYear() + yearsCompleted);
        
        if (anniversaryDate > now) {
           break; // Stop if the anniversary is in the future
        }
        
        // Check if employee is inactive and anniversary is after they likely left
        if (profileData?.status?.toLowerCase() !== 'active' && profileData?.employmentStatusDate) {
           const exitDate = new Date(profileData.employmentStatusDate);
           if (anniversaryDate > exitDate) {
               break;
           }
        }
        
        // Check if this anniversary is already manually stored to avoid duplicates
        const title = `${yearsCompleted}${yearsCompleted === 1 ? 'st' : yearsCompleted === 2 ? 'nd' : yearsCompleted === 3 ? 'rd' : 'th'} Work Anniversary`;
        const exists = history.some(e => e.title === title);
        
        if (!exists) {
           history.push({
             date: anniversaryDate.toISOString().split('T')[0],
             title: title,
             description: `Completed ${yearsCompleted} year${yearsCompleted > 1 ? 's' : ''} at Acme Corp!`
           });
        }
      }
    }

    // Sort history by date descending
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div className="relative border-l border-slate-200 ml-3 space-y-6">
        {history.map((event, idx) => (
          <div key={idx} className="relative pl-6">
            <div className="absolute -left-1.5 mt-1.5 flex h-3 w-3 items-center justify-center">
              {idx === 0 && <span className="absolute h-5 w-5 animate-ping rounded-full bg-blue-400 opacity-75"></span>}
              <span className="relative h-3 w-3 rounded-full bg-blue-500 border-2 border-white ring-4 ring-slate-50"></span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1">
              <h4 className="font-semibold text-slate-900">{event.title}</h4>
              <time className="text-sm text-slate-500 font-medium">
                {formatDate(event.date)}
              </time>
            </div>
            <p className="text-sm text-slate-600">{event.description}</p>
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
      <div className={`relative mt-6 mb-2 flex flex-col items-center rounded-xl border border-slate-200 ${isSelf ? 'bg-blue-50 ring-2 ring-blue-300 scale-105' : 'bg-white'} shadow-sm min-w-[200px] max-w-[240px] transition-all duration-300 hover:shadow-md hover:-translate-y-1 z-10 mx-auto group pb-4`}>
        {/* Floating Avatar */}
        <div className="absolute -top-6 w-12 h-12 rounded-full bg-white flex items-center justify-center p-0.5 border border-slate-200 shadow-sm z-20 transition-transform group-hover:scale-110">
          <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm overflow-hidden">
            {employee.avatar ? (
              <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              getInitials(employee.firstName, employee.lastName)
            )}
          </div>
        </div>
        
        {/* Card Content */}
        <div className="pt-8 px-4 w-full text-center">
          <div className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
            {employee.firstName} {employee.lastName}
          </div>
          <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
            {employee.position || 'Employee'}
          </div>
        </div>

        {/* Expand/Collapse Pill */}
        {hasChildren && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30">
            <button 
              onClick={toggleExpand}
              className="flex items-center justify-center gap-1 bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 px-3 py-1 rounded-full shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer w-max"
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
    const totalReports = (peers?.length || 0) + 1; // peers + me
  
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
          lineColor={'#cbd5e1'}
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
        lineColor={'#cbd5e1'}
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
          lineColor={'#cbd5e1'}
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
        lineColor={'#cbd5e1'}
        lineBorderRadius={'8px'}
        lineHeight={'40px'}
        nodePadding={'20px'}
        label={meContent}
      />
    );
  };

  return (
    <>
      <div className="md:hidden">
        <EmployeeMobileProfile />
      </div>
      <div className="hidden md:block space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-1">View your personal and work information</p>
        </div>
        <button 
          onClick={() => navigate('/employee/profile/edit')}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors shadow-sm"
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Edit Profile
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group cursor-pointer">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 border border-slate-200 overflow-hidden text-2xl font-medium text-slate-600 relative">
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
                      <Camera className="h-6 w-6 mb-1" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">Upload</span>
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
              <h2 className="text-2xl font-bold text-slate-900">{fullName}</h2>
              <p className="text-slate-500 font-medium">{position || 'Employee'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                {department && <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs font-semibold">{department}</span>}
                {employeeId && <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">ID: {employeeId}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar space-x-1 border-b border-slate-200 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* PERSONAL INFO */}
        {activeTab === 'personal' && (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                <User className="h-5 w-5 text-slate-500" /> Personal Information
              </h3>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-y-8 gap-x-6">
              <div className="flex gap-3">
                <Mail className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Email</p><p className="font-medium">{email || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <Phone className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Phone</p><p className="font-medium">{phone || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <User className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Gender</p><p className="font-medium capitalize">{gender || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <HeartHandshake className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Marital Status</p><p className="font-medium capitalize">{maritalStatus || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <Globe className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Nationality</p><p className="font-medium">{nationality || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Address</p><p className="font-medium">{address || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <CreditCard className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">PAN Number</p><p className="font-medium uppercase">{panNumber || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <CalendarDays className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Date of Birth</p><p className="font-medium">{formatDate(dateOfBirth)}</p></div>
              </div>
              <div className="flex gap-3">
                <Heart className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Blood Group</p><p className="font-medium">{bloodGroup || 'Not set'}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* WORK INFO */}
        {activeTab === 'work' && (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                <Briefcase className="h-5 w-5 text-slate-500" /> Work Information
              </h3>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-y-8 gap-x-6">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Employee ID</p><p className="font-medium">{employeeId || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <Mail className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Work Email</p><p className="font-medium">{workEmail || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <CalendarDays className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Join Date</p><p className="font-medium">{formatDate(joinDate)}</p></div>
              </div>
              <div className="flex gap-3">
                <Briefcase className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Position</p><p className="font-medium">{position || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <Building2 className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Department</p><p className="font-medium">{department || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <Building2 className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Branch</p><p className="font-medium">{branch_name || branch || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <UserCheck className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Manager</p><p className="font-medium">{teamData?.manager ? `${teamData.manager.firstName} ${teamData.manager.lastName}` : 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Employment Type</p><p className="font-medium">{formatEnum(employmentType)}</p></div>
              </div>
              <div className="flex gap-3">
                <Clock className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Notice Period</p><p className="font-medium">{noticePeriod ? `${noticePeriod} Days` : 'Not set'}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* WORK SHIFT */}
        {activeTab === 'work-shift' && (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                <Clock3 className="h-5 w-5 text-slate-500" /> Work Shift
              </h3>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-y-8 gap-x-6">
              <div className="flex gap-3">
                <Clock3 className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Shift Time</p><p className="font-medium">{shiftTime || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <Laptop className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Work Mode</p><p className="font-medium">{formatEnum(workMode)}</p></div>
              </div>
              <div className="flex gap-3">
                <Calendar className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Week Off</p><p className="font-medium">{weekOff || 'Not set'}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* EMERGENCY */}
        {activeTab === 'emergency' && (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                <Shield className="h-5 w-5 text-slate-500" /> Emergency Contact
              </h3>
              <p className="text-sm text-slate-500 mt-1">Contact details in case of emergency</p>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-y-8 gap-x-6">
              <div className="flex gap-3">
                <User className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Contact Name</p><p className="font-medium">{emergencyContact || 'Not set'}</p></div>
              </div>
              <div className="flex gap-3">
                <Phone className="h-5 w-5 text-slate-400 shrink-0" />
                <div><p className="text-sm text-slate-500">Contact Phone</p><p className="font-medium">{emergencyPhone || 'Not set'}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* MY TEAM */}
        {activeTab === 'my-team' && (
          <div className="h-[600px] bg-slate-50/50 border border-slate-200 rounded-xl overflow-hidden relative shadow-inner cursor-grab active:cursor-grabbing">
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
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>No team data available.</p>
              </div>
            )}
          </div>
        )}

        {/* MY ASSETS */}
        {activeTab === 'my-assets' && (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
             <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                <Laptop className="h-5 w-5 text-slate-500" /> My Assets
              </h3>
              <p className="text-sm text-slate-500 mt-1">Assets currently assigned to you</p>
            </div>
            <div className="p-6 pt-0">
              {assetsData.length === 0 ? (
                <div className="text-center py-12">
                  <Laptop className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">No assets assigned.</p>
                </div>
              ) : (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                      <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3">Serial Number</th>
                        <th className="p-3">Assigned On</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assetsData.map((asset, i) => (
                        <tr key={asset.id || i} className="border-b border-slate-100 last:border-0">
                          <td className="p-3 font-medium text-slate-800">
                            {asset.name}
                            <div className="text-xs text-slate-500 font-normal">{asset.category}</div>
                          </td>
                          <td className="p-3 text-slate-600 font-mono text-sm">{asset.serial_number || '-'}</td>
                          <td className="p-3 text-slate-600">{formatDate(asset.created_at)}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                              {asset.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                <Clock className="h-5 w-5 text-slate-500" /> Timeline
              </h3>
              <p className="text-sm text-slate-500 mt-1">Complete history of your employment changes.</p>
            </div>
            <div className="p-6">
              {renderTimeline()}
            </div>
          </div>
        )}

      </div>
    </div>
    </>
  );
};

export default EmployeeProfile;
