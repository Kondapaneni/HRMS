// src/components/ui/BottomNav.jsx
// Floating pill bottom navigation: the active tab expands into a pill
// (coloured icon circle + label), the others stay as round dark buttons.
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const spring = { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 };

/**
 * items: [{ to: '/employee', label: 'Home', icon: Home, end: true, activeMatch: (pathname) => boolean }]
 * Use 3 to 5 items and keep labels short (about 8 characters or fewer).
 */
export default function BottomNav({ items }) {
  const location = useLocation();
  const reduce = useReducedMotion();
  const t = reduce ? { duration: 0 } : spring;

  return (
    <nav
      aria-label="Primary"
      data-mobile-nav
      className="mobile-bottom-nav pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 md:hidden"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <ul className="pointer-events-auto m-0 flex w-full max-w-md list-none items-center justify-between gap-1.5 rounded-full bg-[var(--nav-bg)] p-2 shadow-[0_12px_32px_rgba(0,0,0,0.35)] ring-1 ring-[var(--nav-ring)]">
        {items.map(({ to, label, icon: Icon, end, activeMatch }) => {
          const isItemActive = activeMatch ? Boolean(activeMatch(location.pathname)) : undefined;

          return (
            <li key={to} className="flex-none">
              <NavLink
                to={to}
                end={end}
                aria-label={label}
                aria-current={isItemActive !== undefined ? (isItemActive ? 'page' : undefined) : undefined}
                className="block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-active)]"
              >
                {({ isActive: navActive }) => {
                  const isActive = isItemActive !== undefined ? isItemActive : navActive;
                  return (
                    <motion.span
                      layout
                      transition={t}
                      style={{ borderRadius: 9999 }}
                      className={`flex h-12 items-center bg-[var(--nav-item)] ${
                        isActive ? 'gap-2 pl-1 pr-4' : 'w-12 justify-center'
                      }`}
                    >
                      <motion.span
                        layout="position"
                        transition={t}
                        className={`grid place-items-center rounded-full ${
                          isActive
                            ? 'h-10 w-10 bg-[var(--nav-active)] text-[var(--nav-on-active)]'
                            : 'text-[var(--nav-icon)]'
                        }`}
                      >
                        <Icon size={isActive ? 19 : 21} strokeWidth={1.9} aria-hidden="true" />
                      </motion.span>

                      <AnimatePresence initial={false}>
                        {isActive && (
                          <motion.span
                            key="label"
                            layout="position"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.08 } }}
                            transition={{ duration: 0.18, delay: 0.05 }}
                            className="whitespace-nowrap text-[13px] font-medium text-white"
                          >
                            {label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.span>
                  );
                }}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
