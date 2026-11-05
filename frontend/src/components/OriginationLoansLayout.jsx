import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  FileText, 
  Activity, 
  ArrowLeft 
} from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import AppShell from './AppShell';

const OriginationLoansLayout = () => {
  const railGroups = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/employee/loans/origination',
      chips: [{ label: 'Dashboard', path: '/employee/loans/origination', exact: true }],
      activeMatch: (pathname) => pathname === '/employee/loans/origination',
    },
    {
      id: 'leads',
      icon: Users,
      label: 'Leads',
      path: '/employee/loans/origination/leads',
      chips: [{ label: 'Leads', path: '/employee/loans/origination/leads' }],
      activeMatch: (pathname) => pathname.startsWith('/employee/loans/origination/leads'),
    },
    {
      id: 'members',
      icon: UserCheck,
      label: 'Members',
      path: '/employee/loans/origination/members',
      chips: [{ label: 'Members', path: '/employee/loans/origination/members' }],
      activeMatch: (pathname) => pathname.startsWith('/employee/loans/origination/members'),
    },
    {
      id: 'applications',
      icon: FileText,
      label: 'Applications',
      path: '/employee/loans/origination/applications',
      chips: [{ label: 'Applications', path: '/employee/loans/origination/applications' }],
      activeMatch: (pathname) =>
        pathname.startsWith('/employee/loans/origination/applications') ||
        pathname.startsWith('/employee/loans/form') ||
        pathname.startsWith('/employee/loans/view-application'),
    },
    {
      id: 'activities',
      icon: Activity,
      label: 'Activities',
      path: '/employee/loans/origination/activities',
      chips: [{ label: 'Activities', path: '/employee/loans/origination/activities' }],
      activeMatch: (pathname) => pathname.startsWith('/employee/loans/origination/activities'),
    },
  ];

  const bottomNavItems = [
    { to: '/employee/loans/origination', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/employee/loans/origination/leads', label: 'Leads', icon: Users },
    { to: '/employee/loans/origination/members', label: 'Members', icon: UserCheck },
    { to: '/employee/loans/origination/applications', label: 'Apps', icon: FileText },
    { to: '/employee/loans/origination/activities', label: 'Activity', icon: Activity },
  ];

  return (
    <AppShell
      portalName="Loans Origination"
      portalSubtitle="Origination Hub"
      railGroups={railGroups}
      bottomNavItems={bottomNavItems}
      accentColor="#8AADDB"
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
        '/employee/loans/form',
        '/employee/loans/view-application',
        '/employee/loans/origination/leads/add',
        '/employee/loans/origination/leads/details',
        '/employee/loans/origination/members/details',
      ]}
    >
      <Outlet />
    </AppShell>
  );
};

export default OriginationLoansLayout;
