import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import PageLoader from '../components/PageLoader';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { 
  IndianRupee, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Eye, 
  Calculator, 
  X, 
  Layers, 
  Trash2, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Building2, 
  User, 
  FileText,
  Sparkles,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import PayslipPDF from '../components/PayslipPDF';
import EmployeeSelect from '../components/EmployeeSelect';
import toast from 'react-hot-toast';

function numberToWords(num) {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
  if (!num) return 'Zero Rupees Only';
  
  const parsed = Math.round(parseFloat(num));
  if (isNaN(parsed) || parsed <= 0) return 'Zero Rupees Only';
  
  const numStr = parsed.toString();
  if (numStr.length > 9) return `${parsed} Rupees Only`;
  
  let n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return 'Zero Rupees Only';
  
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only' : 'Rupees Only';
  return str.trim();
}

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const AdminPayroll = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Pagination and search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Generate Payslip Form
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  // Drawer / Modal State
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch employees for the dropdown
  const { data: employees = [] } = useQuery({
    queryKey: ['admin', 'employees-dropdown'],
    queryFn: async () => {
      const response = await api.get(`/admin/employees?limit=200`);
      return response.data.employees || [];
    },
  });

  // Fetch payslips (paginated)
  const { data: payrollResponse, isLoading: loading } = useQuery({
    queryKey: ['admin', 'payroll', page, debouncedSearch],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      const response = await api.get(`/admin/payroll?limit=${limit}&offset=${offset}&search=${encodeURIComponent(debouncedSearch)}`);
      return response.data;
    },
    staleTime: 15 * 60 * 1000,
  });

  const payslips = payrollResponse?.payslips || [];
  const stats = payrollResponse?.stats || { totalPayroll: 0, processed: 0, pending: 0, avgSalary: 0 };
  const totalCount = payrollResponse?.total || 0;

  const handleGeneratePayslip = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    try {
      setGenerating(true);
      await api.post('/admin/payroll/generate', {
        employeeId: selectedEmployee,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear)
      });
      
      toast.success('Payslip generated successfully!');
      setSelectedEmployee('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payroll'] });
    } catch (err) {
      console.error('Error generating payslip:', err);
      toast.error(err.response?.data?.error || 'Failed to generate payslip.');
    } finally {
      setGenerating(false);
    }
  };

  const openPayslipDrawer = (payslip) => {
    setSelectedPayslip(payslip);
    setIsDrawerOpen(true);
  };

  const closePayslipDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedPayslip(null);
  };

  const handleDownload = async (payslip) => {
    try {
      const blob = await pdf(<PayslipPDF payslip={payslip} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${payslip.employeeName.replace(/[^a-zA-Z0-9 _-]/g, '')} - Payslip - ${getMonthName(payslip.month)} ${payslip.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Payslip PDF downloaded');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF document.');
    }
  };

  const handleDeletePayslip = async (payslipId) => {
    if (!window.confirm('Are you sure you want to delete this payslip?')) return;
    try {
      await api.delete(`/admin/payroll/${payslipId}`);
      toast.success('Payslip deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payroll'] });
    } catch (err) {
      console.error('Error deleting payslip:', err);
      toast.error(err.response?.data?.error || 'Failed to delete payslip');
    }
  };

  const getMonthName = (monthNum) => {
    const date = new Date();
    date.setMonth(monthNum - 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalPages = Math.ceil(totalCount / limit);

  if (loading) return <PageLoader message="Loading Payroll..." />;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Salary & Compensation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
            Payroll Management <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{totalCount} Records</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Generate individual payslips, manage salary components, and monitor company-wide payroll disbursement.
          </p>
        </div>

        <button 
          onClick={() => navigate('/admin/payroll/bulk')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#137333] hover:bg-[#0d652d] text-white rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Layers className="w-4 h-4" />
          Bulk Generate Payslips
        </button>
      </div>

      {/* Generate Payslip Card */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-[#1f1f1f]">Generate Individual Payslip</h3>
              <p className="text-xs text-[#5f6368]">Select employee and pay period to calculate earnings and deductions</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleGeneratePayslip} className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                Employee
              </label>
              <EmployeeSelect 
                employees={employees} 
                selectedId={selectedEmployee} 
                onChange={(id) => setSelectedEmployee(id)} 
                valueKey="userId"
                placeholder="Search and select employee..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                Pay Month
              </label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#f8fafd] hover:bg-[#e8eaed] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-xs text-[#1f1f1f] outline-none transition-all cursor-pointer"
              >
                {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                  const currentDate = new Date();
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
                {[(new Date()).getFullYear() - 2, (new Date()).getFullYear() - 1, (new Date()).getFullYear()].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={generating}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4285F4] disabled:opacity-50 transition-all shadow-xs cursor-pointer h-9"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generating ? 'Calculating...' : 'Generate Payslip'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Payroll" 
          value={formatCurrency(stats.totalPayroll)} 
          subtitle="Cumulative disbursements" 
          icon={IndianRupee} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Processed" 
          value={stats.processed} 
          subtitle="Generated payslips" 
          icon={CheckCircle2} 
          colorTheme="green" 
        />
        <StatCard 
          title="Pending" 
          value={stats.pending} 
          subtitle="Unprocessed active staff" 
          icon={Clock} 
          colorTheme="amber" 
        />
        <StatCard 
          title="Average Salary" 
          value={formatCurrency(stats.avgSalary)} 
          subtitle="Mean compensation" 
          icon={TrendingUp} 
          colorTheme="purple" 
        />
      </div>

      {/* Main Payslips Table */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1a73e8]" />
            <h3 className="text-sm sm:text-base font-semibold text-[#1f1f1f]">Payslip Records</h3>
          </div>
          
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
            <input 
              type="search" 
              placeholder="Search by employee name or code..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#f8fafd] border-b border-[#e0e3e7] text-[#5f6368] uppercase font-semibold tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Pay Period</th>
                <th className="px-5 py-3.5 text-right">Basic Salary</th>
                <th className="px-5 py-3.5 text-right">Net Payout</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e3e7]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-[#5f6368]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs">Loading payslips...</p>
                    </div>
                  </td>
                </tr>
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-[#5f6368]">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <FileText className="w-10 h-10 text-[#dadce0] mb-2" />
                      <p className="text-sm font-medium text-[#1f1f1f]">No payslips found</p>
                      <p className="text-xs text-[#5f6368]">Try adjusting your search criteria or generate a new payslip.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payslips.map((payslip) => (
                  <tr key={payslip.id} className="hover:bg-[#f8fafd] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#e8f0fe] border border-[#d2e3fc] flex items-center justify-center text-[#1a73e8] font-bold text-xs shrink-0">
                          {payslip.employeeName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'EM'}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1f1f1f] text-xs">{payslip.employeeName}</p>
                          <span className="font-mono text-[11px] text-[#5f6368]">{payslip.employeeCode}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#f1f3f4] text-[#3c4043]">
                        {getMonthName(payslip.month)} {payslip.year}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right font-medium text-[#5f6368]">
                      {formatCurrency(payslip.earnings?.[0]?.value || 0)}
                    </td>

                    <td className="px-5 py-3.5 text-right font-bold text-[#1f1f1f] text-sm">
                      {formatCurrency(payslip.netSalary)}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        payslip.status === 'generated' 
                          ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]' 
                          : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
                      }`}>
                        <span className="capitalize">{payslip.status}</span>
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => openPayslipDrawer(payslip)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#5f6368]" /> View
                        </button>
                        <button 
                          onClick={() => handleDownload(payslip)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-[#d2e3fc] bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] transition-all cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button 
                          onClick={() => handleDeletePayslip(payslip.id)}
                          className="p-1.5 rounded-full border border-[#fce8e6] bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] transition-all cursor-pointer"
                          title="Delete Payslip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3.5 sm:p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <p className="text-[#5f6368]">
              Showing <span className="font-semibold text-[#1f1f1f]">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-[#1f1f1f]">{Math.min(page * limit, totalCount)}</span> of <span className="font-semibold text-[#1f1f1f]">{totalCount}</span> payslips
            </p>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-[#dadce0]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs font-medium text-[#1f1f1f] bg-white border border-[#dadce0] rounded-full">
                Page {page} of {totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-full text-[#5f6368] hover:bg-[#e8eaed] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-[#dadce0]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slideover Drawer for Payslip Breakdown */}
      {isDrawerOpen && selectedPayslip && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" 
            onClick={closePayslipDrawer} 
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-5 border-b border-[#e0e3e7] flex items-center justify-between bg-[#f8fafd]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1f1f1f]">Payslip Statement</h3>
                    <p className="text-xs text-[#5f6368]">
                      {selectedPayslip.employeeName} • {getMonthName(selectedPayslip.month)} {selectedPayslip.year}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closePayslipDrawer}
                  className="rounded-full p-1.5 text-[#5f6368] hover:bg-[#e8eaed] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Employee Overview Card */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-[#f8fafd] p-4 rounded-2xl border border-[#e0e3e7]">
                  <div>
                    <p className="text-[#5f6368] font-medium">Employee Code</p>
                    <p className="font-semibold text-[#1f1f1f] mt-0.5">{selectedPayslip.employeeCode}</p>
                  </div>
                  <div>
                    <p className="text-[#5f6368] font-medium">Designation</p>
                    <p className="font-semibold text-[#1f1f1f] mt-0.5">{selectedPayslip.details?.designation || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[#5f6368] font-medium">Payable Days</p>
                    <p className="font-semibold text-[#137333] mt-0.5">
                      {selectedPayslip.details?.daysPayable ?? 0} / {selectedPayslip.details?.totalWorkingDays ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#5f6368] font-medium">Loss of Pay</p>
                    <p className="font-semibold text-[#c5221f] mt-0.5">{selectedPayslip.details?.lossOfPayDays ?? 0} days</p>
                  </div>
                </div>

                {/* Earnings & Deductions Tables */}
                <div className="space-y-4">
                  {/* Earnings */}
                  <div className="border border-[#e0e3e7] rounded-2xl overflow-hidden">
                    <div className="bg-[#f8fafd] px-4 py-3 border-b border-[#e0e3e7] flex items-center justify-between">
                      <h4 className="font-semibold text-xs text-[#1f1f1f] uppercase tracking-wider">Earnings Breakdown</h4>
                      <span className="text-xs font-bold text-[#137333]">
                        {formatCurrency(selectedPayslip.earnings?.reduce((sum, item) => sum + parseFloat(item.value || 0), 0) || 0)}
                      </span>
                    </div>
                    <div className="p-4 space-y-2.5 text-xs">
                      {selectedPayslip.earnings?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 border-b border-dashed border-[#e0e3e7] last:border-0">
                          <span className="text-[#5f6368]">{item.label}</span>
                          <span className="font-semibold text-[#1f1f1f]">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border border-[#e0e3e7] rounded-2xl overflow-hidden">
                    <div className="bg-[#f8fafd] px-4 py-3 border-b border-[#e0e3e7] flex items-center justify-between">
                      <h4 className="font-semibold text-xs text-[#1f1f1f] uppercase tracking-wider">Statutory Deductions</h4>
                      <span className="text-xs font-bold text-[#c5221f]">
                        {formatCurrency(selectedPayslip.deductions?.reduce((sum, item) => sum + parseFloat(item.value || 0), 0) || 0)}
                      </span>
                    </div>
                    <div className="p-4 space-y-2.5 text-xs">
                      {selectedPayslip.deductions?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 border-b border-dashed border-[#e0e3e7] last:border-0">
                          <span className="text-[#5f6368]">{item.label}</span>
                          <span className="font-semibold text-[#1f1f1f]">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Net Payout Banner */}
                <div className="bg-[#e8f0fe] border border-[#d2e3fc] rounded-2xl p-4 sm:p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1a73e8] uppercase tracking-wider block">Net Take-Home Salary</span>
                      <span className="text-2xl sm:text-3xl font-extrabold text-[#1a73e8]">{formatCurrency(selectedPayslip.netSalary)}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white text-[#1a73e8] border border-[#d2e3fc] shadow-xs">
                      <IndianRupee className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#d2e3fc]/60">
                    <p className="text-[10px] font-bold text-[#1a73e8] uppercase tracking-wider">Amount in Words</p>
                    <p className="text-xs font-semibold text-[#1f1f1f] mt-0.5">{numberToWords(selectedPayslip.netSalary)}</p>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex items-center gap-3">
                <button
                  onClick={() => handleDownload(selectedPayslip)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download Payslip PDF
                </button>
                <button
                  onClick={closePayslipDrawer}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminPayroll;
