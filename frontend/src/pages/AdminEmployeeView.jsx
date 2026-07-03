import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Settings, User, Mail, Phone, MapPin, Briefcase,
  CalendarDays, Building2, Shield, CreditCard, HeartHandshake, Globe,
  Clock, Laptop, Droplets, Heart, Download, Camera
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pdf } from '@react-pdf/renderer';
import PayslipPDF from '../components/PayslipPDF';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const AdminEmployeeView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');
  const [isUploading, setIsUploading] = useState(false);

  const { data, isLoading: loading, isFetching } = useQuery({
    queryKey: ['admin', 'employee', id],
    queryFn: async () => {
      const res = await api.get(`/admin/employees/${id}`);
      return res.data;
    },
    onError: () => toast.error('Failed to load employee details.'),
  });

  // ... (PayslipPDF logic)
  const handleDownload = async (payslip) => {
    try {
      const blob = await pdf(<PayslipPDF payslip={payslip} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const getMonthName = (monthNum) => {
        const date = new Date();
        date.setMonth(monthNum - 1);
        return date.toLocaleString('default', { month: 'long' });
      };
      link.download = `${payslip.employeeName.replace(/[^a-zA-Z0-9 _-]/g, '')} - Payslip - ${getMonthName(payslip.month)} ${payslip.year}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  if (loading || (!data && isFetching)) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (!data || !data.employee) {
    return <div className="text-center py-12 text-slate-500">Employee not found.</div>;
  }

  const { employee, leaveBalance, recentPayslips, assets } = data;

  const {
    firstName = '', lastName = '', email = '', phone = '', address = '', position = '', department = '', branch = '', branch_name = '',
    employeeId = '', dateOfBirth = '', bloodGroup = '', gender = '', maritalStatus = '', nationality = '',
    joinDate = '', workEmail = '', panNumber = '', employmentType = '', noticePeriod = '', shiftTime = '',
    workMode = '', weekOff = '', emergencyContact = '', emergencyPhone = '', avatar = '', timeline = '',
    status = 'active', managerId = ''
  } = employee;

  const fullName = `${firstName} ${lastName}`.trim();
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const tabs = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'work', label: 'Work Info' },
    { id: 'work-shift', label: 'Work Shift' },
    { id: 'emergency', label: 'Emergency' },
    { id: 'asset', label: 'Asset' },
    { id: 'timeline', label: 'Timeline' },
  ];

  const formatDate = (val) => {
    if (!val) return 'Not set';
    return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (st) => {
    switch (st?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'exited': case 'terminated': case 'absconded': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
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

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const avatarUrl = window.location.origin + "/Avatar/" + fileName;

      await api.put(`/admin/employees/${id}`, { avatar: avatarUrl });
      
      queryClient.invalidateQueries(['admin', 'employee', id]);
      toast.success('Profile picture updated successfully!');
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
      // Assuming 'now' is the cap. If they are inactive, we'd cap at their last modified date, but let's just cap at today.
      
      let yearsCompleted = 0;
      while (true) {
        yearsCompleted++;
        const anniversaryDate = new Date(join);
        anniversaryDate.setFullYear(join.getFullYear() + yearsCompleted);
        
        if (anniversaryDate > now) {
           break; // Stop if the anniversary is in the future
        }
        
        // Check if employee is inactive and anniversary is after they likely left (this is a basic heuristic)
        if (status?.toLowerCase() !== 'active' && employee.employmentStatusDate) {
           const exitDate = new Date(employee.employmentStatusDate);
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
      <div className="relative border-l border-slate-200 ml-3 space-y-6 mt-4">
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{fullName}</h1>
          <p className="text-sm text-slate-500 mt-1">{employeeId} &mdash; {department}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/admin/employees/${id}/edit`)} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors cursor-pointer">
            <Edit3 className="w-4 h-4 mr-2" /> Edit
          </button>
          <button onClick={() => navigate(`/admin/employees/${id}/settings`)} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors cursor-pointer">
            <Settings className="w-4 h-4 mr-2" /> Settings
          </button>
          <button onClick={() => navigate('/admin/employees')} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Employees
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative group cursor-pointer h-20 w-20 mx-auto">
                  <div className="h-full w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200 text-xl font-medium text-slate-600 flex items-center justify-center">
                    {avatar ? <img src={avatar} alt="Avatar" className="h-full w-full object-cover" /> : initials}
                  </div>
                  <label className="absolute inset-0 bg-black/50 hidden group-hover:flex flex-col items-center justify-center text-white cursor-pointer transition-all rounded-full">
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Camera className="h-5 w-5" />
                        <span className="text-[9px] font-medium uppercase tracking-wider mt-0.5">Upload</span>
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
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{fullName}</h2>
                  <p className="text-slate-500">{position || 'Employee'}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${getStatusColor(status)}`}>
                  {status}
                </span>
              </div>

              <div className="mt-6 text-sm">
                <p className="text-slate-500 font-medium mb-3">Employee summary</p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xl font-bold text-blue-600">{leaveBalance?.paidTotal || 12}</p>
                    <p className="text-xs text-slate-500">Paid Total</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xl font-bold text-green-600">{(leaveBalance?.paidTotal || 12) - (leaveBalance?.paidUsed || 0)}</p>
                    <p className="text-xs text-slate-500">Remaining Paid</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xl font-bold text-red-600">{leaveBalance?.paidUsed || 0}</p>
                    <p className="text-xs text-slate-500">Paid Used</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xl font-bold text-orange-500">{leaveBalance?.unpaidUsed || 0}</p>
                    <p className="text-xs text-slate-500">Unpaid Used</p>
                  </div>
                </div>
              </div>

            </div>
            <div className="p-6 border-t border-slate-200 bg-slate-50/50 rounded-b-lg">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Recent Payslips</h3>
              {recentPayslips?.length > 0 ? (
                <div className="space-y-3">
                  {recentPayslips.map((ps, i) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-600">{new Date(ps.year, ps.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-900">₹{ps.netSalary}</span>
                        <button 
                          onClick={() => handleDownload(ps)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Download Payslip"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-2">No payslips yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Tabs */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex overflow-x-auto hide-scrollbar space-x-1 border-b border-slate-200 px-2 pt-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* PERSONAL INFO */}
              {activeTab === 'personal' && (
                <div className="grid sm:grid-cols-2 gap-y-6 gap-x-6">
                  <div className="flex gap-3"><Mail className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Email</p><p className="font-medium">{email || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><Phone className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Phone</p><p className="font-medium">{phone || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><User className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Gender</p><p className="font-medium capitalize">{gender || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><HeartHandshake className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Marital Status</p><p className="font-medium capitalize">{maritalStatus || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><Globe className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Nationality</p><p className="font-medium capitalize">{nationality || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><MapPin className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Address</p><p className="font-medium">{address || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><CreditCard className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">PAN Number</p><p className="font-medium">{panNumber || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><CalendarDays className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Date of Birth</p><p className="font-medium">{formatDate(dateOfBirth)}</p></div></div>
                  <div className="flex gap-3"><Droplets className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Blood Group</p><p className="font-medium">{bloodGroup || 'Not set'}</p></div></div>
                </div>
              )}

              {/* WORK INFO */}
              {activeTab === 'work' && (
                <div className="grid sm:grid-cols-2 gap-y-6 gap-x-6">
                  <div className="flex gap-3"><Shield className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Employee ID</p><p className="font-medium">{employeeId || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><Mail className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Work Email</p><p className="font-medium">{workEmail || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><CalendarDays className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Join Date</p><p className="font-medium">{formatDate(joinDate)}</p></div></div>
                  <div className="flex gap-3"><Briefcase className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Position</p><p className="font-medium">{position || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><Building2 className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Department</p><p className="font-medium">{department || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><Building2 className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Branch</p><p className="font-medium">{branch_name || branch || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><Briefcase className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Employment Type</p><p className="font-medium capitalize">{employmentType || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><Clock className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Notice Period</p><p className="font-medium">{noticePeriod ? `${noticePeriod} days` : 'Not set'}</p></div></div>
                </div>
              )}

              {/* WORK SHIFT */}
              {activeTab === 'work-shift' && (
                <div className="grid sm:grid-cols-2 gap-y-6 gap-x-6">
                  <div className="flex gap-3"><Clock className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Shift Time</p><p className="font-medium">{shiftTime || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><MapPin className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Work Mode</p><p className="font-medium capitalize">{workMode || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><CalendarDays className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Week Off</p><p className="font-medium capitalize">{weekOff || 'Not set'}</p></div></div>
                </div>
              )}

              {/* EMERGENCY */}
              {activeTab === 'emergency' && (
                <div className="grid sm:grid-cols-2 gap-y-6 gap-x-6">
                  <div className="flex gap-3"><User className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Contact Name</p><p className="font-medium">{emergencyContact || 'Not set'}</p></div></div>
                  <div className="flex gap-3"><Phone className="h-5 w-5 text-slate-400 shrink-0" /><div><p className="text-sm text-slate-500">Contact Phone</p><p className="font-medium">{emergencyPhone || 'Not set'}</p></div></div>
                </div>
              )}

              {/* ASSET */}
              {activeTab === 'asset' && (
                <div>
                  {assets && assets.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="pb-2 font-medium">Product Name</th>
                            <th className="pb-2 font-medium">Serial Number</th>
                            <th className="pb-2 font-medium">Assigned At</th>
                            <th className="pb-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {assets.map((ast, i) => (
                            <tr key={i}>
                              <td className="py-3 font-medium text-slate-900">{ast.productName}</td>
                              <td className="py-3 text-slate-600">{ast.serialNumber}</td>
                              <td className="py-3 text-slate-600">{formatDate(ast.assignedAt)}</td>
                              <td className="py-3"><span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600 capitalize">{ast.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-8">No assets assigned</p>
                  )}
                </div>
              )}

              {/* TIMELINE */}
              {activeTab === 'timeline' && renderTimeline()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEmployeeView;
