import React from 'react';
import { FileText } from 'lucide-react';

/**
 * CashDesk Enterprise — Canonical Empty State (UI-015)
 *
 * Standardised empty table / list state across all pages.
 * Replaces inconsistent one-liners (plain text, no icon) in
 * SettlementsPendingPage, PaymentsPage, and others.
 */

interface EmptyStateProps {
  icon?: React.ElementType;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FileText,
  title = 'No records found',
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-14 px-6 text-center ${className}`}
    >
      <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
