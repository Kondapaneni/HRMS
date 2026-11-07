
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
    { to: '/employee/sales/origination', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/employee/sales/origination/leads', label: 'Leads', icon: Users },
    { to: '/employee/sales/origination/members', label: 'Members', icon: UserCheck },
    { to: '/employee/sales/origination/activities', label: 'Activity', icon: Activity },
  ];

  return (
    <AppShell
      portalName="Sales Origination"
      portalSubtitle="Origination Hub"
      railGroups={railGroups}
      bottomNavItems={bottomNavItems}
      accentColor="#E3B9DF"
      hideProfileAvatar={true}
      headerAction={
        <Link
          to="/employee"
          className="w-10 h-10 rounded-full bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center border border-[var(--line)] shadow-none transition-colors cursor-pointer active:scale-95 shrink-0"
          title="Return to Employee Workspace"
          aria-label="Return to Employee Workspace"
        >
          <ArrowLeft size={18} strokeWidth={1.7} />
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
