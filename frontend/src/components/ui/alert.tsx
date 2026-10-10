import * as React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
}

const alertVariants: Record<NonNullable<AlertProps['variant']>, string> = {
  default: 'bg-background text-foreground border-border',
  destructive:
    'border-destructive/50 text-destructive bg-destructive/10 [&>svg]:text-destructive',
  success:
    'border-emerald-500/50 text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 [&>svg]:text-emerald-600',
  warning:
    'border-amber-500/50 text-amber-800 dark:text-amber-300 bg-amber-500/10 [&>svg]:text-amber-600',
  info:
    'border-sky-500/50 text-sky-800 dark:text-sky-300 bg-sky-500/10 [&>svg]:text-sky-600',
};

const defaultIcons: Record<NonNullable<AlertProps['variant']>, React.ElementType> = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-xl border p-4 text-sm flex items-start gap-3 [&>svg]:shrink-0 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:mt-0.5',
          alertVariants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('font-semibold leading-none tracking-tight mb-1 text-inherit', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-xs opacity-90 leading-relaxed text-inherit', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';
