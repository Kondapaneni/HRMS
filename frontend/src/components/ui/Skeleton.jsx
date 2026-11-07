

/**
 * Skeleton component with soft shimmer animation
 * Spec:
 *  - #EFEFF1 blocks with a soft shimmer
 *  - Matches real element radius
 */
export const Skeleton = ({
  className = '',
  variant = 'rounded', // 'rounded' (12px) | 'card' (24px) | 'pill' (full) | 'circle' (full) | 'text' (4px)
  width,
  height,
  style,
  ...props
}) => {
  const variantRadius = {
    rounded: 'rounded-[12px]',
    card: 'rounded-[24px]',
    pill: 'rounded-full',
    circle: 'rounded-full',
    square: 'rounded-[14px]',
    text: 'rounded-[6px]',
  };

  return (
    <div
      className={`relative overflow-hidden bg-[var(--line)] ${variantRadius[variant] || 'rounded-[12px]'} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    >
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent pointer-events-none"
        style={{
          animation: 'shimmer 1.8s infinite',
        }}
      />
    </div>
  );
};

export default Skeleton;

