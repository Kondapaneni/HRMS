import React, { useState, useMemo } from 'react';
import PageLoader from '../components/PageLoader';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, 
  CalendarDays, 
  Activity, 
  BarChart2, 
  TrendingUp, 
  Users, 
  Sparkles, 
  ChevronRight,
  Award,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import api from '../api/axios';
import EmployeeMobileSearchBar from '../components/EmployeeMobileSearchBar';

const EmployeeMobilePerformance = () => {
  const [trendTab, setTrendTab] = useState('attendance'); // 'attendance' | 'leaves'
  const [peerTab, setPeerTab] = useState('peers'); // 'peers' | 'reports'

  const { data: perfData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['employee', 'performance'],
    queryFn: async () => {
      const res = await api.get('/employee/performance');
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const currentWeek = useMemo(() => {
    if (!perfData?.currentMetrics?.weekly) return null;
    return (
      perfData.currentMetrics.weekly.find((w) => w.isCurrentWeek) ||
      perfData.currentMetrics.weekly[perfData.currentMetrics.weekly.length - 1]
    );
  }, [perfData]);

  if (isLoading) {
    return <PageLoader message="Loading Performance Analytics..." />;
  }

  if (!perfData) {
    return (
      <div className="space-y-6 pb-8 font-sans antialiased text-[var(--text)]">
        <EmployeeMobileSearchBar />
        <div className="p-8 text-center bg-[var(--surface)] rounded-[24px] border border-[var(--line)] shadow-xs">
          <p className="text-sm font-medium text-[var(--muted)]">No performance records available for this account.</p>
        </div>
      </div>
    );
  }

  const { currentMonthSummary, currentMetrics, employee, peerMetrics = [], reportMetrics = [] } = perfData;
  const attendanceScore = currentMonthSummary?.attendancePct ?? 0;

  return (
    <div className="space-y-6 pb-12 font-sans antialiased text-[var(--text)]">
      {/* Header & Search */}
      <section className="relative z-30 pt-1 pb-1 space-y-4">
        <EmployeeMobileSearchBar />

        <div className="flex items-center justify-between pt-0.5">
          <div>
            <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Productivity & Analytics
            </p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight">
              My <span className="text-[var(--brand-deep)]">Performance</span>
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-0.5">
              Weekly velocity, monthly trends & peer benchmarks
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] active:scale-95 transition-all shadow-2xs shrink-0"
            title="Refresh analytics"
            aria-label="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-[var(--brand-deep)]' : ''}`} />
          </button>
        </div>
      </section>

      {/* KPI Stats Cards (2x2 Grid) */}
      <section className={`grid grid-cols-2 gap-3 relative z-20 mx-0.5 transition-opacity duration-150 ${isFetching ? 'opacity-75' : 'opacity-100'}`}>
        {/* Hours This Week */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">This Week</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--text)]">
            {currentWeek ? `${currentWeek.totalHours} hrs` : '0 hrs'}
          </p>
          <p className="text-[10px] text-[var(--muted)] truncate">
            {currentWeek ? `Avg ${currentWeek.avgHoursPerDay}h/day` : 'Current week'}
          </p>
        </div>

        {/* Hours This Month */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">This Month</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]">
              <BarChart2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--text)]">
            {currentMonthSummary?.totalHours || 0} hrs
          </p>
          <p className="text-[10px] text-[var(--muted)]">Cumulative hours</p>
        </div>

        {/* Present Days */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Present Days</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-success-text)]">
            {currentMonthSummary?.totalPresent || 0} Days
          </p>
          <p className="text-[10px] text-[var(--muted)] truncate">
            Out of {currentMonthSummary?.totalWorkdays || 0} workdays
          </p>
        </div>

        {/* Attendance Score */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Score</span>
            <div className="p-1.5 rounded-[8px] bg-[#FDF3DC] text-[#B7791F]">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className={`text-base font-bold ${
            attendanceScore >= 90 ? 'text-[var(--status-success-text)]' :
            attendanceScore < 75 ? 'text-[var(--status-danger-text)]' : 'text-[#B7791F]'
          }`}>
            {attendanceScore}%
          </p>
          <p className="text-[10px] text-[var(--muted)]">Monthly rating</p>
        </div>
      </section>

      {/* Weekly Work Hours Breakdown */}
      {currentMetrics?.weekly && currentMetrics.weekly.length > 0 && (
        <section className="bg-[var(--surface)] rounded-[24px] shadow-xs border border-[var(--line)] overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[var(--brand-deep)]" /> Weekly Velocity
              </h3>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">Logged hours per week (last 6 weeks)</p>
            </div>
            {currentWeek && (
              <span className="text-[11px] font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-1 rounded-full shrink-0">
                {currentWeek.totalHours}h this week
              </span>
            )}
          </div>

          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <BarChart data={currentMetrics.weekly} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis 
                  dataKey="shortLabel" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--muted)' }} 
                  dy={4} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--muted)' }} 
                  allowDecimals={false} 
                />
                <Tooltip 
                  cursor={{ fill: 'var(--surface-alt)' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid var(--line)', 
                    backgroundColor: 'var(--surface)', 
                    color: 'var(--text)',
                    fontSize: '11px',
                    padding: '8px 12px'
                  }} 
                  formatter={(val) => [`${val} hrs`, 'Work Hours']}
                />
                <Bar 
                  dataKey="totalHours" 
                  name="Work Hours" 
                  fill="#8AADDB" 
                  radius={[8, 8, 0, 0]} 
                  maxBarSize={28} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Week Chips Scroll */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {currentMetrics.weekly.slice(-3).map((w, idx) => (
              <div 
                key={idx}
                className={`p-2.5 rounded-[14px] border text-center transition-all ${
                  w.isCurrentWeek 
                    ? 'bg-[var(--brand-tint)]/60 border-[var(--brand)]/50 ring-1 ring-[var(--brand)]' 
                    : 'bg-[var(--surface-alt)] border-[var(--line)]'
                }`}
              >
                <p className="text-[10px] font-semibold text-[var(--muted)] truncate">{w.shortLabel || w.label}</p>
                <p className="text-sm font-bold text-[var(--text)] mt-0.5">{w.totalHours} <span className="text-[9px] font-normal text-[var(--muted)]">hrs</span></p>
                <p className="text-[9px] text-[var(--muted)] mt-0.5">{w.presentDays}d &bull; {w.avgHoursPerDay}h/d</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Monthly Trends (6 Months) */}
      {currentMetrics?.monthly && currentMetrics.monthly.length > 0 && (
        <section className="bg-[var(--surface)] rounded-[24px] shadow-xs border border-[var(--line)] overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[var(--brand-deep)]" /> 6-Month Trends
              </h3>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">Historical attendance & leave rates</p>
            </div>

            {/* Tab Selector */}
            <div className="flex items-center p-0.5 bg-[var(--surface-alt)] rounded-full border border-[var(--line)]">
              <button
                type="button"
                onClick={() => setTrendTab('attendance')}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-full transition-all ${
                  trendTab === 'attendance'
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Attendance %
              </button>
              <button
                type="button"
                onClick={() => setTrendTab('leaves')}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-full transition-all ${
                  trendTab === 'leaves'
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Leaves
              </button>
            </div>
          </div>

          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              {trendTab === 'attendance' ? (
                <LineChart data={currentMetrics.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'var(--muted)' }} 
                    dy={4} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'var(--muted)' }} 
                    domain={[0, 100]} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid var(--line)', 
                      backgroundColor: 'var(--surface)', 
                      color: 'var(--text)',
                      fontSize: '11px',
                      padding: '8px 12px'
                    }} 
                    formatter={(val) => [`${val}%`, 'Attendance']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="attendancePct" 
                    name="Attendance %" 
                    stroke="#8AADDB" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, fill: '#fff', stroke: '#8AADDB', strokeWidth: 2 }} 
                    activeDot={{ r: 5, fill: '#8AADDB' }} 
                  />
                </LineChart>
              ) : (
                <BarChart data={currentMetrics.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'var(--muted)' }} 
                    dy={4} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'var(--muted)' }} 
                    allowDecimals={false} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid var(--line)', 
                      backgroundColor: 'var(--surface)', 
                      color: 'var(--text)',
                      fontSize: '11px',
                      padding: '8px 12px'
                    }} 
                    formatter={(val) => [`${val} days`, 'Leaves Taken']}
                  />
                  <Bar 
                    dataKey="leave" 
                    name="Leave Days" 
                    fill="#E3B9DF" 
                    radius={[8, 8, 0, 0]} 
                    maxBarSize={28} 
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Peer Group & Team Benchmarks */}
      {(peerMetrics.length > 0 || reportMetrics.length > 0) && (
        <section className="bg-[var(--surface)] rounded-[24px] shadow-xs border border-[var(--line)] overflow-hidden">
          <div className="p-4 border-b border-[var(--line)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--brand-deep)]" />
              <div className="flex items-center p-0.5 bg-[var(--surface-alt)] rounded-full border border-[var(--line)]">
                {peerMetrics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPeerTab('peers')}
                    className={`px-3 py-1 text-[10px] font-semibold rounded-full transition-all ${
                      peerTab === 'peers'
                        ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    Peers ({perfData.peerAverageAttendance || 0}%)
                  </button>
                )}
                {reportMetrics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPeerTab('reports')}
                    className={`px-3 py-1 text-[10px] font-semibold rounded-full transition-all ${
                      peerTab === 'reports'
                        ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    Reports ({perfData.reportAverageAttendance || 0}%)
                  </button>
                )}
              </div>
            </div>

            <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              {peerTab === 'peers' ? 'Benchmark' : 'Supervised'}
            </span>
          </div>

          <div className="divide-y divide-[var(--line)] max-h-[340px] overflow-y-auto">
            {/* Self entry */}
            {peerTab === 'peers' && employee && currentMonthSummary && (
              <div className="flex items-center justify-between p-3.5 bg-[var(--brand-tint)]/25">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--brand-tint)] border border-[var(--line)] flex items-center justify-center overflow-hidden shrink-0">
                    {employee.avatar ? (
                      <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[11px] font-bold text-[var(--brand-deep)]">
                        {employee.firstName?.[0]}{employee.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text)] truncate flex items-center gap-1.5">
                      {employee.firstName} {employee.lastName}
                      <span className="text-[9px] font-bold bg-[var(--text)] text-[var(--surface)] px-1.5 py-0.2 rounded-full">
                        You
                      </span>
                    </p>
                    <p className="text-[10px] text-[var(--muted)] truncate">{employee.position || 'Team Member'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-semibold text-[var(--muted)] block">Attendance</span>
                    <span className={`text-xs font-bold ${
                      currentMonthSummary.attendancePct >= 90 ? 'text-[var(--status-success-text)]' :
                      currentMonthSummary.attendancePct < 75 ? 'text-[var(--status-danger-text)]' : 'text-[var(--text)]'
                    }`}>
                      {currentMonthSummary.attendancePct}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-semibold text-[var(--muted)] block">Hours</span>
                    <span className="text-xs font-bold text-[var(--brand-deep)]">{currentMonthSummary.totalHours || 0}h</span>
                  </div>
                </div>
              </div>
            )}

            {/* List entries */}
            {(peerTab === 'peers' ? peerMetrics : reportMetrics).map((item) => {
              const emp = item.employee;
              const sum = item.summary;
              if (!emp || !sum) return null;

              return (
                <div key={emp.id} className="flex items-center justify-between p-3.5 hover:bg-[var(--surface-alt)] transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-alt)] border border-[var(--line)] flex items-center justify-center overflow-hidden shrink-0">
                      {emp.avatar ? (
                        <img src={emp.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[11px] font-semibold text-[var(--muted)]">
                          {emp.firstName?.[0]}{emp.lastName?.[0]}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text)] truncate">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-[10px] text-[var(--muted)] truncate">{emp.position || 'Team Member'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-semibold text-[var(--muted)] block">Attendance</span>
                      <span className={`text-xs font-bold ${
                        sum.attendancePct >= 90 ? 'text-[var(--status-success-text)]' :
                        sum.attendancePct < 75 ? 'text-[var(--status-danger-text)]' : 'text-[var(--text)]'
                      }`}>
                        {sum.attendancePct}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-semibold text-[var(--muted)] block">Hours</span>
                      <span className="text-xs font-semibold text-[var(--text)]">{sum.totalHours || 0}h</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default EmployeeMobilePerformance;
