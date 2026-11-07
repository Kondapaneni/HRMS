import { 
  Activity, 
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
      path: '/employee/branch-operations',
      chips: [{ label: 'Dashboard', path: '/employee/branch-operations', exact: true }],
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
    {
      id: 'activities',
      icon: Activity,
      label: 'Activities',
      path: '/employee/branch-operations/activities',
      chips: [{ label: 'Activities', path: '/employee/branch-operations/activities' }],
      activeMatch: (pathname) => pathname.startsWith('/employee/branch-operations/activities'),
    },
  ];

  const bottomNavItems = [
    {
      to: '/employee/branch-operations',
      label: 'Dashboard',
      icon: LayoutDashboard,
      end: true,
      activeMatch: (pathname) =>
        pathname === '/employee/branch-operations' ||
        pathname === '/employee/branch-operations/dashboard',
    },
    { to: '/employee/branch-operations/leads', label: 'Leads', icon: Users },
    {
      to: '/employee/branch-operations/loans-applications',
      label: 'Loans',
      icon: FileText,
      activeMatch: (pathname) => pathname.startsWith('/employee/branch-operations/loans'),
    },
    { to: '/employee/branch-operations/activities', label: 'Activity', icon: Activity },
  ];

  return (
    <AppShell
      portalName="Branch Operations"
      portalSubtitle="Operations Hub"
      railGroups={railGroups}
      bottomNavItems={bottomNavItems}
      accentColor="#2DD4BF"
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
