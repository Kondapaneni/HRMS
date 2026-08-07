import React, { useEffect, useState } from 'react';
import PageLoader from '../components/PageLoader';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
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

    // Clean up nulls
    const cleanData = {};
    Object.keys(emp).forEach(k => cleanData[k] = emp[k] || '');
    // Format dates for input type="date"
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
      queryClient.invalidateQueries({
        queryKey: ['admin', 'employee', id]
      });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'employees']
      });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Edit Employee</h1>
          <p className="text-sm text-slate-500 mt-1">{originalName} &mdash; {formData.employeeId}</p>
        </div>
        <button
          onClick={() => navigate(`/admin/employees/${id}`)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-10 px-4 py-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Employee
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-semibold text-slate-900">Personal Info</h3></div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">First Name <span className="text-red-500">*</span></label>
                <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Last Name <span className="text-red-500">*</span></label>
                <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Phone</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white cursor-pointer">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Marital Status</label>
                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white cursor-pointer">
                  <option value="">Select Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nationality</label>
                <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">PAN Number</label>
                <input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Date of Birth</label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Blood Group</label>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white cursor-pointer">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Emergency Contact Name</label>
                <input readOnly type="text" value={formData.emergencyContact || ''} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 outline-none cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Emergency Contact Phone</label>
                <input readOnly type="text" value={formData.emergencyPhone || ''} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 outline-none cursor-not-allowed" />
              </div>
            </div>
          </div>
        </div>

        {/* Work Info */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-semibold text-slate-900">Work Info</h3></div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Work Email</label>
                <input type="email" name="workEmail" value={formData.workEmail} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Position <span className="text-red-500">*</span></label>
                <input required type="text" name="position" value={formData.position} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Department <span className="text-red-500">*</span></label>
                <input required type="text" name="department" value={formData.department} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Branch</label>
                <select name="branch" value={formData.branch} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white cursor-pointer">
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 relative">
                <label className="text-sm font-medium text-slate-700">Manager</label>
                <input 
                  type="text" 
                  value={managerSearch} 
                  onChange={(e) => {
                    setManagerSearch(e.target.value);
                    setFormData(prev => ({ ...prev, managerId: '' }));
                    setShowManagerDropdown(true);
                  }}
                  onFocus={() => setShowManagerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowManagerDropdown(false), 200)}
                  placeholder="Search by name or ID..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                {showManagerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    <div 
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 text-slate-700"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, managerId: '' }));
                        setManagerSearch('');
                        setShowManagerDropdown(false);
                      }}
                    >
                      No Manager
                    </div>
                    {filteredManagers.map(m => (
                      <div 
                        key={m.id}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 text-slate-700"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, managerId: m.id }));
                          setManagerSearch(`${m.firstName} ${m.lastName} (${m.employeeId})`);
                          setShowManagerDropdown(false);
                        }}
                      >
                        {m.firstName} {m.lastName} ({m.employeeId})
                      </div>
                    ))}
                    {filteredManagers.length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-500">No matching employees</div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Employment Type</label>
                <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white cursor-pointer">
                  <option value="">Select Type</option>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="freelancer">Freelancer</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Notice Period (Days)</label>
                <input type="number" name="noticePeriod" value={formData.noticePeriod} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Salary (Annually)</label>
                <input type="number" step="0.01" name="salary" value={formData.salary} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Join Date</label>
                <input type="date" name="joinDate" value={formData.joinDate} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Work Shift */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-semibold text-slate-900">Work Shift</h3></div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Shift Time</label>
                <select name="shiftTime" value={formData.shiftTime} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                  <option value="">Select shift</option>
                  {shifts.map(s => (
                    <option key={s.id} value={s.shiftLabel}>{s.shiftLabel}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Work Mode</label>
                <select name="workMode" value={formData.workMode} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white cursor-pointer">
                  <option value="">Select Mode</option>
                  <option value="office">Office</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Week Off</label>
                <select name="weekOff" value={formData.weekOff} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white cursor-pointer">
                  <option value="">Select Day</option>
                  <option value="Sunday">Sunday</option>
                  <option value="Monday">Monday</option>
                  <option value="Saturday">Saturday</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8">
          <button type="button" onClick={() => navigate(`/admin/employees/${id}`)} className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-md text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center cursor-pointer disabled:cursor-not-allowed">
            {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminEmployeeEdit;
