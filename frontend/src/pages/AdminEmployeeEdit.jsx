import React, { useEffect, useState } from 'react';
import PageLoader from '../components/PageLoader';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Briefcase, Clock, IndianRupee, Shield, Building2, CheckCircle2, ChevronDown } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const AdminEmployeeEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [managerSearch, setManagerSearch] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

  const employeeQuery = useQuery({
    queryKey: ['admin', 'employee', id],
    queryFn: async () => {
      const res = await api.get(`/admin/employees/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  const managersQuery = useQuery({
    queryKey: ['admin', 'employees-dropdown'],
    queryFn: async () => {
      const res = await api.get('/admin/employees');
      return res.data.employees || [];
    }
  });

  const branchesQuery = useQuery({
    queryKey: ['admin', 'branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.branches || [];
    }
  });

  const shiftsQuery = useQuery({
    queryKey: ['admin', 'shifttimes'],
    queryFn: async () => {
      const res = await api.get('/admin/shifttimes');
      return res.data || [];
    }
  });

  useEffect(() => {
    if (!employeeQuery.data || !employeeQuery.data.employee) return;

    const emp = employeeQuery.data.employee;

    const cleanData = {};
    Object.keys(emp).forEach(k => cleanData[k] = emp[k] || '');
    if (cleanData.dateOfBirth) cleanData.dateOfBirth = cleanData.dateOfBirth.split('T')[0];
    if (cleanData.joinDate) cleanData.joinDate = cleanData.joinDate.split('T')[0];

    setFormData(cleanData);
  }, [employeeQuery.data]);

  useEffect(() => {
    if (formData.managerId && managersQuery.data) {
      const m = managersQuery.data.find(emp => emp.id === formData.managerId);
      if (m) setManagerSearch(`${m.firstName} ${m.lastName} (${m.employeeId})`);
    } else if (!formData.managerId) {
      setManagerSearch('');
    }
  }, [formData.managerId, managersQuery.data]);

  const updateEmployeeMutation = useMutation({
    mutationFn: async () => {
      return api.put(`/admin/employees/${id}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'employee', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'performance'] });
    }
  });

  const originalName = employeeQuery.data?.employee ? `${employeeQuery.data.employee.firstName} ${employeeQuery.data.employee.lastName}` : '';
  const managers = managersQuery.data || [];
  const branches = branchesQuery.data || [];
  const shifts = shiftsQuery.data || [];

  const loading = employeeQuery.isLoading || managersQuery.isLoading || branchesQuery.isLoading || shiftsQuery.isLoading;

  const filteredManagers = managers.filter(m => {
    const searchString = `${m.firstName} ${m.lastName} ${m.employeeId}`.toLowerCase();
    return searchString.includes(managerSearch.toLowerCase());
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateEmployeeMutation.mutateAsync();
      toast.success('Employee updated successfully');
      navigate(`/admin/employees/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader message="Loading Employee Data..." />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Employee Record Modification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
            Edit Profile: <span className="font-normal italic text-[#1a73e8]">{originalName}</span> <span className="text-xs font-medium text-[#5f6368] bg-[#f1f3f4] border border-[#e0e3e7] px-2.5 py-0.5 rounded-full align-middle ml-1.5">{formData.employeeId}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Update personal information, departmental assignments, salary, and shift parameters.
          </p>
        </div>

        <button
          onClick={() => navigate(`/admin/employees/${id}`)}
          className="inline-flex items-center justify-center rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#5f6368] px-4 py-2 transition-colors cursor-pointer gap-1.5 shadow-xs shrink-0 self-start sm:self-auto"
        >
          <ArrowLeft size={14} />
          <span>Back To Employee</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info Card */}
        <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
              <User size={15} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Personal Information</h3>
              <p className="text-[11px] text-[#5f6368]">Primary contact and demographic records</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">First Name *</label>
                <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Last Name *</label>
                <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Personal Email *</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Phone Number</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Marital Status</label>
                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer">
                  <option value="">Select Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Nationality</label>
                <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Residential Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">PAN Number</label>
                <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Date of Birth</label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Blood Group</label>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#f1f3f4]">
              <div>
                <label className="block text-xs font-semibold text-[#5f6368] mb-1">Emergency Contact Name (Self-Service Managed)</label>
                <input readOnly type="text" value={formData.emergencyContact || ''} className="w-full rounded-xl border border-[#e0e3e7] bg-[#f8fafd] px-3.5 py-2 text-xs text-[#5f6368] outline-none cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5f6368] mb-1">Emergency Contact Phone (Self-Service Managed)</label>
                <input readOnly type="text" value={formData.emergencyPhone || ''} className="w-full rounded-xl border border-[#e0e3e7] bg-[#f8fafd] px-3.5 py-2 text-xs text-[#5f6368] outline-none cursor-not-allowed" />
              </div>
            </div>
          </div>
        </div>

        {/* Work Info Card */}
        <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
              <Briefcase size={15} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Work Profile & Assignments</h3>
              <p className="text-[11px] text-[#5f6368]">Position, reporting structure, and compensation</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Official Work Email</label>
                <input type="email" name="workEmail" value={formData.workEmail} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Position / Role *</label>
                <input required type="text" name="position" value={formData.position} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Department *</label>
                <input required type="text" name="department" value={formData.department} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Assigned Branch</label>
                <select name="branch" value={formData.branch} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer">
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Reporting Manager</label>
                <input 
                  type="text" 
                  value={managerSearch} 
                  onChange={(e) => {
                    setManagerSearch(e.target.value);
                    setFormData(prev => ({ ...prev, managerId: '' }));
                    setShowManagerDropdown(true);
                  }}
                  onFocus={() => setShowManagerDropdown(true)}
                  onBlur={() => setShowManagerDropdown(false)}
                  placeholder="Search manager by name or ID..."
                  className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all"
                />
                {showManagerDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-[#e0e3e7] rounded-xl shadow-lg max-h-48 overflow-y-auto p-1 text-xs">
                    <div 
                      className="px-3 py-2 rounded-lg cursor-pointer hover:bg-[#f8fafd] text-[#5f6368]"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFormData(prev => ({ ...prev, managerId: '' }));
                        setManagerSearch('');
                        setShowManagerDropdown(false);
                      }}
                    >
                      No Manager (Direct Executive)
                    </div>
                    {filteredManagers.map(m => (
                      <div 
                        key={m.id}
                        className="px-3 py-2 rounded-lg cursor-pointer hover:bg-[#e8f0fe] text-[#1f1f1f] font-medium"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFormData(prev => ({ ...prev, managerId: m.id }));
                          setManagerSearch(`${m.firstName} ${m.lastName} (${m.employeeId})`);
                          setShowManagerDropdown(false);
                        }}
                      >
                        {m.firstName} {m.lastName} <span className="text-[#5f6368] font-normal">({m.employeeId})</span>
                      </div>
                    ))}
                    {filteredManagers.length === 0 && (
                      <div className="px-3 py-2 text-xs text-[#5f6368] italic">No matching managers found</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Employment Type</label>
                <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer">
                  <option value="">Select Type</option>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="freelancer">Freelancer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Notice Period (Days)</label>
                <input type="number" name="noticePeriod" value={formData.noticePeriod} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Monthly Salary (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5f6368] text-xs font-bold pointer-events-none">₹</span>
                  <input type="number" step="0.01" name="salary" value={formData.salary} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] pl-8 pr-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Joining Date</label>
                <input type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        {/* Work Shift Card */}
        <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#f1f3f4] bg-[#f8fafd]/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center border border-[#d2e3fc]">
              <Clock size={15} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Shift & Workplace Logistics</h3>
              <p className="text-[11px] text-[#5f6368]">Shift timings, work mode, and regular off days</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Shift Time</label>
                <select name="shiftTime" value={formData.shiftTime} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer">
                  <option value="">Select shift</option>
                  {shifts.map(s => (
                    <option key={s.id} value={s.shiftLabel}>{s.shiftLabel}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Work Mode</label>
                <select name="workMode" value={formData.workMode} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer">
                  <option value="">Select Mode</option>
                  <option value="office">Office</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f1f1f] mb-1">Weekly Off Day</label>
                <select name="weekOff" value={formData.weekOff} onChange={handleChange} className="w-full rounded-xl border border-[#dadce0] px-3.5 py-2 text-xs text-[#1f1f1f] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 outline-none transition-all bg-white cursor-pointer">
                  <option value="">Select Day</option>
                  <option value="Sunday">Sunday</option>
                  <option value="Monday">Monday</option>
                  <option value="Saturday">Saturday</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button 
            type="button" 
            onClick={() => navigate(`/admin/employees/${id}`)} 
            className="px-5 py-2 text-xs font-semibold border border-[#dadce0] rounded-full text-[#444746] bg-white hover:bg-[#f1f3f4] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={saving} 
            className="px-6 py-2 text-xs font-semibold rounded-full text-white bg-[#1a73e8] hover:bg-[#1557b0] shadow-md shadow-[#4285F4]/25 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : <><Save size={14} /> <span>Save Changes</span></>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminEmployeeEdit;
