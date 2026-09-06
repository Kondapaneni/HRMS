import React, { useState, useEffect, useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { 
  Users, 
  Search, 
  Calculator, 
  ArrowLeft, 
  Loader2, 
  Check, 
  AlertCircle,
  Sparkles,
  Building2,
  Briefcase,
  Calendar,
  CheckCircle2,
  Layers,
  IndianRupee,
  CheckSquare,
  Square
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState(null);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchPendingEmployees();
  }, [selectedMonth, selectedYear, debouncedSearchQuery]);

  const fetchPendingEmployees = async () => {
    try {
      setIsLoading(true);
      setMessage(null);
      const res = await axios.get(`/admin/payroll/pending-employees?month=${selectedMonth}&year=${selectedYear}&search=${encodeURIComponent(debouncedSearchQuery)}`);
      setEmployees(res.data.employees || []);
      setSelectedIds([]);
    } catch (error) {
      console.error("Error fetching pending employees:", error);
      setMessage({ type: 'error', text: 'Failed to fetch pending employees' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = employees;

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

      toast.success(res.data.message || 'Bulk payslips generated successfully!');
      setMessage({ type: 'success', text: res.data.message || 'Bulk payslips generated successfully!' });
      // Refresh the list
      fetchPendingEmployees();
    } catch (error) {
      console.error("Error generating bulk payslips:", error);
      const errorMsg = error.response?.data?.error || 'Failed to generate bulk payslips';
      toast.error(errorMsg);
      setMessage({
        type: 'error',
        text: errorMsg
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isAllSelected = filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading && employees.length === 0) return <PageLoader message="Loading Payroll Data..." />;

  return (
    <div className="space-y-6 pb-12 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Batch Processing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight flex items-center gap-2 font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500 }}>
            Bulk Generate Payslips <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{filteredEmployees.length} Pending</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Select pay period, review pending employees, and batch calculate salary statements.
          </p>
        </div>
      </div>

      {/* Control Card */}
      <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
              Pay Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-xs text-[#1f1f1f] outline-none transition-all cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
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
            <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
              Pay Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-xs text-[#1f1f1f] outline-none transition-all cursor-pointer"
            >
              {[currentDate.getFullYear() - 2, currentDate.getFullYear() - 1, currentDate.getFullYear()].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <button
              onClick={handleGenerateBulk}
              disabled={selectedIds.length === 0 || isGenerating}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4285F4] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer h-9"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating Payslips...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Selected ({selectedIds.length})</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {message && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
          message.type === 'success' ? 'bg-[#e6f4ea] border-[#ceead6] text-[#137333]' : 'bg-[#fce8e6] border-[#fad2cf] text-[#c5221f]'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <div>
            <h4 className="font-bold">{message.type === 'success' ? 'Batch Completed' : 'Batch Error'}</h4>
            <p className="mt-0.5">{message.text}</p>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1a73e8]" />
            <h3 className="text-sm sm:text-base font-semibold text-[#1f1f1f]">Pending Employees Roster</h3>
            {selectedIds.length > 0 && (
              <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full ml-1">
                {selectedIds.length} Selected
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
            <input
              type="search"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
            />
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#5f6368] space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#4285F4]" />
              <p className="text-xs">Loading pending employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#5f6368] space-y-2">
              <div className="p-3 rounded-full bg-[#e6f4ea] text-[#137333] mb-1">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-[#1f1f1f]">All Payslips Processed</p>
              <p className="text-xs text-[#5f6368]">All active employees already have generated payslips for {getMonthName(selectedMonth)} {selectedYear}.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] uppercase font-semibold tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-[#1a73e8] border-[#dadce0] rounded-sm focus:ring-[#4285F4] cursor-pointer accent-[#1a73e8]"
                    />
                  </th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4 text-right">Base Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e3e7]">
                {filteredEmployees.map(emp => {
                  const isSelected = selectedIds.includes(emp.userId);
                  return (
                    <tr 
                      key={emp.userId} 
                      onClick={() => handleSelectOne(emp.userId)}
                      className={`hover:bg-[#f8fafd] transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#e8f0fe]/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(emp.userId)}
                          className="w-4 h-4 text-[#1a73e8] border-[#dadce0] rounded-sm focus:ring-[#4285F4] cursor-pointer accent-[#1a73e8]"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8] font-bold text-xs shrink-0">
                            {(emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')}
                          </div>
                          <span className="font-semibold text-[#1f1f1f] text-xs">
                            {emp.firstName} {emp.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-medium text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded-full">
                          {emp.employeeId}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#5f6368]">
                        {emp.position || 'Employee'}
                      </td>
                      <td className="py-3 px-4 text-[#5f6368]">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-[#5f6368]" />
                          {emp.branch_name || 'Headquarters'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#1f1f1f]">
                        {emp.salary ? formatCurrency(emp.salary) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBulkPayroll;
