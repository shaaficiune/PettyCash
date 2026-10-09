import React from 'react';
import { humanStatus } from '../../utils/format';

/**
 * CashDesk Enterprise — Canonical Status Badge (UI-001)
 *
 * Single source of truth for all request status badges.
 * Replaces four separate badge implementations across DashboardPage,
 * RequestsListPage, RequestDetailPage, and ReportsPage.
 */

type StatusSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  status: string;
  size?: StatusSize;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  PENDING_APPROVAL:
    'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
  ACCOUNTANT_REVIEW:
    'bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40',
  CORRECTION_REQUIRED:
    'bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
  REJECTED:
    'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
  APPROVED:
    'bg-teal-50 text-teal-700 border-teal-200/60 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
  PAID:
    'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  COMPLETED:
    'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  PAYMENT_PROCESSING:
    'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
};

const SIZE_CLASSES: Record<StatusSize, string> = {
  sm: 'text-[10px] px-2 py-0.5 font-semibold rounded-full border',
  md: 'text-xs px-2.5 py-1 font-semibold rounded-full border whitespace-nowrap',
  lg: 'text-xs px-3 py-1 font-bold rounded-full border whitespace-nowrap',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <span
      className={`inline-flex items-center ${SIZE_CLASSES[size]} ${styles} ${className}`}
    >
      {humanStatus(status)}
    </span>
  );
};

export default StatusBadge;
