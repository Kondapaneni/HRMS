import React from 'react';
import { 
  HelpCircle, 
  FileCheck2, 
  Award, 
  PlaySquare, 
  ArrowLeft 
} from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppShell from './AppShell';

const AssessmentWorkspaceLayout = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const fa = profile?.featureAccess;

  // If user has other HR Admin features (Employees, Attendance, Leave, Payroll, Assets, Recruitment),
  // return to HR Admin portal. Otherwise, return to Employee Workspace.
  const hrAdminPath =
    (fa?.canEmployees && '/admin/employees') ||
    (fa?.canRecruitment && '/admin/recruitment') ||
    (fa?.canAttendance && '/admin/attendance') ||
    (fa?.canLeave && '/admin/leaves') ||
    (fa?.canPayroll && '/admin/payroll') ||
    (fa?.canAssets && '/admin/assets');

  const backDestination = isAdmin ? '/admin' : (hrAdminPath || '/employee');
  const backTitle = isAdmin
    ? 'Return to Admin Workspace'
    : (hrAdminPath ? 'Return to HR Admin' : 'Return to Employee Workspace');

  const railGroups = [
    {
      id: 'questions',
      icon: HelpCircle,
      label: 'Question Bank',
      path: '/admin/assessments/questions',
      chips: [{ label: 'Question Bank', path: '/admin/assessments/questions' }],
      activeMatch: (pathname) => pathname.startsWith('/admin/assessments/questions'),
    },
    {
      id: 'management',
      icon: FileCheck2,
      label: 'Management',
      path: '/admin/assessments/management',
      chips: [
        { label: 'Assessments', path: '/admin/assessments/management' },
        { label: 'Create New', path: '/admin/assessments/create' },
      ],
      activeMatch: (pathname) =>
        pathname.startsWith('/admin/assessments/management') ||
        pathname.startsWith('/admin/assessments/create') ||
        pathname.startsWith('/admin/assessments/edit'),
    },
    {
      id: 'results',
      icon: Award,
      label: 'Results & Attempts',
      path: '/admin/assessments/results',
      chips: [{ label: 'Results & Attempts', path: '/admin/assessments/results' }],
      activeMatch: (pathname) => pathname.startsWith('/admin/assessments/results'),
    },
    {
      id: 'training',
      icon: PlaySquare,
      label: 'Training Videos',
      path: '/admin/assessments/training',
      chips: [{ label: 'Training Modules', path: '/admin/assessments/training' }],
      activeMatch: (pathname) => pathname.startsWith('/admin/assessments/training'),
    },
  ];

  const bottomNavItems = [
    { label: 'Questions', icon: HelpCircle, path: '/admin/assessments/questions' },
    { label: 'Manage', icon: FileCheck2, path: '/admin/assessments/management' },
    { label: 'Results', icon: Award, path: '/admin/assessments/results' },
    { label: 'Training', icon: PlaySquare, path: '/admin/assessments/training' },
  ];

  return (
    <AppShell
      portalName="Assessment Hub"
      portalSubtitle="Testing & Training"
      railGroups={railGroups}
      bottomNavItems={bottomNavItems}
      accentColor="#8AADDB"
      headerAction={
        <Link
          to={backDestination}
          className="w-10 h-10 rounded-full bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center border border-[var(--line)] shadow-none transition-colors cursor-pointer active:scale-95 shrink-0"
          title={backTitle}
          aria-label={backTitle}
        >
          <ArrowLeft size={18} strokeWidth={1.7} />
        </Link>
      }
    >
      <Outlet />
    </AppShell>
  );
};

export default AssessmentWorkspaceLayout;
