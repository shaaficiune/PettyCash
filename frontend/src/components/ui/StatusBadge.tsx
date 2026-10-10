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
    'bg-muted text-muted-foreground border-border',
  PENDING_APPROVAL:
    'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
  ACCOUNTANT_REVIEW:
    'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
  CORRECTION_REQUIRED:
    'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
  REJECTED:
    'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400 dark:border-rose-500/30',
  APPROVED:
    'bg-teal-500/10 text-teal-700 border-teal-500/20 dark:text-teal-400 dark:border-teal-500/30',
  PAID:
    'bg-teal-500/10 text-teal-700 border-teal-500/20 dark:text-teal-400 dark:border-teal-500/30',
  COMPLETED:
    'bg-teal-500/10 text-teal-700 border-teal-500/20 dark:text-teal-400 dark:border-teal-500/30',
  PAYMENT_PROCESSING:
    'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
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
