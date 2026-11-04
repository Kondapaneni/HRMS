import React from 'react';

/**
 * StatCard component
 * - White/Surface card with radius 24px, padding 18px, no border, no shadow
 * - Title 15px / 500 / --muted
 * - Big KPI number 40px / 400 / -0.02em
 * - Optional delta pill (+13% success, -5% danger)
 * - Optional split bar (6px high, 3px gap, #8AADDB & #E3B9DF) with dot legend
 */
export const StatCard = ({
  title,
  value,
  subtitle,
  delta,
  deltaType, // 'positive' | 'negative' | 'neutral'
  splitBar, // { series1: { value: 60, label: 'Office', color: '#8AADDB' }, series2: { value: 40, label: 'Field', color: '#E3B9DF' } }
  icon: Icon,
  action,
  className = '',
  onClick,
}) => {
  const isPositive = deltaType === 'positive' || (typeof delta === 'string' && delta.trim().startsWith('+'));
  const isNegative = deltaType === 'negative' || (typeof delta === 'string' && delta.trim().startsWith('-'));

  const deltaBg = isPositive
    ? 'text-[var(--success-text)] bg-[var(--success-bg)]'
    : isNegative
    ? 'text-[var(--danger-text)] bg-[var(--danger-bg)]'
    : 'text-[var(--neutral-text)] bg-[var(--neutral-bg)]';

  const totalSplit = splitBar
    ? (Number(splitBar.series1?.value) || 0) + (Number(splitBar.series2?.value) || 0)
    : 0;
  const pct1 = totalSplit > 0 ? ((splitBar.series1.value / totalSplit) * 100).toFixed(1) : 50;
  const pct2 = totalSplit > 0 ? ((splitBar.series2.value / totalSplit) * 100).toFixed(1) : 50;

  return (
    <div
      onClick={onClick}
      className={`bg-[var(--surface)] rounded-[24px] p-[18px] flex flex-col justify-between transition-colors ${
        onClick ? 'cursor-pointer hover:bg-[var(--surface-alt)]' : ''
      } ${className}`}
    >
      {/* Top Header: Title & Action/Icon */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[15px] font-medium text-[var(--muted)] truncate">
          {title}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {delta && (
            <span className={`text-[12px] font-medium px-2 py-0.5 rounded-[9px] ${deltaBg}`}>
              {delta}
            </span>
          )}
          {action}
          {Icon && !action && (
            <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] flex items-center justify-center text-[var(--brand-deep)]">
              <Icon size={16} strokeWidth={1.7} />
            </div>
          )}
        </div>
      </div>

      {/* Main KPI Value */}
      <div className="my-1">
        <div className="text-[40px] font-normal tracking-[-0.02em] text-[var(--text)] leading-none truncate">
          {value ?? '—'}
        </div>
        {subtitle && (
          <p className="text-[12px] text-[var(--muted)] mt-1.5 truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* Optional Split Bar & Legend */}
      {splitBar && (
        <div className="mt-4 pt-3 border-t border-[var(--line)]">
          <div className="h-[6px] w-full flex items-center gap-[3px] rounded-full overflow-hidden bg-[var(--line)]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${pct1}%`,
                backgroundColor: splitBar.series1?.color || 'var(--brand)',
              }}
            />
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${pct2}%`,
                backgroundColor: splitBar.series2?.color || 'var(--accent-pink)',
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-[var(--muted)]">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="w-[7px] h-[7px] rounded-full shrink-0"
                style={{ backgroundColor: splitBar.series1?.color || 'var(--brand)' }}
              />
              <span className="truncate">{splitBar.series1?.label}</span>
              {splitBar.series1?.value !== undefined && (
                <span className="text-[var(--text)] font-medium">({splitBar.series1.value})</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="w-[7px] h-[7px] rounded-full shrink-0"
                style={{ backgroundColor: splitBar.series2?.color || 'var(--accent-pink)' }}
              />
              <span className="truncate">{splitBar.series2?.label}</span>
              {splitBar.series2?.value !== undefined && (
                <span className="text-[var(--text)] font-medium">({splitBar.series2.value})</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatCard;

