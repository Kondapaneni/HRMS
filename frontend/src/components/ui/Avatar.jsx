import React, { useState } from 'react';

/**
 * Avatar component
 * Spec:
 *  - Radius 14px rounded squares (NEVER circles)
 *  - Initials fallback on #EAF0FA (or #1F1F23 in dark/sidebar)
 *  - Sizes: 32, 44, 64 (or custom via className)
 *  - Optional status dot
 */
export const Avatar = ({
  src,
  alt = '',
  name = '',
  size = 44,
  status, // 'online' | 'offline' | 'busy'
  className = '',
  darkSurface = false,
}) => {
  const [hasError, setHasError] = useState(false);

  // Compute initials
  const initials = React.useMemo(() => {
    if (!name && !alt) return '?';
    const parts = (name || alt).trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || '?').toUpperCase();
  }, [name, alt]);

  const sizeClasses = {
    32: 'w-8 h-8 rounded-[10px] text-[12px]',
    44: 'w-[44px] h-[44px] rounded-[14px] text-[14px]',
    64: 'w-[64px] h-[64px] rounded-[18px] text-[18px]',
  };

  const currentSizeClass = sizeClasses[size] || `w-[${size}px] h-[${size}px] rounded-[14px] text-[13px]`;

  const bgClass = darkSurface
    ? 'bg-[var(--ink-2)] text-[var(--brand)] border border-white/5'
    : 'bg-[var(--brand-tint)] text-[var(--brand-deep)]';

  return (
    <div className={`relative inline-flex shrink-0 select-none ${className}`}>
      <div
        className={`${currentSizeClass} ${bgClass} font-semibold flex items-center justify-center overflow-hidden transition-all`}
      >
        {src && !hasError ? (
          <img
            src={src}
            alt={alt || name}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-[var(--surface)] ${
            size === 32 ? 'w-2 h-2' : 'w-2.5 h-2.5'
          } ${
            status === 'online'
              ? 'bg-[var(--success-text)]'
              : status === 'busy'
              ? 'bg-[var(--danger-text)]'
              : 'bg-[var(--muted)]'
          }`}
        />
      )}
    </div>
  );
};

export default Avatar;

