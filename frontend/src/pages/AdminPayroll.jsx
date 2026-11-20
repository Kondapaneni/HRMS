import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import PageLoader from '../components/PageLoader';
import SearchBar from '../components/ui/SearchBar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRemoteData, useRefreshControl } from '../state/remote.js';
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
  FileText,
  Sparkles
} from 'lucide-react';
import EmployeeSelect from '../components/EmployeeSelect';
import toast from 'react-hot-toast';
import { StatCard, StatusBadge, Button, Avatar } from '../components/ui';

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

const AdminPayroll = () => {
  const { profile } = useAuth();
  const refreshControl = useRefreshControl();
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

  // Fetch payslips (paginated)
  const { data: payrollResponse, isLoading: loading } = useRemoteData({
    scope: ['admin', 'payroll', page, debouncedSearch],
    load: async () => {
      const offset = (page - 1) * limit;
      const response = await api.get(`/admin/payroll?limit=${limit}&offset=${offset}&search=${encodeURIComponent(debouncedSearch)}`);
      return response.data;
    },
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
      refreshControl.refresh({ scope: ['admin', 'payroll'] });
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
      // Defer the ~1.4MB PDF engine until the user requests an actual download.
      // Navigating to a payroll or employee view must not require PDF rendering.
      const [{ pdf }, { default: PayslipPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/PayslipPDF'),
      ]);
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
      refreshControl.refresh({ scope: ['admin', 'payroll'] });
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
    <div className="space-y-4 font-sans antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Payroll Management
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Generate individual payslips, manage salary components, and monitor company-wide payroll disbursement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-[9px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
            {totalCount} Records
          </span>
          <Button 
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/payroll/bulk')}
          >
            <Layers className="w-4 h-4 mr-1.5" />
            Bulk Generate Payslips
          </Button>
        </div>
      </div>

      {/* Generate Payslip Card */}
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
        <div className="flex items-center gap-2 pb-4 border-b border-[var(--line)] mb-4">
          <div className="w-8 h-8 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Generate Individual Payslip</h3>
            <p className="text-xs text-[var(--muted)]">Select employee and pay period to calculate earnings and deductions</p>
          </div>
        </div>

        <form onSubmit={handleGeneratePayslip}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="relative z-30">
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                Employee
              </label>
              <EmployeeSelect 
                selectedId={selectedEmployee} 
                onChange={(id) => setSelectedEmployee(id)} 
                valueKey="userId"
                placeholder="Search and select employee..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                Pay Month
              </label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all cursor-pointer"
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
              <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                Pay Year
              </label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all cursor-pointer"
              >
                {[(new Date()).getFullYear() - 2, (new Date()).getFullYear() - 1, (new Date()).getFullYear()].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <Button 
                type="submit" 
                variant="primary"
                loading={generating}
                className="w-full h-10"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {generating ? 'Calculating...' : 'Generate Payslip'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Payroll" 
          value={formatCurrency(stats.totalPayroll)} 
          subtitle="Cumulative disbursements" 
          icon={IndianRupee} 
        />
        <StatCard 
          title="Processed" 
          value={stats.processed} 
          subtitle="Generated payslips" 
          badgeText="Done"
          badgeType="success"
          icon={CheckCircle2} 
        />
        <StatCard 
          title="Pending" 
          value={stats.pending} 
          subtitle="Unprocessed active staff" 
          badgeText="Pending"
          badgeType="warning"
          icon={Clock} 
        />
        <StatCard 
          title="Average Salary" 
          value={formatCurrency(stats.avgSalary)} 
          subtitle="Mean compensation" 
          icon={TrendingUp} 
        />
      </div>

      {/* Main Payslips Table */}
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px] flex flex-col">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--line)] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">Payslip Records</h3>
              <p className="text-xs text-[var(--muted)]">Calculated salary statements</p>
            </div>
          </div>
          
          <SearchBar
            placeholder="Search by employee name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="w-full sm:w-80"
          />
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                <th className="px-4 py-3 font-normal text-xs whitespace-nowrap">Employee</th>
                <th className="px-4 py-3 font-normal text-xs whitespace-nowrap">Pay Period</th>
                <th className="px-4 py-3 font-normal text-xs text-right whitespace-nowrap">Basic Salary</th>
                <th className="px-4 py-3 font-normal text-xs text-right whitespace-nowrap">Net Payout</th>
                <th className="px-4 py-3 font-normal text-xs text-center whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-normal text-xs text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-[var(--muted)]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs">Loading payslips...</p>
                    </div>
                  </td>
                </tr>
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-[var(--muted)]">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <FileText className="w-10 h-10 text-[var(--icon-muted)] mb-2" />
                      <p className="text-sm font-semibold text-[var(--text)]">No payslips found</p>
                      <p className="text-xs text-[var(--muted)]">Try adjusting your search criteria or generate a new payslip.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payslips.map((payslip) => (
                  <tr key={payslip.id} className="hover:bg-[var(--surface-alt)]/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={payslip.employeeName} size="sm" />
                        <div>
                          <p className="font-semibold text-[var(--text)] text-xs">{payslip.employeeName}</p>
                          <span className="font-mono text-[11px] text-[var(--muted)]">{payslip.employeeCode}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-[8px] text-xs font-medium bg-[var(--surface-alt)] text-[var(--text-2)]">
                        {getMonthName(payslip.month)} {payslip.year}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-medium text-[var(--muted)]">
                      {formatCurrency(payslip.earnings?.[0]?.value || 0)}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-[var(--text)] text-xs">
                      {formatCurrency(payslip.netSalary)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <StatusBadge 
                        status={payslip.status === 'generated' ? 'Generated' : payslip.status} 
                        variant={payslip.status === 'generated' ? 'success' : 'neutral'} 
                      />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          variant="secondary"
                          size="sm"
                          onClick={() => openPayslipDrawer(payslip)}
                          className="text-xs"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                        <Button 
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownload(payslip)}
                          className="text-xs text-[var(--brand-deep)] hover:bg-[var(--brand-tint)]"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" /> PDF
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePayslip(payslip.id)}
                          className="text-xs text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)] p-1.5 h-8 w-8"
                          title="Delete Payslip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
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
          <div className="pt-4 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--muted)]">
            <p>
              Showing <span className="font-semibold text-[var(--text)]">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-[var(--text)]">{Math.min(page * limit, totalCount)}</span> of <span className="font-semibold text-[var(--text)]">{totalCount}</span> payslips
            </p>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button 
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 py-1 text-xs font-medium text-[var(--text)] bg-[var(--surface-alt)] rounded-[8px]">
                {page} / {totalPages}
              </span>
              <Button 
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Slideover Drawer for Payslip Breakdown */}
      {isDrawerOpen && selectedPayslip && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) closePayslipDrawer(); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs font-sans antialiased"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-[var(--surface)] shadow-[0_24px_60px_rgba(19,19,21,0.18)] w-full max-w-lg h-[100dvh] flex flex-col overflow-hidden relative z-10"
          >
            {/* Modal Header */}
            <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
              <div>
                <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  PAYROLL STATEMENT
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  Payslip Statement
                </h2>
              </div>
              <button 
                onClick={closePayslipDrawer} 
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Employee Overview Card */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--surface-alt)] p-4 rounded-[16px] border border-[var(--line)]">
                <div>
                  <p className="text-[var(--muted)] font-medium">Employee</p>
                  <p className="font-semibold text-[var(--text)] mt-0.5">{selectedPayslip.employeeName}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)] font-medium">Month &amp; Year</p>
                  <p className="font-semibold text-[var(--text)] mt-0.5">{getMonthName(selectedPayslip.month)} {selectedPayslip.year}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)] font-medium">Employee Code</p>
                  <p className="font-semibold text-[var(--text)] mt-0.5">{selectedPayslip.employeeCode}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)] font-medium">Designation</p>
                  <p className="font-semibold text-[var(--text)] mt-0.5">{selectedPayslip.details?.designation || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)] font-medium">Payable Days</p>
                  <p className="font-semibold text-[var(--status-success-text)] mt-0.5">
                    {selectedPayslip.details?.daysPayable ?? 0} / {selectedPayslip.details?.totalWorkingDays ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--muted)] font-medium">Loss of Pay</p>
                  <p className="font-semibold text-[var(--status-danger-text)] mt-0.5">{selectedPayslip.details?.lossOfPayDays ?? 0} days</p>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="space-y-4">
                {/* Earnings */}
                <div className="border border-[var(--line)] rounded-[16px] overflow-hidden bg-[var(--surface)]">
                  <div className="bg-[var(--surface-alt)] px-4 py-3 border-b border-[var(--line)] flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-[var(--text)]">Earnings Breakdown</h4>
                    <span className="text-xs font-semibold text-[var(--status-success-text)]">
                      {formatCurrency(selectedPayslip.earnings?.reduce((sum, item) => sum + parseFloat(item.value || 0), 0) || 0)}
                    </span>
                  </div>
                  <div className="p-4 space-y-2.5 text-xs">
                    {selectedPayslip.earnings?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-dashed border-[var(--line)] last:border-0">
                        <span className="text-[var(--muted)]">{item.label}</span>
                        <span className="font-semibold text-[var(--text)]">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-[var(--line)] rounded-[16px] overflow-hidden bg-[var(--surface)]">
                  <div className="bg-[var(--surface-alt)] px-4 py-3 border-b border-[var(--line)] flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-[var(--text)]">Statutory Deductions</h4>
                    <span className="text-xs font-semibold text-[var(--status-danger-text)]">
                      {formatCurrency(selectedPayslip.deductions?.reduce((sum, item) => sum + parseFloat(item.value || 0), 0) || 0)}
                    </span>
                  </div>
                  <div className="p-4 space-y-2.5 text-xs">
                    {selectedPayslip.deductions?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-dashed border-[var(--line)] last:border-0">
                        <span className="text-[var(--muted)]">{item.label}</span>
                        <span className="font-semibold text-[var(--text)]">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Net Payout Banner */}
              <div className="bg-[var(--brand-tint)] border border-[var(--brand)]/20 rounded-[16px] p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[var(--brand-deep)] block">Net Take-Home Salary</span>
                    <span className="text-2xl sm:text-3xl font-semibold text-[var(--text)]">{formatCurrency(selectedPayslip.netSalary)}</span>
                  </div>
                  <div className="p-3 rounded-[12px] bg-[var(--surface)] text-[var(--brand-deep)] shadow-xs">
                    <IndianRupee className="w-6 h-6" />
                  </div>
                </div>
                <div className="pt-2 border-t border-[var(--brand)]/15">
                  <p className="text-[10px] font-semibold text-[var(--brand-deep)] uppercase tracking-wider">Amount in Words</p>
                  <p className="text-xs font-semibold text-[var(--text)] mt-0.5">{numberToWords(selectedPayslip.netSalary)}</p>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={closePayslipDrawer}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownload(selectedPayslip)}
                className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download Payslip PDF</span>
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminPayroll;