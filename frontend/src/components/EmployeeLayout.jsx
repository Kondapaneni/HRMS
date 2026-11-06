import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Clock,
  Calendar,
  CalendarCheck,
  CalendarDays,
  IndianRupee,
  Wallet,
  DollarSign,
  BarChart2,
  Briefcase,
  ShoppingBag,
  Building2,
  Award,
  Play,
  User,
  Megaphone,
  Terminal,
  Sparkles,
  Shield,
} from 'lucide-react';
import { useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import MaintenanceOverlay from './MaintenanceOverlay';
import GlobalSearch from './GlobalSearch';
import EmployeeChatbot from './EmployeeChatbot';
import AppShell from './AppShell';
import BottomNav from './ui/BottomNav';
import api from '../api/axios';

const EmployeeLayout = () => {
  const { profile } = useAuth();
  const location = useLocation();

  const [isDevBypassed, setIsDevBypassed] = useState(
    () => localStorage.getItem('dev_bypass_maintenance_session') === 'true'
  );

  const handleExitBypass = () => {
    localStorage.removeItem('dev_bypass_maintenance_session');
    setIsDevBypassed(false);
  };

  // Check today's assessment
  const { data: employeeAssessments = [] } = useQuery({
    queryKey: ['employeeAssessmentsList'],
    queryFn: async () => {
      try {
        const res = await api.get('/employee/assessments');
        return res.data || [];
      } catch (e) {
        return [];
      }
    },
    staleTime: 60000,
  });

  // Check training videos
  const { data: employeeTrainingVideos = [] } = useQuery({
    queryKey: ['employeeTrainingVideosList'],
    queryFn: async () => {
      try {
        const res = await api.get('/employee/training/videos');
        return res.data || [];
      } catch (e) {
        return [];
      }
    },
    staleTime: 60000,
  });

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const hasAssessmentToday = useMemo(() => {
    return (
      Array.isArray(employeeAssessments) &&
      employeeAssessments.some((a) => a.assessment_date && a.assessment_date === todayStr)
    );
  }, [employeeAssessments, todayStr]);

  const hasTrainingVideos = useMemo(() => {
    return Array.isArray(employeeTrainingVideos) && employeeTrainingVideos.length > 0;
  }, [employeeTrainingVideos]);

  // Fetch news & maintenance status
  const { data: newsData } = useQuery({
    queryKey: ['newsHeadlines'],
    queryFn: async () => {
      try {
        const res = await api.get('/news');
        return res.data;
      } catch (e) {
        return { news_headlines: [], maintenance_mode: false, maintenance_message: '' };
      }
    },
    refetchInterval: 15000,
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  const newsHeadlines = newsData?.news_headlines || profile?.news_headlines || [];
  const isMaintenanceMode = newsData?.maintenance_mode === true;
  const maintenanceMessage = newsData?.maintenance_message;
  const showMaintenanceOverlay = isMaintenanceMode && !isDevBypassed;

  // Rail Navigation Groups (Section 4.3 Employee Portal)
  const railGroups = useMemo(() => {
    const groups = [
      {
        id: 'home',
        icon: Home,
        label: 'Home',
        path: '/employee',
        chips: [{ label: 'Dashboard', path: '/employee', exact: true }],
        activeMatch: (pathname) => pathname === '/employee' || pathname.startsWith('/employee/birthdays'),
      },
      {
        id: 'time',
        icon: Clock,
        label: 'Time',
        path: '/employee/attendance',
        chips: [
          { label: 'Attendance', path: '/employee/attendance' },
          { label: 'Leaves', path: '/employee/leaves' },
          { label: 'Holidays', path: '/employee/holidays' },
        ],
        activeMatch: (pathname) =>
          pathname.startsWith('/employee/attendance') ||
          pathname.startsWith('/employee/leaves') ||
          pathname.startsWith('/employee/holidays'),
      },
      {
        id: 'money',
        icon: Wallet,
        label: 'Money',
        path: '/employee/payroll',
        chips: [
          { label: 'Payroll', path: '/employee/payroll' },
          { label: 'Expenses', path: '/employee/expenses' },
        ],
        activeMatch: (pathname) =>
          pathname.startsWith('/employee/payroll') ||
          pathname.startsWith('/employee/expenses'),
      },
      {
        id: 'growth',
        icon: BarChart2,
        label: 'Growth',
        path: '/employee/performance',
        chips: [
          { label: 'Performance', path: '/employee/performance' },
          ...(hasAssessmentToday || profile?.role === 'admin'
            ? [{ label: 'Assessments', path: '/employee/assessments' }]
            : []),
          ...(hasTrainingVideos || profile?.role === 'admin'
            ? [{ label: 'Training', path: '/employee/training' }]
            : []),
        ],
        activeMatch: (pathname) =>
          pathname.startsWith('/employee/performance') ||
          pathname.startsWith('/employee/assessments') ||
          pathname.startsWith('/employee/training'),
      },
    ];

    // Authorized Business Apps (individual rail items)
    if (profile?.featureAccess?.canLoanOrigination) {
      groups.push({
        id: 'loans',
        icon: Briefcase,
        label: 'Loans Origination',
        path: '/employee/loans/origination',
        chips: [{ label: 'Loans Origination', path: '/employee/loans/origination' }],
        activeMatch: (pathname) => pathname.startsWith('/employee/loans'),
      });
    }
    if (profile?.featureAccess?.canSalesOrigination) {
      groups.push({
        id: 'sales',
        icon: ShoppingBag,
        label: 'Sales Origination',
        path: '/employee/sales/origination',
        chips: [{ label: 'Sales Origination', path: '/employee/sales/origination' }],
        activeMatch: (pathname) => pathname.startsWith('/employee/sales'),
      });
    }
    if (profile?.featureAccess?.canBranchOperations) {
      groups.push({
        id: 'branch-operations',
        icon: Building2,
        label: 'Branch Operations',
        path: '/employee/branch-operations',
        chips: [{ label: 'Branch Operations', path: '/employee/branch-operations' }],
        activeMatch: (pathname) => pathname.startsWith('/employee/branch-operations'),
      });
    }

    // HR Admin Portal — shown when any HRMS admin feature flag is granted
    const fa = profile?.featureAccess;
    const hasAnyAdminAccess =
      fa?.canEmployees ||
      fa?.canAttendance ||
      fa?.canLeave ||
      fa?.canPayroll ||
      fa?.canAssets ||
      fa?.canRecruitment ||
      fa?.canAdminAssessments;

    if (hasAnyAdminAccess) {
      // Resolve the first accessible admin path (mirrors HRAdminLayout group priority)
      const firstAdminPath =
        (fa.canEmployees && '/admin/employees') ||
        (fa.canRecruitment && '/admin/recruitment') ||
        (fa.canAttendance && '/admin/attendance') ||
        (fa.canLeave && '/admin/leaves') ||
        (fa.canPayroll && '/admin/payroll') ||
        (fa.canAssets && '/admin/assets') ||
        (fa.canAdminAssessments && '/admin/assessments');

      groups.push({
        id: 'hr-admin',
        icon: Shield,
        label: 'HR Admin',
        path: firstAdminPath,
        chips: [{ label: 'HR Admin', path: firstAdminPath }],
        activeMatch: (pathname) => pathname.startsWith('/admin'),
      });
    }

    // Profile (bottom pinned)
    groups.push({
      id: 'profile',
      icon: User,
      label: 'Profile',
      path: '/employee/profile',
      isBottom: true,
      chips: [
        { label: 'Profile', path: '/employee/profile' },
      ],
      activeMatch: (pathname) => pathname.startsWith('/employee/profile'),
    });

    return groups;
  }, [profile, hasAssessmentToday, hasTrainingVideos]);

  // Mobile Bottom Nav items
  const bottomNavItems = [
    {
      id: 'home',
      to: '/employee',
      label: 'Home',
      icon: Home,
      end: true,
      activeMatch: (pathname) => pathname === '/employee' || pathname.startsWith('/employee/birthdays'),
    },
    {
      id: 'time',
      to: '/employee/attendance',
      label: 'Attendance',
      icon: CalendarCheck,
      activeMatch: (pathname) =>
        pathname.startsWith('/employee/attendance') ||
        pathname.startsWith('/employee/leaves') ||
        pathname.startsWith('/employee/holidays'),
    },
    {
      id: 'money',
      to: '/employee/payroll',
      label: 'Pay',
      icon: IndianRupee,
      activeMatch: (pathname) =>
        pathname.startsWith('/employee/payroll') ||
        pathname.startsWith('/employee/expenses'),
    },
    {
      id: 'growth',
      to: '/employee/performance',
      label: 'Performance',
      icon: BarChart2,
      activeMatch: (pathname) =>
        pathname.startsWith('/employee/performance') ||
        pathname.startsWith('/employee/assessments') ||
        pathname.startsWith('/employee/training'),
    },
    {
      id: 'profile',
      to: '/employee/profile',
      label: 'Profile',
      icon: User,
      activeMatch: (pathname) => pathname.startsWith('/employee/profile'),
    },
  ];

  return (
    <>
      {showMaintenanceOverlay && (
        <MaintenanceOverlay
          message={maintenanceMessage}
          onBypassSuccess={() => setIsDevBypassed(true)}
        />
      )}

      {/* Floating Developer Bypass Badge */}
      {isMaintenanceMode && isDevBypassed && (
        <div className="fixed top-3 right-3 sm:right-6 z-[95] bg-[#131315]/95 text-white px-3.5 py-1.5 rounded-full border border-white/10 shadow-xl flex items-center gap-2.5 text-[12px] font-medium">
          <Terminal size={14} className="text-[var(--success-text)] shrink-0" />
          <span>Dev Bypass Active</span>
          <button
            type="button"
            onClick={handleExitBypass}
            className="text-[11px] font-semibold text-[var(--danger-text)] bg-[var(--danger-bg)] px-2 py-0.5 rounded-full cursor-pointer ml-1"
          >
            Exit
          </button>
        </div>
      )}

      <AppShell
        portalName="Acme HRMS"
        portalSubtitle="Employee Workspace"
        railGroups={railGroups}
        bottomNavItems={bottomNavItems}
        accentColor="#8AADDB"
        searchComponent={profile?.featureAccess?.canEmployees ? <GlobalSearch /> : undefined}
        hideMobileNavRoutes={[
          '/employee/leaves/apply',
          '/employee/profile/edit',
          '/employee/expenses/claim',
          '/employee/attendance/camera',
          '/employee/attendance/map',
        ]}
        disableMobileDrawer={true}
      >
        {/* News Headline Ticker */}
        {newsHeadlines.length > 0 && (
          <div
            className="mb-4 bg-[var(--surface)] text-[var(--text)] rounded-full h-9 px-4 border border-[var(--line)] flex items-center overflow-hidden"
            style={{ marginTop: '5px' }}
          >
            <Megaphone size={14} className="text-[var(--brand-deep)] mr-2.5 shrink-0" />
            <div className="flex-1 overflow-hidden relative h-full flex items-center text-[12px] font-medium text-[var(--muted)]">
              <motion.div
                key={newsHeadlines.join(' • ')}
                className="flex whitespace-nowrap"
                animate={{ x: ['0%', '-50%'] }}
                transition={{
                  repeat: Infinity,
                  duration: Math.max(30, newsHeadlines.join(' • ').length * 0.4),
                  ease: 'linear',
                }}
              >
                <span className="pr-10">{Array(4).fill(newsHeadlines.join('   •   ')).join('   •   ')}</span>
                <span className="pr-10">{Array(4).fill(newsHeadlines.join('   •   ')).join('   •   ')}</span>
              </motion.div>
            </div>
          </div>
        )}

        <Outlet />
      </AppShell>

      {/* Employee AI Assistant Chatbot */}
      <EmployeeChatbot />
    </>
  );
};

export default EmployeeLayout;
