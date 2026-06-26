import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { Users, Search, Calculator, ArrowLeft, Loader2, Check, AlertCircle } from 'lucide-react';

const getMonthName = (monthNum) => {
  const date = new Date();
  date.setMonth(monthNum - 1);
  return date.toLocaleString('default', { month: 'long' });
};

const AdminBulkPayroll = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchPendingEmployees();
  }, [selectedMonth, selectedYear]);

  const fetchPendingEmployees = async () => {
    try {
      setIsLoading(true);
      setMessage(null);
      const res = await axios.get(`/admin/payroll/pending-employees?month=${selectedMonth}&year=${selectedYear}`);
      setEmployees(res.data.employees || []);
      setSelectedIds([]);
    } catch (error) {
      console.error("Error fetching pending employees:", error);
      setMessage({ type: 'error', text: 'Failed to fetch employees' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const searchStr = `${emp.firstName} ${emp.lastName} ${emp.employeeId}`.toLowerCase();
      return searchStr.includes(searchQuery.toLowerCase());
    });
  }, [employees, searchQuery]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredEmployees.map(emp => emp.userId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (userId) => {
    setSelectedIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleGenerateBulk = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      setIsGenerating(true);
      setMessage(null);
      const res = await axios.post('/admin/payroll/generate-bulk', {
        employeeIds: selectedIds,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear)
      });
      
      setMessage({ type: 'success', text: res.data.message });
      // Refresh the list
      fetchPendingEmployees();
    } catch (error) {
      console.error("Error generating bulk payslips:", error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to generate bulk payslips' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isAllSelected = filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin/payroll')}
          className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bulk Generate Payslips</h1>
          <p className="text-slate-500 mt-1">Generate payslips for multiple employees at once</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Month</label>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                const isFuture = parseInt(selectedYear) > currentDate.getFullYear() || (parseInt(selectedYear) === currentDate.getFullYear() && m > currentDate.getMonth() + 1);
                return (
                  <option key={m} value={m} disabled={isFuture}>
                    {getMonthName(m)}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Year</label>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {[currentDate.getFullYear() - 2, currentDate.getFullYear() - 1, currentDate.getFullYear()].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerateBulk}
              disabled={selectedIds.length === 0 || isGenerating}
              className="w-full flex justify-center items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors font-medium"
            >
              {isGenerating ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Calculator className="w-5 h-5 mr-2" /> Generate Selected ({selectedIds.length})</>
              )}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <div>
            <h4 className="font-medium">{message.type === 'success' ? 'Success' : 'Error'}</h4>
            <p className="text-sm opacity-90 mt-0.5">{message.text}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Pending Employees
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p>Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
              <Users className="w-12 h-12 text-slate-300" />
              <p className="text-lg font-medium text-slate-600">No pending employees found</p>
              <p className="text-sm">All active employees might already have payslips for this period.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-white sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-4 border-b border-slate-200 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 border-b border-slate-200 font-medium text-xs text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="py-3 px-4 border-b border-slate-200 font-medium text-xs text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="py-3 px-4 border-b border-slate-200 font-medium text-xs text-slate-500 uppercase tracking-wider">Designation</th>
                  <th className="py-3 px-4 border-b border-slate-200 font-medium text-xs text-slate-500 uppercase tracking-wider">Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map(emp => (
                  <tr key={emp.userId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(emp.userId)}
                        onChange={() => handleSelectOne(emp.userId)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{emp.firstName} {emp.lastName}</div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{emp.employeeId}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{emp.position || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{emp.branch_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBulkPayroll;
