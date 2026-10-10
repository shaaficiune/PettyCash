import * as React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'gold'
    | 'teal'
    | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'xs';
  isLoading?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'bg-primary text-primary-foreground shadow hover:bg-primary/90 focus-visible:ring-ring',
  destructive:
    'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive',
  outline:
    'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
  secondary:
    'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
  ghost:
    'hover:bg-accent hover:text-accent-foreground',
  link:
    'text-primary underline-offset-4 hover:underline shadow-none',
  gold:
    'bg-gold text-white shadow-sm hover:bg-gold-600 focus-visible:ring-gold font-medium',
  teal:
    'bg-teal-700 text-white shadow-sm hover:bg-teal-800 focus-visible:ring-teal-700',
  success:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-600',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-9 px-4 py-2 text-sm',
  sm: 'h-8 rounded-md px-3 text-xs',
  xs: 'h-7 rounded-md px-2.5 text-xs',
  lg: 'h-10 rounded-md px-6 text-base',
  icon: 'h-9 w-9 p-0',
  'icon-sm': 'h-7 w-7 p-0 rounded-md',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
