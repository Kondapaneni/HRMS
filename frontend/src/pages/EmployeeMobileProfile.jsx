import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import {
  User, Mail, Phone, MapPin, Briefcase, CalendarDays, Building2,
  Shield, CreditCard, Heart, HeartHandshake, Globe, Clock3, Laptop,
  Calendar, Clock, UserCheck, Users, Camera, ChevronRight, FileText,
  X, Edit2, Sparkles, Building, ScanFace, Trash2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const EmployeeMobileProfile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fetchProfile } = useAuth();
  const [activeSection, setActiveSection] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const controls = useDragControls();

  useEffect(() => {
    if (activeSection || isResetModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('hide-mobile-nav');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('hide-mobile-nav');
    };
  }, [activeSection, isResetModalOpen]);

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

  const handleEditClick = () => {
    navigate('/employee/profile/edit');
  };

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

  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Employee';
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';

  const formatEnum = (val) => {
    if (!val) return 'Not set';
    return val.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatDate = (val) => {
    if (!val) return 'Not set';
    return new Date(val).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
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

      toast.success('Profile photo updated successfully!');
      queryClient.invalidateQueries(['employee', 'profile']);
      if (fetchProfile) await fetchProfile();
    } catch (error) {
      toast.error(error.message || 'Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };

  const sections = [
    { id: 'personal', label: 'Personal Details', icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'biometrics', label: 'Face Biometrics & Security', icon: ScanFace, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'work', label: 'Work Information', icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'shift', label: 'Shift & Working Hours', icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'emergency', label: 'Emergency Contact', icon: Shield, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'my-team', label: 'My Team & Manager', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'assets', label: 'Assigned Assets', icon: Laptop, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'timeline', label: 'Career Timeline', icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' }
  ];

  const DetailItem = ({ icon: Icon, label, value }) => {
    const currentSection = sections.find(s => s.id === activeSection);
    const iconColor = currentSection?.color || 'text-blue-600';
    const iconBg = currentSection?.bg || 'bg-blue-50';

    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
        <div className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-2xs`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-xs font-bold text-slate-800 break-words mt-0.5">
            {value || <span className="text-slate-400 font-normal italic">Not provided</span>}
          </p>
        </div>
      </div>
    );
  };

  const TeamMemberCard = ({ employee }) => {
    if (!employee) return null;
    const initial = `${(employee.firstName || '').charAt(0)}${(employee.lastName || '').charAt(0)}`.toUpperCase() || 'U';
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 overflow-hidden font-bold text-blue-600 border border-blue-100 shadow-2xs">
          {employee.avatar ? (
            <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-800 truncate">{employee.firstName} {employee.lastName}</p>
          <p className="text-[10px] font-medium text-slate-400 truncate">{employee.position || 'Employee'}</p>
        </div>
      </div>
    );
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
        const title = `${yearsCompleted}${yearsCompleted === 1 ? 'st' : yearsCompleted === 2 ? 'nd' : yearsCompleted === 3 ? 'rd' : 'th'} Work Anniversary`;
        if (!history.some(e => e.title === title)) {
          history.push({
            date: anniversaryDate.toISOString().split('T')[0],
            title: title,
            description: `Completed ${yearsCompleted} year${yearsCompleted > 1 ? 's' : ''} at Acme HRMS!`
          });
        }
      }
    }
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div className="relative border-l-2 border-slate-200 ml-3 space-y-4">
        {history.map((event, idx) => (
          <div key={idx} className="relative pl-5">
            <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100" />
            <div className="flex items-center justify-between mb-0.5">
              <h4 className="text-xs font-bold text-slate-800">{event.title}</h4>
              <time className="text-[10px] text-slate-400 font-medium">{formatDate(event.date)}</time>
            </div>
            <p className="text-[11px] text-slate-500">{event.description}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'personal':
        return (
          <div className="space-y-2.5">
            <DetailItem icon={Mail} label="Personal Email" value={email} />
            <DetailItem icon={Phone} label="Phone Number" value={phone} />
            <DetailItem icon={User} label="Gender" value={<span className="capitalize">{gender}</span>} />
            <DetailItem icon={HeartHandshake} label="Marital Status" value={<span className="capitalize">{maritalStatus}</span>} />
            <DetailItem icon={Globe} label="Nationality" value={nationality} />
            <DetailItem icon={MapPin} label="Residential Address" value={address} />
            <DetailItem icon={CreditCard} label="PAN Number" value={<span className="uppercase">{panNumber}</span>} />
            <DetailItem icon={CalendarDays} label="Date of Birth" value={formatDate(dateOfBirth)} />
            <DetailItem icon={Heart} label="Blood Group" value={bloodGroup} />
          </div>
        );
      case 'biometrics':
        return (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border ${isFaceRegistered ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'} space-y-3`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${isFaceRegistered ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'} flex items-center justify-center shrink-0`}>
                  <ScanFace className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isFaceRegistered ? 'bg-emerald-200/60 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {isFaceRegistered ? 'Registered & Active' : 'Not Registered'}
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {isFaceRegistered ? 'Face Biometrics Active' : 'Face Biometrics Not Configured'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                {isFaceRegistered 
                  ? `Your face recognition descriptor is active for biometric punch-in and fast authentication.${biometricsUpdatedAt ? ` (Updated: ${formatDate(biometricsUpdatedAt)})` : ''}`
                  : 'Register your face to enable camera-based login and contactless attendance punch verification.'
                }
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {isFaceRegistered ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection(null);
                      navigate('/employee/face-registration');
                    }}
                    className="w-full py-3.5 px-4 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.98] text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Re-scan / Update Face</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(true)}
                    className="w-full py-3.5 px-4 rounded-full bg-[#fce8e6] hover:bg-[#fad2cf] active:scale-[0.98] text-[#d93025] border border-[#fad2cf] text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove Face Biometrics</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection(null);
                    navigate('/employee/face-registration');
                  }}
                  className="w-full py-3.5 px-4 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.98] text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <ScanFace className="w-4 h-4" />
                  <span>Register Face Biometrics</span>
                </button>
              )}
            </div>
          </div>
        );
      case 'work':
        return (
          <div className="space-y-2.5">
            <DetailItem icon={Shield} label="Employee ID" value={employeeId} />
            <DetailItem icon={Mail} label="Official Work Email" value={workEmail} />
            <DetailItem icon={CalendarDays} label="Date of Joining" value={formatDate(joinDate)} />
            <DetailItem icon={Briefcase} label="Designation" value={position} />
            <DetailItem icon={Building2} label="Department" value={department} />
            <DetailItem icon={Building} label="Branch Location" value={branch_name || branch} />
            <DetailItem icon={UserCheck} label="Reporting Manager" value={teamData?.manager ? `${teamData.manager.firstName} ${teamData.manager.lastName}` : 'Not set'} />
            <DetailItem icon={Shield} label="Employment Type" value={formatEnum(employmentType)} />
            <DetailItem icon={Clock} label="Notice Period" value={noticePeriod ? `${noticePeriod} Days` : 'Not set'} />
          </div>
        );
      case 'shift':
        return (
          <div className="space-y-2.5">
            <DetailItem icon={Clock3} label="Assigned Shift Time" value={shiftTime} />
            <DetailItem icon={Laptop} label="Work Mode" value={formatEnum(workMode)} />
            <DetailItem icon={Calendar} label="Weekly Offs" value={weekOff} />
          </div>
        );
      case 'emergency':
        return (
          <div className="space-y-2.5">
            <DetailItem icon={User} label="Contact Name" value={emergencyContact} />
            <DetailItem icon={Phone} label="Emergency Phone" value={emergencyPhone} />
          </div>
        );
      case 'my-team':
        return (
          <div className="space-y-3">
            {teamData?.manager && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reporting Manager</p>
                <TeamMemberCard employee={teamData.manager} />
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Department Colleagues ({teamData?.peers?.length || 0})</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {teamData?.peers?.length ? (
                  teamData.peers.map((peer) => (
                    <TeamMemberCard key={peer.id} employee={peer} />
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">No colleagues found.</p>
                )}
              </div>
            </div>
          </div>
        );
      case 'assets':
        return (
          <div className="space-y-2.5">
            {!assetsData || assetsData.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100">
                <Laptop className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">No company assets assigned.</p>
              </div>
            ) : (
              assetsData.map((asset, i) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{asset.name}</h4>
                      <p className="text-[10px] text-slate-400">{asset.category}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                      {asset.status}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 bg-white p-2 rounded-xl border border-slate-200">
                    S/N: {asset.serial_number || 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 'timeline':
        return (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            {renderTimeline()}
          </div>
        );
      default: return null;
    }
  };

  if (loading) return <PageLoader message="Loading Profile Data..." />;

  return (
    <div className="space-y-6 pb-4">

      {/* Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
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

        <div className="relative z-10 px-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 drop-shadow-md">My Profile</p>
              <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Account &amp; Info</h2>
              <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Personal credentials, settings &amp; assets</p>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Identity Card (Elevated Floating Card) */}
      <section className="bg-white rounded-[1.5rem] border border-slate-100 shadow-md p-5 relative z-20 -mt-12 mx-0.5 space-y-4">
        <div className="flex flex-col items-center text-center space-y-3">
          
          {/* Avatar Container with Upload Badge */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-2 border-slate-100 shadow-sm bg-slate-50 overflow-hidden flex items-center justify-center text-xl font-black text-slate-700">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <label className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 hover:bg-blue-700 border-2 border-white rounded-full flex items-center justify-center text-white cursor-pointer shadow-xs active:scale-95 transition-all">
              <Camera className="w-3.5 h-3.5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">{fullName}</h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">{position || 'Employee'}</p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={handleEditClick}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-900 text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-900" />
              <span>Edit Profile</span>
            </button>

            {isFaceRegistered ? (
              <button
                type="button"
                onClick={() => setActiveSection('biometrics')}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 active:scale-95 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Face ID Active</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/employee/face-registration')}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 active:scale-95 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <ScanFace className="w-3.5 h-3.5 text-indigo-600" />
                <span>Set Up Face ID</span>
              </button>
            )}
          </div>

          {/* Compact 2-column details with vibrant themed colors */}
          <div className="grid grid-cols-2 gap-2.5 w-full pt-2 border-t border-slate-100">
            <div className="bg-[#e8f0fe] rounded-2xl p-2.5 text-center border border-[#d2e3fc]">
              <p className="text-[9px] uppercase font-bold text-[#1a73e8] tracking-wider">Employee ID</p>
              <p className="font-black text-xs text-[#1a73e8] mt-0.5">{employeeId || '-'}</p>
            </div>
            <div className="bg-[#f3e8fd] rounded-2xl p-2.5 text-center border border-[#e9d2fd]">
              <p className="text-[9px] uppercase font-bold text-[#8430ce] tracking-wider">Department</p>
              <p className="font-black text-xs text-[#8430ce] mt-0.5 truncate">{department || '-'}</p>
            </div>
          </div>

        </div>
      </section>

      {/* Profile Section Navigation Cards */}
      <section className="space-y-3">
        <div className="px-1">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Profile Categories</h3>
        </div>

        <div className="space-y-2.5">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className="w-full bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm flex items-center justify-between hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${section.bg} ${section.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800">{section.label}</span>
                    {section.id === 'biometrics' && (
                      <p className="text-[10px] font-semibold text-slate-400">
                        {isFaceRegistered ? 'Configured & Active' : 'Not Configured'}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Mobile Profile Version Footer */}
      <div className="pt-3 pb-6 text-center select-none space-y-1">
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
          <span className="text-[11px] font-bold text-slate-500 tracking-wide">
            Acme HRMS {import.meta.env.VITE_APP_SEMVER || 'v2.4.0'}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">
          Build {import.meta.env.VITE_APP_VERSION || '2026.08.28'}
        </p>
      </div>

      {/* Slide-Up Bottom Sheet Drawer (Mounted via createPortal with Framer Motion) */}
      {createPortal(
        <AnimatePresence>
          {activeSection && (
            <div className="fixed inset-0 z-[10000] flex flex-col justify-end">
              {/* Smooth Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={() => setActiveSection(null)}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
              />

              {/* Smooth Slide-Up Sheet with Drag Down To Close */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
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
                className="bg-white rounded-t-[2rem] shadow-2xl border-t border-slate-200 w-full max-w-md mx-auto max-h-[85vh] flex flex-col overflow-hidden relative z-10"
              >
                {/* Top Drag Indicator Area */}
                <div 
                  className="w-full pt-3 pb-2 flex flex-col items-center cursor-grab active:cursor-grabbing select-none shrink-0"
                  onPointerDown={(e) => controls.start(e)}
                  style={{ touchAction: 'none' }}
                >
                  <div className="w-12 h-1.5 bg-slate-300 rounded-full pointer-events-none" />
                </div>

                {/* Bottom Sheet Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-2.5">
                    {(() => {
                      const current = sections.find(s => s.id === activeSection);
                      const Icon = current?.icon || User;
                      return (
                        <div className={`w-8 h-8 rounded-full ${current?.bg || 'bg-blue-50'} ${current?.color || 'text-blue-600'} flex items-center justify-center shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {sections.find(s => s.id === activeSection)?.label}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {renderContent()}
                </div>

                {/* Bottom Close Button */}
                <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveSection(null)}
                    className="w-full py-3 px-4 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] text-sm font-semibold transition-all cursor-pointer text-center active:scale-[0.98]"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Remove Biometrics Confirmation Modal */}
      {createPortal(
        <AnimatePresence>
          {isResetModalOpen && (
            <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isResetting && setIsResetModalOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl border border-[#e0e3e7] overflow-hidden z-10 p-6 text-center space-y-4"
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

    </div>
  );
};

export default EmployeeMobileProfile;
