import * as React from 'react';
import { cn } from '../../lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full font-semibold',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Avatar.displayName = 'Avatar';

export const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground select-none',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';
