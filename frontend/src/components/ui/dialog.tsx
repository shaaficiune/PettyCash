import * as React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onOpenChange(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200 transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {children}
    </div>
  );
};

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }
>(({ className, children, onClose, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative z-50 w-full max-w-lg rounded-xl border border-border bg-card p-6 text-card-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto',
      className
    )}
    onClick={(e) => e.stopPropagation()}
    {...props}
  >
    {onClose && (
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-opacity hover:opacity-100 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    )}
    {children}
  </div>
));
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left mb-4', className)}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 mt-6', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-foreground', className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs sm:text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';
