import React, { useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { DollarSign, Search, ChevronLeft, ChevronRight, Download, Eye, Calculator, X } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import PayslipPDF from '../components/PayslipPDF';
import EmployeeSelect from '../components/EmployeeSelect';

const AdminPayroll = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Pagination and search
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Generate Payslip Form
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  // Modal
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch employees for the dropdown
  const { data: employees = [] } = useQuery({
    queryKey: ['admin', 'employees-dropdown'],
    queryFn: async () => {
      const response = await api.get(`/admin/employees?limit=100`);
      return response.data.employees || [];
    },
  });

  // Fetch payslips (paginated)
  const { data: payrollResponse, isLoading: loading } = useQuery({
    queryKey: ['admin', 'payroll', page, search],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      const response = await api.get(`/admin/payroll?limit=${limit}&offset=${offset}&search=${search}`);
      return response.data;
    },
    staleTime: 15 * 60 * 1000, // payroll rarely changes — 15 min cache
  });

  const payslips = payrollResponse?.payslips || [];
  const stats = payrollResponse?.stats || { totalPayroll: 0, processed: 0, pending: 0, avgSalary: 0 };
  const totalCount = payrollResponse?.total || 0;

  const handleGeneratePayslip = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      alert("Please select an employee");
      return;
    }

    try {
      setGenerating(true);
      await api.post('/admin/payroll/generate', {
        employeeId: selectedEmployee,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear)
      });
      
      alert('Payslip generated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payroll'] });
    } catch (err) {
      console.error('Error generating payslip:', err);
      alert(err.response?.data?.error || 'Failed to generate payslip.');
    } finally {
      setGenerating(false);
    }
  };

  const openModal = (payslip) => {
    setSelectedPayslip(payslip);
    setIsModalOpen(true);
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
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF document.');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payroll Management</h1>
          <p className="text-slate-500 mt-1">Manage employee payslips and generate new ones</p>
        </div>
        <button 
          onClick={() => navigate('/admin/payroll/bulk')}
          className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
        >
          Bulk Generate Payslips
        </button>
      </div>

      {/* Generate Payslip Form */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 rounded-t-xl">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center">
            <Calculator className="w-5 h-5 mr-2 text-blue-600" /> Generate Payslip
          </h3>
        </div>
        <form onSubmit={handleGeneratePayslip} className="p-5">
          <div className="grid gap-4 md:grid-cols-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
              <EmployeeSelect 
                employees={employees} 
                selectedId={selectedEmployee} 
                onChange={(id) => setSelectedEmployee(id)} 
                valueKey="userId"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors font-medium"
              >
                {generating ? 'Generating...' : 'Generate Payslip'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col justify-center">
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalPayroll)}</p>
          <p className="text-sm text-slate-500 mt-1 font-medium">Total Payroll</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col justify-center">
          <p className="text-2xl font-bold text-green-600">{stats.processed}</p>
          <p className="text-sm text-slate-500 mt-1 font-medium">Processed</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col justify-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-sm text-slate-500 mt-1 font-medium">Pending</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col justify-center">
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.avgSalary)}</p>
          <p className="text-sm text-slate-500 mt-1 font-medium">Average Salary</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-blue-600" /> Payslips
          </h3>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="search" 
              placeholder="Search employee..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Period</th>
                <th className="px-6 py-4 font-medium text-right">Basic</th>
                <th className="px-6 py-4 font-medium text-right">Net Salary</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p>Loading payslips...</p>
                    </div>
                  </td>
                </tr>
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <DollarSign className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-600">No payslips found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payslips.map((payslip) => (
                  <tr key={payslip.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{payslip.employeeName}</p>
                        <p className="text-xs text-slate-500">{payslip.employeeCode}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700">{getMonthName(payslip.month)} {payslip.year}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-slate-600">{formatCurrency(payslip.earnings?.[0]?.value || 0)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-slate-900">{formatCurrency(payslip.netSalary)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        payslip.status === 'generated' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}>
                        <span className="capitalize">{payslip.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openModal(payslip)}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-9 px-3 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4 mr-2 text-slate-500" /> View
                        </button>
                        <button 
                          onClick={() => handleDownload(payslip)}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 h-9 px-3 transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4 mr-2 text-slate-500" /> Download
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
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-900">{((page - 1) * limit) + 1}</span> to <span className="font-medium text-slate-900">{Math.min(page * limit, totalCount)}</span> of <span className="font-medium text-slate-900">{totalCount}</span> results
            </p>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-3 py-1 text-sm font-medium text-slate-700">
                Page {page} of {totalPages}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payslip Modal */}
      {isModalOpen && (
        <div className="relative z-[100]">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <div className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-xl font-bold leading-6 text-slate-900">
                      Payslip Details
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {selectedPayslip?.employeeName} - {selectedPayslip ? `${getMonthName(selectedPayslip.month)} ${selectedPayslip.year}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-full p-1.5 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                  {selectedPayslip && (
                    <div className="mt-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                          <p className="text-slate-500">Employee ID:</p>
                          <p className="font-semibold text-slate-900">{selectedPayslip.employeeCode}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Designation:</p>
                          <p className="font-semibold text-slate-900">{selectedPayslip.details?.designation || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Payable Days:</p>
                          <p className="font-semibold text-slate-900">{selectedPayslip.details?.daysPayable ?? 0} / {selectedPayslip.details?.totalWorkingDays ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Loss of Pay (Days):</p>
                          <p className="font-semibold text-slate-900">{selectedPayslip.details?.lossOfPayDays ?? 0}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Earnings */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                            <h4 className="font-semibold text-slate-800">Earnings</h4>
                          </div>
                          <div className="p-4 space-y-3">
                            {selectedPayslip.earnings?.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-slate-600">{item.label}</span>
                                <span className="font-medium text-slate-900">{formatCurrency(item.value)}</span>
                              </div>
                            ))}
                            <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between font-semibold">
                              <span className="text-slate-900">Gross Earnings</span>
                              <span className="text-green-600">
                                {formatCurrency(selectedPayslip.earnings?.reduce((sum, item) => sum + parseFloat(item.value), 0) || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Deductions */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                            <h4 className="font-semibold text-slate-800">Deductions</h4>
                          </div>
                          <div className="p-4 space-y-3">
                            {selectedPayslip.deductions?.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-slate-600">{item.label}</span>
                                <span className="font-medium text-slate-900">{formatCurrency(item.value)}</span>
                              </div>
                            ))}
                            <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between font-semibold">
                              <span className="text-slate-900">Total Deductions</span>
                              <span className="text-red-600">
                                {formatCurrency(selectedPayslip.deductions?.reduce((sum, item) => sum + parseFloat(item.value), 0) || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-900">Net Salary</span>
                        <span className="text-2xl font-bold text-blue-700">{formatCurrency(selectedPayslip.netSalary)}</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default AdminPayroll;
