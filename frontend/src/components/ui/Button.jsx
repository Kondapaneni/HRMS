import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button component
 * Variants:
 *  - primary: #131315 background, white text (dark: #F4F4F6 on #131315)
 *  - secondary: white/surface with 1px line border
 *  - accent: #8AADDB with #131315 text
 *  - danger: #FDE8EA with #D64550 text (dark: #3A1519 / #F0707A)
 *  - ghost: transparent with surface-alt hover
 *  - outline: transparent with 1px line border
 *
 * Radius: 12px, Height: 40px default (36px for sm/dense, 44px for lg/mobile)
 */
export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2';

  const sizeClasses = {
    sm: 'h-[36px] px-3 text-[13px] rounded-[10px] gap-1.5',
    md: 'h-[40px] px-4 text-[14px] rounded-[12px] gap-2',
    lg: 'h-[44px] px-5 text-[15px] rounded-[14px] gap-2.5',
    icon: 'w-[40px] h-[40px] p-0 rounded-[12px]',
    'icon-sm': 'w-[36px] h-[36px] p-0 rounded-[10px]',
    'icon-circle': 'w-[40px] h-[40px] p-0 rounded-full',
  };

  const variantClasses = {
    primary:
      'bg-[var(--ink)] text-white hover:opacity-90 active:scale-[0.99] dark:bg-[var(--text)] dark:text-[var(--ink)]',
    secondary:
      'bg-[var(--surface)] text-[var(--text)] border border-[var(--line)] hover:bg-[var(--surface-alt)] active:scale-[0.99]',
    accent:
      'bg-[var(--brand)] text-[var(--ink)] hover:brightness-95 active:scale-[0.99]',
    danger:
      'bg-[var(--danger-bg)] text-[var(--danger-text)] hover:brightness-95 active:scale-[0.99]',
    ghost:
      'bg-transparent text-[var(--text)] hover:bg-[var(--surface-alt)] active:scale-[0.99]',
    outline:
      'bg-transparent text-[var(--text)] border border-[var(--line)] hover:bg-[var(--surface-alt)] active:scale-[0.99]',
    link:
      'bg-transparent text-[var(--brand-deep)] hover:underline p-0 h-auto',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${variantClasses[variant] || variantClasses.primary} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : React.isValidElement(LeftIcon) ? (
        LeftIcon
      ) : LeftIcon ? (
        <LeftIcon className="w-4 h-4 shrink-0" strokeWidth={1.7} />
      ) : null}
      {children}
      {!isLoading && (React.isValidElement(RightIcon) ? (
        RightIcon
      ) : RightIcon ? (
        <RightIcon className="w-4 h-4 shrink-0" strokeWidth={1.7} />
      ) : null)}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;

