import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LogOut, Sliders, Settings, Menu, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from './ui/Avatar';
import ThemeToggle from './ui/ThemeToggle';
import LogoutModal from './LogoutModal';
import BottomNav from './ui/BottomNav';

/**
 * AppShell - The single source of truth for all layout components.
 * Spec from Section 4:
 *  - Dark outer sidebar: #131315, radius 32px, padding 14px, sits on #ECECEE canvas with 16px margin
 *  - Rail: 48px icon column, 42x42 group icons (radius 14px). Inactive: #8B8B95, active: brand accent (#8AADDB or #E3B9DF) with #131315 icon
 *  - Optional Context Panel: 280px dark rounded surface for calendar/timeline context
 *  - Header: title/greeting 24px/500, search, notification bell with #2FBF71 dot, theme toggle, 40px avatar on white
 *  - Page Chips: sibling pills under header (active #131315 / white text)
 *  - Mobile Bottom Nav: floating dock on #131315, radius 28px, 12px from edges, active dot below icon
 */
export const AppShell = ({
  portalName = 'Acme HRMS',
  portalSubtitle = 'Workspace',
  railGroups = [], // Array of { id, icon, label, path, activeMatch, chips: [{ label, path, exact }] }
  bottomNavItems = [], // Array of { label, icon, path } (max 5)
  accentColor = '#8AADDB', // '#8AADDB' (default/blue) or '#E3B9DF' (pink)
  contextPanel = null, // Optional React node for 280px context panel
  showContextPanel = false,
  headerTitle,
  headerAction,
  searchComponent,
  notificationsCount = 0,
  onNotificationClick,
  hideMobileNavRoutes = [],
  disableMobileDrawer = false,
  hideProfileAvatar = false,
  children,
}) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [forceHideMobileNav, setForceHideMobileNav] = useState(false);

  const scrollContainerRef = useRef(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Listen for custom hide event
  useEffect(() => {
    const handleToggle = (e) => {
      setForceHideMobileNav(!!e.detail);
    };
    window.addEventListener('toggle-mobile-bottom-nav', handleToggle);
    return () => window.removeEventListener('toggle-mobile-bottom-nav', handleToggle);
  }, []);

  // Reset scroll on navigation
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname, location.search]);

  const shouldHideBottomNav =
    forceHideMobileNav ||
    hideMobileNavRoutes.some((p) =>
      typeof p === 'string'
        ? location.pathname === p || location.pathname.startsWith(`${p}/`)
        : p.test?.(location.pathname)
    );

  const handleConfirmLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      navigate(location.pathname.startsWith('/candidate') ? '/candidate/login' : '/');
    } catch (e) {
      console.error('Logout failed', e);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  // Determine active rail group
  const activeGroup = railGroups.find((group) => {
    if (group.activeMatch) {
      return group.activeMatch(location.pathname);
    }
    if (group.chips?.some((c) => location.pathname === c.path || location.pathname.startsWith(`${c.path}/`))) {
      return true;
    }
    return location.pathname === group.path || (group.path !== '/' && group.path !== '/admin' && group.path !== '/employee' && location.pathname.startsWith(group.path));
  }) || railGroups[0];

  // Active page chips for the active group
  const pageChips = activeGroup?.chips || [];

  // Active title
  const computedTitle =
    headerTitle ||
    pageChips.find((c) =>
      c.exact
        ? location.pathname === c.path
        : c.activeMatch
        ? c.activeMatch(location.pathname)
        : location.pathname === c.path || location.pathname.startsWith(`${c.path}/`)
    )?.label ||
    activeGroup?.label ||
    portalName;

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : profile?.email?.split('@')[0] || 'User';

  const profilePath =
    railGroups.find((g) => g.id === 'profile')?.path ||
    (profile?.role === 'admin' ? '/admin/profile' : '/employee/profile');

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-[var(--bg)] text-[var(--text)] flex select-none relative z-0">
      {/* ============================================================
          DESKTOP SIDEBAR SHELL (768px+)
          Spec: background #131315, radius 32px, padding 14px, full height - 32px, 16px margin
          ============================================================ */}
      <aside className="hidden md:flex my-4 ml-4 h-[calc(100dvh-32px)] bg-[#131315] text-white rounded-[38px] overflow-hidden z-20 shrink-0 shadow-xl border border-white/5 transition-all duration-300">
        {/* RAIL (Icon column, 76px width: 14px padding each side + 48px inner area) */}
        <div className="w-[76px] h-full p-3.5 pb-4 flex flex-col items-center justify-between shrink-0 overflow-hidden">
          {/* Top: Fixed Logo & Scrollable Nav items */}
          <div className="flex flex-col items-center gap-3 w-full min-h-0 flex-1 overflow-hidden">
            {/* Logo */}
            <Link
              to={railGroups[0]?.path || '/'}
              className="w-[42px] h-[42px] rounded-[13px] overflow-hidden flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer group shrink-0"
              title={portalName}
              aria-label={portalName}
            >
              <img
                src="/logo.png"
                alt="Acme HRMS"
                className="w-full h-full object-contain"
              />
            </Link>

            {/* Rail Groups (Scrollable middle container) */}
            <nav className="flex flex-col items-center gap-2 w-full pt-1 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar min-h-0 py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {railGroups.filter((g) => !g.isBottom).map((group) => {
                const isGroupActive = activeGroup?.id === group.id;
                const Icon = group.icon;

                return (
                  <Link
                    key={group.id}
                    to={group.chips?.[0]?.path || group.path}
                    className="relative w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] shrink-0"
                    style={{
                      backgroundColor: isGroupActive ? accentColor : 'transparent',
                      color: isGroupActive ? '#131315' : '#8B8B95',
                    }}
                    title={group.label}
                    aria-label={group.label}
                  >
                    <Icon size={20} strokeWidth={1.7} className="transition-transform group-hover:scale-110" />

                    {/* Unread badge dot */}
                    {group.badge && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D64550] ring-2 ring-[#131315]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Pinned: Settings / Profile & Logout (always fixed at bottom, never overflow) */}
          <div className="flex flex-col items-center gap-2 w-full pt-2.5 mt-2 border-t border-[#1F1F23] shrink-0">
            {railGroups.filter((g) => g.isBottom).map((group) => {
              const isGroupActive = activeGroup?.id === group.id;
              const Icon = group.icon;

              return (
                <Link
                  key={group.id}
                  to={group.path}
                  className="w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer group hover:bg-[#1F1F23] hover:text-white shrink-0"
                  style={{
                    backgroundColor: isGroupActive ? accentColor : 'transparent',
                    color: isGroupActive ? '#131315' : '#8B8B95',
                  }}
                  title={group.label}
                  aria-label={group.label}
                >
                  <Icon size={20} strokeWidth={1.7} />
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="w-[42px] h-[42px] rounded-full text-[#8B8B95] hover:text-[#D64550] hover:bg-[#1F1F23] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={20} strokeWidth={1.7} />
            </button>
          </div>
        </div>

        {/* CONTEXT PANEL (280px, collapsible) */}
        {showContextPanel && contextPanel && (
          <div className="w-[280px] h-full p-3.5 border-l border-[#1F1F23] flex flex-col overflow-y-auto">
            {contextPanel}
          </div>
        )}
      </aside>

      {/* ============================================================
          MAIN WORKSPACE CANVAS (#ECECEE)
          ============================================================ */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative z-10 bg-transparent">
        {/* HEADER */}
        <header className="h-16 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 pt-3">
          {/* Left: Greeting / Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Mobile menu toggle button */}
            {!disableMobileDrawer && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden w-10 h-10 rounded-full bg-[var(--surface)] text-[var(--text)] flex items-center justify-center border border-[var(--line)] shadow-none cursor-pointer active:scale-95 transition-transform shrink-0"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            )}

            {/* Mobile Profile Icon (left edge beside title) */}
            {!hideProfileAvatar && (
              <div className="sm:hidden shrink-0">
                {profilePath ? (
                  <Link
                    to={profilePath}
                    className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                    title={`Signed in as ${displayName}`}
                  >
                    <Avatar
                      src={profile?.avatar}
                      name={displayName}
                      size={36}
                      shape="circle"
                    />
                  </Link>
                ) : (
                  <div
                    className="block rounded-full"
                    title={`Signed in as ${displayName}`}
                  >
                    <Avatar
                      src={profile?.avatar}
                      name={displayName}
                      size={36}
                      shape="circle"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="truncate">
              <h1 className="text-[20px] sm:text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] leading-tight truncate">
                {computedTitle}
              </h1>
            </div>
          </div>

          {/* Right Action Icons: Search, Theme, Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {searchComponent}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mobile Logout Button (in place of profile pic on mobile) */}
            {!hideProfileAvatar && (
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="sm:hidden w-10 h-10 rounded-full bg-[var(--surface)] text-[var(--muted)] hover:text-[#D64550] flex items-center justify-center border border-[var(--line)] shadow-none transition-colors cursor-pointer active:scale-95"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={18} strokeWidth={1.7} />
              </button>
            )}

            {/* Desktop Profile Avatar Pill / Tile */}
            {!hideProfileAvatar && (
              <div
                className="hidden sm:flex h-10 items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--line)] select-none"
                title={`Signed in as ${displayName}`}
              >
                <Avatar
                  src={profile?.avatar}
                  name={displayName}
                  size={32}
                  shape="circle"
                />
                <span className="text-[13px] font-medium text-[var(--text)] truncate max-w-[120px]">
                  {displayName}
                </span>
              </div>
            )}

            {headerAction}
          </div>
        </header>

        {/* PAGE CHIPS (Sibling Sub-pages in the current group) */}
        {pageChips.length > 1 && (
          <div className="px-4 sm:px-6 pt-1 pb-3 shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex items-center gap-2">
              {pageChips.map((chip) => {
                const isActive = chip.exact
                  ? location.pathname === chip.path
                  : chip.activeMatch
                  ? chip.activeMatch(location.pathname)
                  : location.pathname === chip.path || location.pathname.startsWith(`${chip.path}/`);

                return (
                  <Link
                    key={chip.path}
                    to={chip.path}
                    className={`h-[34px] px-4 rounded-full text-[13px] font-medium transition-all flex items-center gap-1.5 select-none shrink-0 ${
                      isActive
                        ? 'bg-[#131315] text-white dark:bg-[#F4F4F6] dark:text-[#18181B] shadow-sm'
                        : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)]'
                    }`}
                  >
                    <span>{chip.label}</span>
                    {chip.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">
                        {chip.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* DYNAMIC SCROLLABLE CONTENT */}
        <div
          id="main-scroll-container"
          ref={scrollContainerRef}
          className={`flex-1 overflow-y-auto overscroll-y-contain px-4 sm:px-6 pb-6 ${
            shouldHideBottomNav ? 'pb-6' : 'pb-[calc(96px+env(safe-area-inset-bottom))]'
          } md:pb-6`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children || <Outlet />}
        </div>

        {/* ============================================================
            MOBILE FLOATING PILL BOTTOM NAVIGATION (<768px)
            ============================================================ */}
        {!shouldHideBottomNav && bottomNavItems.length > 0 && (
          <BottomNav
            items={bottomNavItems.map((item) => {
              const itemPath = item.to || item.path;

              // Correlate with railGroups if activeMatch is not explicitly passed
              const matchingGroup = railGroups.find((group) => {
                if (item.id && group.id === item.id) return true;
                if (group.path === itemPath) return true;
                if (group.chips?.some((c) => c.path === itemPath)) return true;
                return false;
              });

              const resolvedActiveMatch =
                item.activeMatch ||
                (matchingGroup
                  ? (pathname) => {
                      if (matchingGroup.activeMatch) {
                        return matchingGroup.activeMatch(pathname);
                      }
                      if (matchingGroup.chips?.some((c) => pathname === c.path || pathname.startsWith(`${c.path}/`))) {
                        return true;
                      }
                      return (
                        pathname === matchingGroup.path ||
                        (matchingGroup.path !== '/' &&
                          matchingGroup.path !== '/admin' &&
                          matchingGroup.path !== '/employee' &&
                          pathname.startsWith(matchingGroup.path))
                      );
                    }
                  : undefined);

              return {
                to: itemPath,
                label: item.label,
                icon: item.icon,
                end: item.end ?? (
                  !resolvedActiveMatch && (
                    itemPath === '/employee' ||
                    itemPath === '/candidate/dashboard'
                  )
                ),
                activeMatch: resolvedActiveMatch,
              };
            })}
          />
        )}
      </main>

      {/* ============================================================
          MOBILE DRAWER / OFF-CANVAS MENU (<768px)
          ============================================================ */}
      <AnimatePresence>
        {!disableMobileDrawer && isMobileMenuOpen && (
          <motion.div
            key="mobile-drawer-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9999] md:hidden pointer-events-auto"
          >
            {/* Scrim */}
            <motion.div
              key="mobile-drawer-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Menu Panel */}
            <motion.aside
              key="mobile-drawer-panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.38 }}
              style={{ willChange: 'transform' }}
              className="fixed inset-y-0 left-0 w-72 max-w-[85vw] h-full bg-[#131315] text-white p-5 flex flex-col justify-between z-10 rounded-r-[28px] border-r border-white/10 shadow-2xl overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1F1F23]">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/logo.png"
                      alt="Acme HRMS"
                      className="w-8 h-8 rounded-[10px] object-contain shadow-xs shrink-0"
                    />
                    <div>
                      <h3 className="text-[15px] font-medium text-white">{portalName}</h3>
                      <p className="text-[11px] text-[#8B8B95]">{portalSubtitle}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-full bg-[#1F1F23] hover:bg-white/10 text-[#8B8B95] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X size={16} />
                  </button>
                </div>

                <nav className="space-y-1 overflow-y-auto max-h-[calc(100dvh-180px)] pr-1">
                  {railGroups.map((group) => {
                    const isGroupActive = activeGroup?.id === group.id;
                    const Icon = group.icon;

                    return (
                      <Link
                        key={group.id}
                        to={group.chips?.[0]?.path || group.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-[13px] font-medium transition-all ${
                          isGroupActive
                            ? 'text-[#131315] shadow-xs'
                            : 'text-[#8B8B95] hover:text-white hover:bg-[#1F1F23]'
                        }`}
                        style={{
                          backgroundColor: isGroupActive ? accentColor : 'transparent',
                        }}
                      >
                        <Icon size={18} strokeWidth={1.7} />
                        <span>{group.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Bottom Sign Out */}
              <div className="pt-4 border-t border-[#1F1F23]">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowLogoutModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-[13px] font-medium text-[#D64550] hover:bg-[#1F1F23] transition-colors cursor-pointer"
                >
                  <LogOut size={18} strokeWidth={1.7} />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        isLoading={loggingOut}
      />
    </div>
  );
};

export default AppShell;

