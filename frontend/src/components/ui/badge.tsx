import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'gold'
    | 'success'
    | 'warning'
    | 'info';
  size?: 'default' | 'sm';
}

const badgeVariants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default:
    'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
  secondary:
    'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive:
    'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
  outline: 'text-foreground border-border',
  gold: 'border-transparent bg-gold/15 text-gold-700 dark:text-gold-400 border border-gold/30',
  success:
    'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
  warning:
    'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
  info:
    'border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30',
};

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none',
          size === 'sm' ? 'text-[10px] px-2 py-0.2' : 'text-xs',
          badgeVariants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
