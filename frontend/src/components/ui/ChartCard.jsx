import React from 'react';

/**
 * Chart Palette constants from Section 1.5:
 * Series in order: #8AADDB, #E3B9DF, #131315, #B9CDE8, #C98BC2, #5B86C2
 * Bar tracks: #EAF0FA (dark: #23262E)
 * Grid lines: #EFEFF1 (dark: #26262B)
 */
export const CHART_COLORS = [
  '#8AADDB', // 1: Brand pastel blue
  '#E3B9DF', // 2: Accent pastel pink
  '#131315', // 3: Ink
  '#B9CDE8', // 4: Soft light blue
  '#C98BC2', // 5: Muted purple/pink
  '#5B86C2', // 6: Deep blue
];

export const CHART_TRACK = 'var(--chart-track)';
export const CHART_GRID = 'var(--chart-grid)';
export const CHART_SELECTED = 'var(--chart-selected)';

/**
 * Custom dark tooltip pill for Recharts
 * Spec: Dark tooltip pill, radius 9px, 12px text
 */
export const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-[var(--ink)] text-white px-3 py-1.5 rounded-[9px] text-[12px] shadow-lg border border-white/10 pointer-events-none select-none">
      {label && <p className="font-medium mb-0.5 text-white/80">{label}</p>}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color || entry.fill }}
          />
          <span className="text-white/70">{entry.name}:</span>
          <span className="font-semibold text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * ChartCard wrapper
 * Spec:
 *  - White card, radius 24px, padding 18px
 *  - Title left (15px --muted), select/filter right
 */
export const ChartCard = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  height = 'h-72',
}) => {
  return (
    <div className={`bg-[var(--surface)] rounded-[24px] p-[18px] transition-colors flex flex-col justify-between ${className}`}>
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          {title && (
            <h4 className="text-[15px] font-medium text-[var(--muted)] truncate">
              {title}
            </h4>
          )}
          {subtitle && (
            <p className="text-[12px] text-[var(--muted)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Chart Canvas Area */}
      <div className={`w-full ${height} flex items-center justify-center`}>
        {children}
      </div>
    </div>
  );
};

export default ChartCard;

