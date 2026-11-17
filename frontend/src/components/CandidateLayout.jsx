import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Briefcase,
  FileText,
  User,
  Compass,
} from 'lucide-react';
import { useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import AppShell from './AppShell';

const CandidateLayout = () => {
  const { profile } = useAuth();
  const location = useLocation();

  const { data: profileData } = useQuery({
    queryKey: ['candidate', 'profile', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('candidate_profiles')
        .select('avatar_url, documents_tab_seen_at')
        .eq('user_id', profile.id)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });


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
