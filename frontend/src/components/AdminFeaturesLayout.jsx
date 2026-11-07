import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link, Outlet, useLocation } from 'react-router-dom';
import {
  Users,
  Clock,
  Wallet,
  Briefcase,
  Package,
  GraduationCap,
  ArrowLeft,
  Monitor,
  LogOut,
} from 'lucide-react';
import AppShell from './AppShell';
import Button from './ui/Button';
import GlobalSearch from './GlobalSearch';

const AdminFeaturesLayout = () => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const fa = profile?.featureAccess;

  const railGroups = useMemo(() => {
    if (!fa) return [];
    const groups = [];

    // People: Employees + Recruitment
    if (fa.canEmployees || fa.canRecruitment) {
      const chips = [];
      if (fa.canEmployees) {
        chips.push({ label: 'Employees', path: '/admin/employees' });
        chips.push({ label: 'Org Directory', path: '/admin/directory' });
      }
      if (fa.canRecruitment) {
        chips.push({ label: 'Recruitment', path: '/admin/recruitment' });
      }
      groups.push({
        id: 'people',
        icon: Users,
        label: 'People',
        path: chips[0].path,
        chips,
        activeMatch: (pathname) =>
          pathname.startsWith('/admin/employees') ||
          pathname.startsWith('/admin/directory') ||
          pathname.startsWith('/admin/recruitment'),
      });
    }

    // Time: Attendance + Leave
    if (fa.canAttendance || fa.canLeave) {
      const chips = [];
      if (fa.canAttendance) {
        chips.push({ label: 'Attendance', path: '/admin/attendance', exact: true });
        chips.push({ label: 'Locations & Shifts', path: '/admin/attendance/config' });
        chips.push({ label: 'Holidays', path: '/admin/holidays' });
      }
      if (fa.canLeave) {
        chips.push({ label: 'Leave', path: '/admin/leaves' });
      }
      groups.push({
        id: 'time',
        icon: Clock,
        label: 'Time',
        path: chips[0].path,
        chips,
        activeMatch: (pathname) =>
          pathname.startsWith('/admin/attendance') ||
          pathname.startsWith('/admin/leaves') ||
          pathname.startsWith('/admin/holidays'),
      });
    }

    // Money: Payroll + Expenses + Assets
    if (fa.canPayroll || fa.canExpenses || fa.canAssets) {
      const chips = [];
      if (fa.canPayroll) chips.push({ label: 'Payroll', path: '/admin/payroll' });
      if (fa.canExpenses) chips.push({ label: 'Expenses', path: '/admin/expenses' });
      if (fa.canAssets) chips.push({ label: 'Assets', path: '/admin/assets' });
      groups.push({
        id: 'money',
        icon: Wallet,
        label: 'Money',
        path: chips[0].path,
        chips,
        activeMatch: (pathname) =>
          pathname.startsWith('/admin/payroll') ||
          pathname.startsWith('/admin/expenses') ||
          pathname.startsWith('/admin/assets'),
      });
    }

    // Assessments & LMS
    if (fa.canAdminAssessments) {
      groups.push({
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
      });
    }

    return groups;
  }, [fa]);

  // No feature access at all — redirect to employee workspace
  if (!fa || railGroups.length === 0) {
    return <Navigate to="/employee" replace />;
  }

  // If a non-admin user lands on /admin index route, redirect to their first accessible feature
  if (location.pathname === '/admin' || location.pathname === '/admin/') {
    const firstAdminPath =
      railGroups[0]?.chips?.[0]?.path ||
      railGroups[0]?.path ||
      '/employee';
    return <Navigate to={firstAdminPath} replace />;
  }

  return (
    <>
      <AppShell
        portalName="Admin Features"
        portalSubtitle="Management Portal"
        railGroups={railGroups}
        bottomNavItems={[]}
        accentColor="#8AADDB"
        hideProfileAvatar={true}
        searchComponent={fa?.canEmployees ? <GlobalSearch /> : undefined}
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
        disableMobileDrawer={true}
      >
        <Outlet />
      </AppShell>

      {/* Mobile Restriction Overlay */}
      <style>{`
        .admin-features-mobile-overlay {
          display: none;
        }
        @media (max-width: 768px) {
          .admin-features-mobile-overlay {
            display: flex;
          }
        }
      `}</style>

      <div className="admin-features-mobile-overlay fixed inset-0 z-[9999] flex-col items-center justify-center bg-[#131315]/45 backdrop-blur-md p-6 text-center select-none">
        <div className="bg-[var(--surface)] text-[var(--text)] rounded-[24px] p-6 sm:p-8 max-w-sm w-full shadow-[var(--shadow-modal)] border border-[var(--line)]/50 flex flex-col items-center">
          <div className="w-14 h-14 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center mb-4">
            <Monitor size={26} strokeWidth={1.7} />
          </div>
          <h3 className="text-[18px] font-medium text-[var(--text)] mb-1.5 leading-snug">
            Desktop access required
          </h3>
          <p className="text-[13px] text-[var(--muted)] leading-relaxed mb-6">
            This management workspace can only be accessed from a desktop or laptop screen. Please use a desktop browser to continue.
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

export default AdminFeaturesLayout;

