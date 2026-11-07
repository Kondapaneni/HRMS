

/**
 * Normalizes status strings and maps to the 5 design system status pairs.
 * Status Tokens:
 *  - success: #1F9D55 on #E6F6EC (Dark: #4CC784 on #12301F)
 *  - warning: #B7791F on #FDF3DC (Dark: #E6B350 on #3A2D10)
 *  - danger:  #D64550 on #FDE8EA (Dark: #F0707A on #3A1519)
 *  - info:    #3B6FB6 on #E8F0FB (Dark: #8AADDB on #17263B)
 *  - neutral: #4A4A52 on #EFEFF1 (Dark: #9A9AA5 on #26262B)
 */
const STATUS_MAP = {
  // Success
  present: 'success',
  approved: 'success',
  paid: 'success',
  active: 'success',
  completed: 'success',
  verified: 'success',
  hired: 'success',
  selected: 'success',
  converted: 'success',
  passed: 'success',
  pass: 'success',
  live: 'success',
  easy: 'success',
  inside: 'success',

  // Warning
  pending: 'warning',
  'in review': 'warning',
  'in-review': 'warning',
  in_review: 'warning',
  late: 'warning',
  draft: 'warning',
  'follow-up': 'warning',
  'follow up': 'warning',
  follow_up: 'warning',
  contacted: 'warning',
  medium: 'warning',
  flagged: 'warning',
  half_day: 'warning',
  'half day': 'warning',

  // Danger
  rejected: 'danger',
  absent: 'danger',
  overdue: 'danger',
  failed: 'danger',
  fail: 'danger',
  terminated: 'danger',
  outside: 'danger',
  hard: 'danger',
  lost: 'danger',

  // Info
  new: 'info',
  'first visit': 'info',
  scheduled: 'info',
  'in progress': 'info',
  'in-progress': 'info',
  in_progress: 'info',
  processing: 'info',
  uploaded: 'info',
  shortlisted: 'info',
  interview: 'info',
  offer: 'info',

  // Neutral
  archived: 'neutral',
  inactive: 'neutral',
  cancelled: 'neutral',
  closed: 'neutral',
  login: 'neutral',
  exited: 'neutral',
};

const VARIANT_CLASSES = {
  success: 'text-[var(--success-text)] bg-[var(--success-bg)]',
  warning: 'text-[var(--warning-text)] bg-[var(--warning-bg)]',
  danger: 'text-[var(--danger-text)] bg-[var(--danger-bg)]',
  info: 'text-[var(--info-text)] bg-[var(--info-bg)]',
  neutral: 'text-[var(--neutral-text)] bg-[var(--neutral-bg)]',
};

const DOT_CLASSES = {
  success: 'bg-[var(--success-text)]',
  warning: 'bg-[var(--warning-text)]',
  danger: 'bg-[var(--danger-text)]',
  info: 'bg-[var(--info-text)]',
  neutral: 'bg-[var(--neutral-text)]',
};

export const StatusBadge = ({
  status,
  variant,
  children,
  dot = false,
  className = '',
  size = 'md',
}) => {
  const label = children || status;
  const normalizedKey = String(status || children || '').toLowerCase().trim();
  const resolvedVariant = variant || STATUS_MAP[normalizedKey] || 'neutral';
  const colorClass = VARIANT_CLASSES[resolvedVariant] || VARIANT_CLASSES.neutral;
  const dotClass = DOT_CLASSES[resolvedVariant] || DOT_CLASSES.neutral;

  const sizeClass = size === 'sm'
    ? 'text-[11px] px-2 py-0.5 rounded-[7px]'
    : 'text-[12px] px-2.5 py-[3px] rounded-[9px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium leading-none shrink-0 capitalize ${sizeClass} ${colorClass} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />}
      {label}
    </span>
  );
};

export default StatusBadge;

