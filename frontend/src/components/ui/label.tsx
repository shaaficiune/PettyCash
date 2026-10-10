import * as React from 'react';
import { cn } from '../../lib/utils';

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-xs font-semibold leading-none text-slate-700 dark:text-slate-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none inline-flex items-center gap-1',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-destructive font-bold">*</span>}
    </label>
  )
);
Label.displayName = 'Label';
