import React from 'react';
import { 
  Building2, 
  Activity, 
  Briefcase, 
  ArrowLeft,
  LayoutDashboard,
  Users,
  FileText
} from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import AppShell from './AppShell';

const BranchOperationsLayout = () => {
  const railGroups = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/employee/branch-operations/dashboard',
      chips: [{ label: 'Dashboard', path: '/employee/branch-operations/dashboard', exact: true }],
      activeMatch: (pathname) =>
        pathname === '/employee/branch-operations' ||
        pathname === '/employee/branch-operations/dashboard',
    },
    {
      id: 'leads',
      icon: Users,
      label: 'Leads',
      path: '/employee/branch-operations/leads',
      chips: [{ label: 'Branch Leads', path: '/employee/branch-operations/leads' }],
      activeMatch: (pathname) => pathname.startsWith('/employee/branch-operations/leads'),
    },
    {
      id: 'activities',
      icon: Activity,
      label: 'Activities',
      path: '/employee/branch-operations/activities',
      chips: [{ label: 'Activities', path: '/employee/branch-operations/activities' }],
      activeMatch: (pathname) => pathname.startsWith('/employee/branch-operations/activities'),
    },
    {
      id: 'applications',
      icon: FileText,
      label: 'Loan Applications',
      path: '/employee/branch-operations/loans-applications',
      chips: [{ label: 'Loan Applications', path: '/employee/branch-operations/loans-applications' }],
      activeMatch: (pathname) =>
        pathname.startsWith('/employee/branch-operations/loans-applications') ||
        pathname.startsWith('/employee/branch-operations/loans-view-applications') ||
        pathname.startsWith('/employee/branch-operations/loans-edit-application'),
    },
  ];

  const bottomNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/employee/branch-operations/dashboard' },
    { label: 'Leads', icon: Users, path: '/employee/branch-operations/leads' },
    { label: 'Activities', icon: Activity, path: '/employee/branch-operations/activities' },
    { label: 'Loans', icon: FileText, path: '/employee/branch-operations/loans-applications' },
  ];

  return (
    <AppShell
      portalName="Branch Operations"
      portalSubtitle="Operations Hub"
      railGroups={railGroups}
      bottomNavItems={bottomNavItems}
      accentColor="#2DD4BF"
      headerAction={
        <Link
          to="/employee"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)] text-[12px] font-medium transition-colors"
          title="Return to Employee Workspace"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Workspace</span>
        </Link>
      }
      hideMobileNavRoutes={[
        '/employee/branch-operations/loans-view-applications',
        '/employee/branch-operations/loans-edit-application',
        '/employee/branch-operations/view-application',
        '/employee/branch-operations/edit-application',
      ]}
    >
      <Outlet />
    </AppShell>
  );
};

export default BranchOperationsLayout;
