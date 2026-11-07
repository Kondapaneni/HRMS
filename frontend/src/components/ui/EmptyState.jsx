
import Button from './Button';

/**
 * EmptyState Component
 * Spec:
 *  - Centered 12px --muted text
 *  - 40px #EAF0FA icon tile (radius 14px)
 *  - Title + copy explaining what to do next
 *  - Optional action button
 */
export const EmptyState = ({
  icon: Icon,
  title = 'No data found',
  description,
  actionLabel,
  onAction,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}>
      {Icon && (
        <div className="w-[40px] h-[40px] rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center mb-3 shrink-0">
          <Icon size={20} strokeWidth={1.7} />
        </div>
      )}
      <h5 className="text-[14px] font-medium text-[var(--text)] mb-1">{title}</h5>
      {description && (
        <p className="text-[12px] text-[var(--muted)] max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action || (actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ))}
    </div>
  );
};

export default EmptyState;

