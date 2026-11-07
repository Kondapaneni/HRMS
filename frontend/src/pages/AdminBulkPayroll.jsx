import { useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import SearchBar from '../components/ui/SearchBar';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { 
  Users, 
  Search, 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  Sparkles,
  Building2,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Avatar } from '../components/ui';

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
    <div className="space-y-4 font-sans antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Bulk Generate Payslips
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Select pay period, review pending employees, and batch calculate salary statements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-[9px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
            {filteredEmployees.length} Pending
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/payroll')}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>Back to Payroll</span>
          </Button>
        </div>
      </div>

      {/* Control Card */}
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
              Pay Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all cursor-pointer"
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
            <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
              Pay Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] text-xs text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all cursor-pointer"
            >
              {[currentDate.getFullYear() - 2, currentDate.getFullYear() - 1, currentDate.getFullYear()].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <Button
              variant="primary"
              onClick={handleGenerateBulk}
              disabled={selectedIds.length === 0 || isGenerating}
              loading={isGenerating}
              className="w-full h-10"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Generate Selected ({selectedIds.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {message && (
        <div className={`p-4 rounded-[16px] border flex items-start gap-3 text-xs ${
          message.type === 'success' 
            ? 'bg-[var(--status-success-bg)] border-[var(--status-success-text)]/20 text-[var(--status-success-text)]' 
            : 'bg-[var(--status-danger-bg)] border-[var(--status-danger-text)]/20 text-[var(--status-danger-text)]'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <div>
            <h4 className="font-semibold">{message.type === 'success' ? 'Batch Completed' : 'Batch Error'}</h4>
            <p className="mt-0.5">{message.text}</p>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px] flex flex-col">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--line)] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">Pending Employees Roster</h3>
              <p className="text-xs text-[var(--muted)]">Active staff awaiting payroll generation</p>
            </div>
            {selectedIds.length > 0 && (
              <span className="text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px] ml-1">
                {selectedIds.length} Selected
              </span>
            )}
          </div>

          <SearchBar
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            wrapperClassName="w-full sm:w-80"
          />
        </div>

        {/* Table List */}
        <div className="overflow-x-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--muted)] space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-deep)]" />
              <p className="text-xs">Loading pending employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--muted)] space-y-2">
              <div className="p-3 rounded-[12px] bg-[var(--status-success-bg)] text-[var(--status-success-text)] mb-1">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-[var(--text)]">All Payslips Processed</p>
              <p className="text-xs text-[var(--muted)]">All active employees already have generated payslips for {getMonthName(selectedMonth)} {selectedYear}.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded-[4px] accent-[var(--brand-deep)] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 font-normal text-xs">Employee</th>
                  <th className="py-3 px-4 font-normal text-xs">Employee ID</th>
                  <th className="py-3 px-4 font-normal text-xs">Designation</th>
                  <th className="py-3 px-4 font-normal text-xs">Branch</th>
                  <th className="py-3 px-4 font-normal text-xs text-right">Base Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filteredEmployees.map(emp => {
                  const isSelected = selectedIds.includes(emp.userId);
                  return (
                    <tr 
                      key={emp.userId} 
                      onClick={() => handleSelectOne(emp.userId)}
                      className={`hover:bg-[var(--surface-alt)]/60 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[var(--brand-tint)]/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(emp.userId)}
                          className="w-4 h-4 rounded-[4px] accent-[var(--brand-deep)] cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${emp.firstName} ${emp.lastName}`} size="sm" />
                          <span className="font-semibold text-[var(--text)] text-xs">
                            {emp.firstName} {emp.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2 py-0.5 rounded-[6px]">
                          {emp.employeeId}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-2)]">
                        {emp.position || 'Employee'}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-2)]">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-[var(--icon-muted)]" />
                          {emp.branch_name || 'Headquarters'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[var(--text)]">
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