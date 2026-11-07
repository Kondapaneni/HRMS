import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle = ({ className = '' }) => {
  const { themePreference, effectiveTheme, setThemePreference } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const options = [
    {
      id: 'light',
      label: 'Light Mode',
      desc: 'Clean & bright appearance',
      icon: Sun,
      iconColor: 'text-[#E6B350]',
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'High-contrast dark palette',
      icon: Moon,
      iconColor: 'text-[var(--text)]',
    },
    {
      id: 'system',
      label: 'System Preference',
      desc: 'Follows device OS appearance',
      icon: Laptop,
      iconColor: 'text-[var(--brand-deep)]',
    },
  ];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Change theme appearance"
        title={`Theme: ${themePreference === 'system' ? 'System (' + effectiveTheme + ')' : themePreference}`}
        className="w-[40px] h-[40px] rounded-full bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)] shadow-none flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        {themePreference === 'system' ? (
          <Laptop size={18} strokeWidth={1.7} className="text-[var(--brand-deep)]" />
        ) : effectiveTheme === 'dark' ? (
          <Moon size={18} strokeWidth={1.7} className="text-[var(--text)]" />
        ) : (
          <Sun size={18} strokeWidth={1.7} className="text-[#E6B350]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] shadow-[0_12px_36px_rgba(0,0,0,0.12)] p-2 z-[9999]">
          <div className="px-3 py-1.5 border-b border-[var(--line)]/60 mb-1">
            <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
              APPEARANCE
            </span>
          </div>

          <div className="space-y-1">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = themePreference === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setThemePreference(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-[12px] text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--brand-tint)] text-[var(--text)] font-semibold'
                      : 'hover:bg-[var(--surface-alt)] text-[var(--text)] font-normal'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-[8px] bg-[var(--surface)] border border-[var(--line)]/60 ${opt.iconColor}`}>
                      <Icon size={14} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-xs">{opt.label}</p>
                      <p className="text-[10px] text-[var(--muted)] font-normal">{opt.desc}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <Check size={14} className="text-[var(--brand-deep)] shrink-0" strokeWidth={2.5} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
