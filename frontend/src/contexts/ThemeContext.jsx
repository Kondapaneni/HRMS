import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const ThemeContext = createContext({
  themePreference: 'system',
  effectiveTheme: 'light',
  setThemePreference: () => {},
});

export const ThemeProvider = ({ children }) => {
  const { profile } = useAuth();

  // Helper to determine system scheme
  const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Initial preference from localStorage or default 'system'
  const [themePreference, setThemePreferenceState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('themePreference');
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        return saved;
      }
      // Check legacy theme key
      const legacy = localStorage.getItem('theme');
      if (legacy && ['light', 'dark'].includes(legacy)) {
        return legacy;
      }
    }
    return 'system';
  });

  const [userOverride, setUserOverride] = useState(null);
  const currentUserId = profile?.id ?? null;
  const profileThemePreference = ['light', 'dark', 'system'].includes(profile?.themePreference) ? profile.themePreference : null;
  const resolvedThemePreference = userOverride?.userId === currentUserId
    ? userOverride.preference
    : (profileThemePreference || themePreference);

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // Listen to OS system color-scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Compute effective theme
  const effectiveTheme = resolvedThemePreference === 'system' ? systemTheme : resolvedThemePreference;

  // Apply effective theme to HTML root element
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', effectiveTheme);
    root.setAttribute('data-theme-preference', resolvedThemePreference);
    localStorage.setItem('theme', effectiveTheme);
    localStorage.setItem('themePreference', resolvedThemePreference);
  }, [effectiveTheme, resolvedThemePreference]);

  // Handler to update theme preference (and persist to DB)
  const setThemePreference = useCallback(async (newPref) => {
    if (!['light', 'dark', 'system'].includes(newPref)) return;
    
    setThemePreferenceState(newPref);
    setUserOverride({ userId: currentUserId, preference: newPref });
    localStorage.setItem('themePreference', newPref);

    const token = localStorage.getItem('token');
    if (token) {
      try {
        await api.put('/user/theme', { theme: newPref });
      } catch (err) {
        console.error('Failed to sync theme preference to database:', err);
      }
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ themePreference: resolvedThemePreference, effectiveTheme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- Context hook is intentionally exported with its provider.
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
