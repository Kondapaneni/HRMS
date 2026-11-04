import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Activity, 
  ArrowLeft 
} from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import AppShell from './AppShell';

const OriginationSalesLayout = () => {
  const railGroups = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/employee/sales/origination',
      chips: [{ label: 'Dashboard', path: '/employee/sales/origination', exact: true }],
      activeMatch: (pathname) => pathname === '/employee/sales/origination',
    },
    {
      id: 'leads',
      icon: Users,
      label: 'Leads',
      path: '/employee/sales/origination/leads',
      chips: [{ label: 'Sales Leads', path: '/employee/sales/origination/leads' }],
      activeMatch: (pathname) => pathname.startsWith('/employee/sales/origination/leads'),
    },
    {
      id: 'members',
      icon: UserCheck,
      label: 'Members',
      path: '/employee/sales/origination/members',
      chips: [{ label: 'Members', path: '/employee/sales/origination/members' }],
      activeMatch: (pathname) =>
        pathname.startsWith('/employee/sales/origination/members') ||
        pathname.startsWith('/employee/sales/form'),
    },
    {
      id: 'activities',
      icon: Activity,
      label: 'Activities',
      path: '/employee/sales/origination/activities',
      chips: [{ label: 'Activities', path: '/employee/sales/origination/activities' }],
      activeMatch: (pathname) => pathname.startsWith('/employee/sales/origination/activities'),
    },
  ];

  const bottomNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/employee/sales/origination' },
    { label: 'Leads', icon: Users, path: '/employee/sales/origination/leads' },
    { label: 'Members', icon: UserCheck, path: '/employee/sales/origination/members' },
    { label: 'Activities', icon: Activity, path: '/employee/sales/origination/activities' },
  ];

  return (
    <AppShell
      portalName="Sales Origination"
      portalSubtitle="Origination Hub"
      railGroups={railGroups}
      bottomNavItems={bottomNavItems}
      accentColor="#E3B9DF"
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
        '/employee/sales/origination/leads/add',
        '/employee/sales/origination/leads/details',
        '/employee/sales/origination/members/details',
        '/employee/sales/form',
      ]}
    >
      <Outlet />
    </AppShell>
  );
};

export default OriginationSalesLayout;
