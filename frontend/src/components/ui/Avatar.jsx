import React, { useState } from 'react';

/**
 * Avatar component
 * Spec:
 *  - Radius 14px rounded squares (NEVER circles unless shape="circle")
 *  - Initials fallback on #EAF0FA (or #1F1F23 in dark/sidebar)
 *  - Supports numeric sizes (20, 24, 28, 32, 36, 38, 40, 42, 44, 48, 64, 80) and named sizes ('xs', 'sm', 'md', 'lg', 'xl')
 *  - Explicit inline pixel constraints to GUARANTEE images never overflow
 *  - Optional status dot
 */
export const Avatar = ({
  src,
  alt = '',
  name = '',
  size = 44,
  shape = 'square',
  radius,
  status, // 'online' | 'offline' | 'busy'
  className = '',
  darkSurface = false,
  style = {},
  ...rest
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

  // Normalize numeric pixel size
  const pxSize = React.useMemo(() => {
    if (typeof size === 'number') return size;
    const namedMap = {
      xs: 24,
      sm: 32,
      md: 40,
      lg: 48,
      xl: 64,
    };
    if (typeof size === 'string' && namedMap[size.toLowerCase()]) {
      return namedMap[size.toLowerCase()];
    }
    const parsed = parseInt(size, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 44;
  }, [size]);

  // Compute border radius
  const borderRadius = React.useMemo(() => {
    if (shape === 'circle') return '9999px';
    if (radius !== undefined && radius !== null) {
      return typeof radius === 'number' ? `${radius}px` : radius;
    }
    if (pxSize <= 24) return '6px';
    if (pxSize <= 32) return '10px';
    if (pxSize <= 48) return '14px';
    return '18px';
  }, [shape, radius, pxSize]);

  // Compute font size for initials
  const fontSize = React.useMemo(() => {
    if (pxSize <= 20) return 9;
    if (pxSize <= 24) return 10;
    if (pxSize <= 28) return 11;
    if (pxSize <= 32) return 12;
    if (pxSize <= 44) return 13;
    if (pxSize <= 48) return 14;
    if (pxSize <= 64) return 16;
    return Math.round(pxSize * 0.32);
  }, [pxSize]);

  const bgClass = darkSurface
    ? 'bg-[var(--ink-2)] text-[var(--brand)] border border-white/5'
    : 'bg-[var(--brand-tint)] text-[var(--brand-deep)]';

  const containerDimensionStyle = {
    width: `${pxSize}px`,
    height: `${pxSize}px`,
    minWidth: `${pxSize}px`,
    minHeight: `${pxSize}px`,
    maxWidth: `${pxSize}px`,
    maxHeight: `${pxSize}px`,
    ...style,
  };

  return (
    <div
      className={`relative inline-flex shrink-0 select-none ${className}`}
      style={containerDimensionStyle}
      {...rest}
    >
      <div
        className={`w-full h-full ${bgClass} font-semibold flex items-center justify-center overflow-hidden shrink-0 transition-all`}
        style={{
          borderRadius,
          fontSize: `${fontSize}px`,
        }}
      >
        {src && !hasError ? (
          <img
            src={src}
            alt={alt || name}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover block shrink-0"
            style={{
              width: `${pxSize}px`,
              height: `${pxSize}px`,
              maxWidth: '100%',
              maxHeight: '100%',
              borderRadius,
            }}
          />
        ) : (
          <span className="leading-none select-none">{initials}</span>
        )}
      </div>

      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-[var(--surface)] ${
            pxSize <= 32 ? 'w-2 h-2' : 'w-2.5 h-2.5'
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
