import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * ThemeToggle Component
 * Spec:
 *  - 40px circular button on --surface
 *  - Toggles between light and dark
 *  - Sets data-theme="light" | "dark" on <html>
 *  - Persists preference in localStorage
 */
export const ThemeToggle = ({ className = '' }) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-[40px] h-[40px] rounded-full bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)] shadow-none flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${className}`}
    >
      {isDark ? (
        <Sun size={18} strokeWidth={1.7} className="text-[#E6B350]" />
      ) : (
        <Moon size={18} strokeWidth={1.7} className="text-[var(--text)]" />
      )}
    </button>
  );
};

export default ThemeToggle;

