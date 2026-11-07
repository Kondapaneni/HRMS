import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Briefcase,
  FileText,
  User,
  Compass,
  Terminal,
} from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import MaintenanceOverlay from './MaintenanceOverlay';
import AppShell from './AppShell';
import api from '../api/axios';

const CandidateLayout = () => {
  const { profile } = useAuth();

  const [isDevBypassed, setIsDevBypassed] = useState(
    () => localStorage.getItem('dev_bypass_maintenance_session') === 'true'
  );

  const handleExitBypass = () => {
    localStorage.removeItem('dev_bypass_maintenance_session');
    setIsDevBypassed(false);
  };

  // Fetch news & maintenance status
  const { data: newsData } = useQuery({
    queryKey: ['newsHeadlines'],
    queryFn: async () => {
      try {
        const res = await api.get('/news');
        return res.data;
      } catch {
        return { news_headlines: [], maintenance_mode: false, maintenance_message: '' };
      }
    },
    refetchInterval: 15000,
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  const isMaintenanceMode = newsData?.maintenance_mode === true;
  const maintenanceMessage = newsData?.maintenance_message;
  const showMaintenanceOverlay = isMaintenanceMode && !isDevBypassed;

  // Rail Navigation Groups (Section 4.3 Candidate Portal: Accent #E3B9DF)
  const railGroups = [
    {
      id: 'dashboard',
      icon: Home,
      label: 'Dashboard',
      path: '/candidate/dashboard',
      chips: [{ label: 'Dashboard', path: '/candidate/dashboard', exact: true }],
      activeMatch: (pathname) => pathname === '/candidate/dashboard',
    },
    {
      id: 'jobs',
      icon: Briefcase,
      label: 'Jobs',
      path: '/candidate/jobs',
      chips: [{ label: 'Explore Jobs', path: '/candidate/jobs' }],
      activeMatch: (pathname) => pathname.startsWith('/candidate/jobs'),
    },
    {
      id: 'applications',
      icon: FileText,
      label: 'Applications',
      path: '/candidate/applications',
      chips: [{ label: 'My Applications', path: '/candidate/applications' }],
      activeMatch: (pathname) => pathname.startsWith('/candidate/applications'),
    },
    {
      id: 'profile',
      icon: User,
      label: 'Profile',
      path: '/candidate/profile',
      isBottom: true,
      chips: [{ label: 'My Profile', path: '/candidate/profile' }],
      activeMatch: (pathname) => pathname.startsWith('/candidate/profile'),
    },
  ];

  const mobileNavItems = [
    { to: '/candidate/dashboard', label: 'Home', icon: Home, end: true },
    { to: '/candidate/jobs', label: 'Jobs', icon: Briefcase },
    { to: '/candidate/applications', label: 'Apps', icon: FileText },
    { to: '/candidate/profile', label: 'Profile', icon: User },
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
        portalSubtitle="Candidate Portal"
        railGroups={railGroups}
        bottomNavItems={mobileNavItems}
        accentColor="#E3B9DF"
        headerAction={
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)] text-[12px] font-medium">
            <Compass size={14} />
            <span>Candidate Portal</span>
          </div>
        }
        hideMobileNavRoutes={['/candidate/profile/edit']}
      >
        <Outlet />
      </AppShell>
    </>
  );
};

export default CandidateLayout;
