import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutGrid, 
  Users, 
  Clock, 
  Wallet, 
  Briefcase, 
  Shield, 
  Sliders, 
  Monitor,
  LogOut,
  GraduationCap
} from 'lucide-react';
import { useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import GlobalSearch from './GlobalSearch';
import AdminFeaturesLayout from './AdminFeaturesLayout';
import AdminChatbot from './AdminChatbot';
import AppShell from './AppShell';
import Button from './ui/Button';
import { supabase } from '../lib/supabase';

const AdminLayout = () => {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  // Non-admin roles (hr/manager/employee) with feature access use the Admin Features layout
  if (profile?.role !== 'admin') {
    return <AdminFeaturesLayout />;
  }

  const { data: pendingDocsCount = 0 } = useQuery({
    queryKey: ['admin_pending_docs'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('candidate_documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 5000,
  });

  /**
   * Admin Rail Navigation Groups (Section 4.2: 15 items become 7 rail groups)
   */
  const railGroups = [
    {
      id: 'overview',
      icon: LayoutGrid,
      label: 'Overview',
      path: '/admin',
      chips: [
        { label: 'Dashboard', path: '/admin', exact: true },
        { label: 'Reports', path: '/admin/reports' },
      ],
      activeMatch: (pathname) => pathname === '/admin' || pathname.startsWith('/admin/reports'),
    },
    {
      id: 'people',
      icon: Users,
      label: 'People',
      path: '/admin/employees',
      chips: [
        { label: 'Employees', path: '/admin/employees' },
        { label: 'Org Directory', path: '/admin/directory' },
        { label: 'Performance', path: '/admin/performance' },
      ],
      activeMatch: (pathname) =>
        pathname.startsWith('/admin/employees') ||
        pathname.startsWith('/admin/directory') ||
        pathname.startsWith('/admin/performance'),
    },
    {
      id: 'time',
      icon: Clock,
      label: 'Time',
      path: '/admin/attendance',
      chips: [
        { label: 'Attendance', path: '/admin/attendance', exact: true },
        { label: 'Leave', path: '/admin/leaves' },
        { label: 'Locations & shifts', path: '/admin/attendance/config' },
        { label: 'Holidays', path: '/admin/holidays' },
      ],
      activeMatch: (pathname) =>
        pathname.startsWith('/admin/attendance') ||
        pathname.startsWith('/admin/leaves') ||
        pathname.startsWith('/admin/holidays'),
    },
    {
      id: 'money',
      icon: Wallet,
      label: 'Money',
      path: '/admin/payroll',
      chips: [
        { label: 'Payroll', path: '/admin/payroll' },
        { label: 'Expenses', path: '/admin/expenses' },
        { label: 'Assets', path: '/admin/assets' },
      ],
      activeMatch: (pathname) =>
        pathname.startsWith('/admin/payroll') ||
        pathname.startsWith('/admin/expenses') ||
        pathname.startsWith('/admin/assets'),
    },
    {
      id: 'hiring',
      icon: Briefcase,
      label: 'Recruitment',
      path: '/admin/recruitment',
      badge: pendingDocsCount > 0 ? String(pendingDocsCount) : null,
      chips: [
        { label: 'Recruitment', path: '/admin/recruitment', badge: pendingDocsCount > 0 ? pendingDocsCount : undefined },
        { label: 'Email Templates', path: '/admin/email-templates' },
      ],
      activeMatch: (pathname) =>
        pathname.startsWith('/admin/recruitment') ||
        pathname.startsWith('/admin/email-templates'),
    },
    {
      id: 'assessments',
      icon: GraduationCap,
      label: 'Assessments',
      path: '/admin/assessments/questions',
      chips: [
        { label: 'Question Bank', path: '/admin/assessments/questions' },
        { 
          label: 'Assessments', 
          path: '/admin/assessments/management',
          activeMatch: (pathname) =>
            pathname.startsWith('/admin/assessments/management') ||
            pathname.startsWith('/admin/assessments/create') ||
            pathname.startsWith('/admin/assessments/edit'),
        },
        { label: 'Results & Attempts', path: '/admin/assessments/results' },
        { label: 'Training Modules', path: '/admin/assessments/training' },
      ],
      activeMatch: (pathname) => pathname.startsWith('/admin/assessments'),
    },
    {
      id: 'governance',
      icon: Shield,
      label: 'Governance',
      path: '/admin/audit-logs',
      chips: [
        { label: 'Audit Logs', path: '/admin/audit-logs' },
        { label: 'Feature Access', path: '/admin/feature-access' },
      ],
      activeMatch: (pathname) =>
        pathname.startsWith('/admin/audit-logs') ||
        pathname.startsWith('/admin/feature-access'),
    },
    {
      id: 'settings',
      icon: Sliders,
      label: 'Settings',
      path: '/admin/settings',
      isBottom: true,
      chips: [
        { label: 'Settings', path: '/admin/settings' },
      ],
      activeMatch: (pathname) => pathname.startsWith('/admin/settings'),
    },
  ];

  return (
    <>
      <AppShell
        portalName="Acme HRMS"
        portalSubtitle="Workspace Admin"
        railGroups={railGroups}
        accentColor="#8AADDB"
        searchComponent={<GlobalSearch />}
        notificationsCount={pendingDocsCount}
      >
        <Outlet />
      </AppShell>

      {/* Admin AI Assistant Chatbot */}
      <AdminChatbot />

      {/* Mobile Restriction Overlay for Admins (Restyled with Design Tokens) */}
      <style>{`
        .mobile-restriction-overlay {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-restriction-overlay {
            display: flex;
          }
        }
      `}</style>

      <div className="mobile-restriction-overlay fixed inset-0 z-[9999] flex-col items-center justify-center bg-[#131315]/45 backdrop-blur-md p-6 text-center select-none">
        <div className="bg-[var(--surface)] text-[var(--text)] rounded-[24px] p-6 sm:p-8 max-w-sm w-full shadow-[var(--shadow-modal)] border border-[var(--line)]/50 flex flex-col items-center">
          <div className="w-14 h-14 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center mb-4">
            <Monitor size={26} strokeWidth={1.7} />
          </div>

          <h3 className="text-[18px] font-medium text-[var(--text)] mb-1.5 leading-snug">
            Desktop access required
          </h3>
          <p className="text-[13px] text-[var(--muted)] leading-relaxed mb-6">
            Admin accounts can only be accessed from a desktop or laptop screen. Please use a desktop browser to continue.
          </p>

          <Button
            variant="secondary"
            size="md"
            onClick={signOut}
            leftIcon={LogOut}
            className="w-full"
          >
            Sign out
          </Button>
        </div>
      </div>
    </>
  );
};

export default AdminLayout;
