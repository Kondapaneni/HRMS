import React from 'react';

/**
 * Timeline List component
 * Spec:
 *  - Dashed #3A3A40 connector on dark, #EFEFF1 on light
 *  - 44px avatar or icon tiles
 *  - Used for activities, audit logs, application status history
 */
export const Timeline = ({
  items = [], // { id, title, subtitle, time, icon: Icon, avatar, badge, isLast }
  className = '',
  darkSurface = false,
}) => {
  const lineClass = darkSurface
    ? 'border-[#3A3A40]'
    : 'border-[var(--line)]';

  return (
    <div className={`relative flex flex-col ${className}`}>
      {items.map((item, index) => {
        const isLast = item.isLast ?? index === items.length - 1;
        const Icon = item.icon;

        return (
          <div key={item.id || index} className="relative flex items-start gap-3.5 pb-6 last:pb-0">
            {/* Dashed vertical connector line */}
            {!isLast && (
              <div
                className={`absolute left-[21px] top-[44px] bottom-0 w-0 border-l border-dashed ${lineClass} z-0`}
              />
            )}

            {/* Icon or Avatar Tile (44px, radius 14px) */}
            <div className="relative z-10 shrink-0">
              {item.avatar ? (
                <div className="w-[44px] h-[44px] rounded-[14px] overflow-hidden bg-[var(--surface-alt)]">
                  <img src={item.avatar} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  className={`w-[44px] h-[44px] rounded-[14px] flex items-center justify-center shrink-0 ${
                    darkSurface
                      ? 'bg-[var(--ink-2)] text-[var(--brand)] border border-white/5'
                      : 'bg-[var(--brand-tint)] text-[var(--brand-deep)]'
                  }`}
                >
                  {Icon ? <Icon size={18} strokeWidth={1.7} /> : <span className="text-[12px] font-bold">•</span>}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-[13px] font-medium truncate ${
                    darkSurface ? 'text-[var(--sidebar-text)]' : 'text-[var(--text)]'
                  }`}
                >
                  {item.title}
                </p>
                {item.time && (
                  <span
                    className={`text-[11px] shrink-0 ${
                      darkSurface ? 'text-[var(--sidebar-muted)]' : 'text-[var(--muted)]'
                    }`}
                  >
                    {item.time}
                  </span>
                )}
              </div>
              {item.subtitle && (
                <p
                  className={`text-[12px] mt-0.5 leading-relaxed line-clamp-2 ${
                    darkSurface ? 'text-[var(--sidebar-muted)]' : 'text-[var(--muted)]'
                  }`}
                >
                  {item.subtitle}
                </p>
              )}
              {item.badge && <div className="mt-2">{item.badge}</div>}
              {item.extra && <div className="mt-2">{item.extra}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;

