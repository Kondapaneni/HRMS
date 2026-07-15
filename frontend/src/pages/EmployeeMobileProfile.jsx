import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Briefcase, CalendarDays, Building2,
  Shield, CreditCard, Heart, HeartHandshake, Globe, Clock3, Laptop,
  Calendar, Clock, UserCheck, Users, Camera, ChevronRight, FileText, ChevronLeft,
  Loader2, X, Save, Edit2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const EmployeeMobileProfile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fetchProfile } = useAuth();
  const [activeSection, setActiveSection] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const controls = useDragControls();

  useEffect(() => {
    const scrollContainer = document.querySelector('main > div.overflow-y-auto');
    if (activeSection) {
      document.body.style.overflow = 'hidden';
      if (scrollContainer) scrollContainer.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (scrollContainer) scrollContainer.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      if (scrollContainer) scrollContainer.style.overflow = '';
    };
  }, [activeSection]);

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

  const handleEditClick = () => {
    navigate('/employee/profile/edit');
  };

  const fullName = `${firstName || ''} ${lastName || ''}`.trim();
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';

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

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const avatarUrl = window.location.origin + "/Avatar/" + fileName;
      await api.post('/employee/profile/avatar', { avatar: avatarUrl });

      toast.success('Profile picture updated successfully!');
      queryClient.invalidateQueries(['employee', 'profile']);
      if (fetchProfile) await fetchProfile();
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
        if (anniversaryDate > now) break;
        if (profileData?.status?.toLowerCase() !== 'active' && profileData?.employmentStatusDate) {
          const exitDate = new Date(profileData.employmentStatusDate);
          if (anniversaryDate > exitDate) break;
        }
        const title = `${yearsCompleted}${yearsCompleted === 1 ? 'st' : yearsCompleted === 2 ? 'nd' : yearsCompleted === 3 ? 'rd' : 'th'} Work Anniversary`;
        if (!history.some(e => e.title === title)) {
          history.push({
            date: anniversaryDate.toISOString().split('T')[0],
            title: title,
            description: `Completed ${yearsCompleted} year${yearsCompleted > 1 ? 's' : ''} at Acme Corp!`
          });
        }
      }
    }
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
              <time className="text-sm text-slate-500 font-medium">{formatDate(event.date)}</time>
            </div>
            <p className="text-sm text-slate-600">{event.description}</p>
          </div>
        ))}
      </div>
    );
  };
  const sections = [
    { id: 'personal', label: 'Personal Information', icon: User, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'work', label: 'Work Information', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'shift', label: 'Work Shift', icon: Clock3, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'emergency', label: 'Emergency Contact', icon: Shield, color: 'text-rose-500', bg: 'bg-rose-50' },
    { id: 'my-team', label: 'My Team', icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { id: 'assets', label: 'My Assets', icon: Laptop, color: 'text-teal-500', bg: 'bg-teal-50' },
    { id: 'timeline', label: 'Timeline', icon: Clock, color: 'text-indigo-500', bg: 'bg-indigo-50' }
  ];

  const DetailItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{value || 'Not set'}</p>
      </div>
    </div>
  );

  const TeamMemberCard = ({ employee }) => {
    if (!employee) return null;
    const initial = `${(employee.firstName || '').charAt(0)}${(employee.lastName || '').charAt(0)}`.toUpperCase() || 'U';
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden font-bold text-slate-400 border border-slate-200 shadow-sm">
          {employee.avatar ? (
            <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 truncate">{employee.firstName} {employee.lastName}</p>
          <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{employee.position || 'Employee'}</p>
        </div>
      </div>
    );
  };

  // Render Section Content
  const renderContent = () => {
    switch (activeSection) {
      case 'personal':
        return (
          <div className="space-y-3">
            <DetailItem icon={Mail} label="Email" value={email} />
            <DetailItem icon={Phone} label="Phone" value={phone} />
            <DetailItem icon={User} label="Gender" value={<span className="capitalize">{gender}</span>} />
            <DetailItem icon={HeartHandshake} label="Marital Status" value={<span className="capitalize">{maritalStatus}</span>} />
            <DetailItem icon={Globe} label="Nationality" value={nationality} />
            <DetailItem icon={MapPin} label="Address" value={address} />
            <DetailItem icon={CreditCard} label="PAN Number" value={<span className="uppercase">{panNumber}</span>} />
            <DetailItem icon={CalendarDays} label="Date of Birth" value={formatDate(dateOfBirth)} />
            <DetailItem icon={Heart} label="Blood Group" value={bloodGroup} />
          </div>
        );
      case 'work':
        return (
          <div className="space-y-3">
            <DetailItem icon={Shield} label="Employee ID" value={employeeId} />
            <DetailItem icon={Mail} label="Work Email" value={workEmail} />
            <DetailItem icon={CalendarDays} label="Join Date" value={formatDate(joinDate)} />
            <DetailItem icon={Briefcase} label="Position" value={position} />
            <DetailItem icon={Building2} label="Department" value={department} />
            <DetailItem icon={Building2} label="Branch" value={branch_name || branch} />
            <DetailItem icon={UserCheck} label="Manager" value={teamData?.manager ? `${teamData.manager.firstName} ${teamData.manager.lastName}` : 'Not set'} />
            <DetailItem icon={Shield} label="Employment Type" value={formatEnum(employmentType)} />
            <DetailItem icon={Clock} label="Notice Period" value={noticePeriod ? `${noticePeriod} Days` : 'Not set'} />
          </div>
        );
      case 'shift':
        return (
          <div className="space-y-3">
            <DetailItem icon={Clock3} label="Shift Time" value={shiftTime} />
            <DetailItem icon={Laptop} label="Work Mode" value={formatEnum(workMode)} />
            <DetailItem icon={Calendar} label="Week Off" value={weekOff} />
          </div>
        );
      case 'emergency':
        return (
          <div className="space-y-3">
            <DetailItem icon={User} label="Contact Name" value={emergencyContact} />
            <DetailItem icon={Phone} label="Contact Phone" value={emergencyPhone} />
          </div>
        );
      case 'my-team':
        return (
          <div className="space-y-6">
            {!teamData ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">No team data available</p>
              </div>
            ) : (
              <>
                {teamData.manager && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Reporting Manager</h4>
                    <TeamMemberCard employee={teamData.manager} />
                  </div>
                )}
                
                {teamData.peers?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Peers</h4>
                    <div className="space-y-3">
                      {teamData.peers.map(peer => <TeamMemberCard key={peer.id} employee={peer} />)}
                    </div>
                  </div>
                )}

                {teamData.subordinates?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Direct Reports</h4>
                    <div className="space-y-3">
                      {teamData.subordinates.map(sub => <TeamMemberCard key={sub.id} employee={sub} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      case 'assets':
        return (
          <div className="space-y-3">
            {assetsData?.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                <Laptop className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">No assets assigned</p>
              </div>
            ) : (
              assetsData?.map((asset, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-800">{asset.name}</h4>
                      <p className="text-xs text-slate-500">{asset.category}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-200 text-slate-700 rounded-full">
                      {asset.status}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                    S/N: {asset.serial_number || 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 'timeline':
        return (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
            {renderTimeline()}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="relative pb-6">
      {/* Top Header Section with Animated Motion Graphics */}
      <div className="-mx-4 -mt-4 px-4 pt-8 pb-20 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#ff928b] rounded-full mix-blend-screen filter blur-[40px] opacity-60"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -40, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-[#7bdff2] rounded-full mix-blend-screen filter blur-[40px] opacity-60"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-[#84dcc6] rounded-full mix-blend-screen filter blur-[50px] opacity-50"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2 flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">My Account</p>
            <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm mb-0.5">Profile</h1>
          </div>
          <button
            onClick={handleEditClick}
            className="flex items-center gap-1.5 text-xs font-black bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl backdrop-blur-md transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-95 border border-white/20"
          >
            <Edit2 size={14} strokeWidth={3} />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Profile Card overlapping header */}
      <div className="bg-white rounded-[24px] shadow-lg p-5 -mt-12 relative z-20 mx-1 border border-slate-100/50">
        <div className="flex flex-col items-center">
          <div className="relative -mt-12 mb-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-slate-100 overflow-hidden flex items-center justify-center text-3xl font-bold text-slate-400 relative">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Camera Upload Button Badge */}
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center text-white cursor-pointer shadow-md active:scale-95 transition-transform z-10">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900">{fullName}</h2>
          <p className="text-sm font-medium text-slate-500">{position || 'Employee'}</p>

          <div className="flex gap-2 mt-4 w-full">
            <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">ID</p>
              <p className="font-semibold text-slate-700">{employeeId || '-'}</p>
            </div>
            <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Dept</p>
              <p className="font-semibold text-slate-700 truncate px-1">{department || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="mt-6 space-y-3 px-1">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className="w-full bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${section.bg} ${section.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="font-semibold text-slate-800 text-left">{section.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </button>
          )
        })}
      </div>

      {/* Detail Slide-Over Modal */}
      <AnimatePresence>
        {activeSection && (
          <div className="fixed inset-x-0 top-0 bottom-[100px] z-[100] flex flex-col justify-end overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSection(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              drag="y"
              dragControls={controls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100 || info.velocity.y > 400) {
                  setActiveSection(null);
                }
              }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-2xl h-[65dvh] flex flex-col"
            >
              <div
                className="shrink-0 pt-3 pb-4 flex flex-col items-center cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => controls.start(e)}
                style={{ touchAction: 'none' }}
              >
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-4 pointer-events-none"></div>
                <div className="px-6 w-full flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">
                    {sections.find(s => s.id === activeSection)?.label}
                  </h3>
                  <button
                    onClick={() => setActiveSection(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-8 overscroll-contain">
                {renderContent()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Fullscreen Modal (Removed) */}
    </div>
  );
};

export default EmployeeMobileProfile;
