import React from 'react';
import { 
  HelpCircle, 
  FileCheck2, 
  Award, 
  PlaySquare, 
  ArrowLeft 
} from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import AppShell from './AppShell';

const AssessmentWorkspaceLayout = () => {
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
          to="/admin"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)] text-[12px] font-medium transition-colors"
          title="Return to Admin Workspace"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Admin</span>
        </Link>
      }
    >
      <Outlet />
    </AppShell>
  );
};

export default AssessmentWorkspaceLayout;
