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
    'bg-[#ECEFF5] text-[#73809C] dark:bg-[#18233D] dark:text-[#7584A6] border-transparent',
  PENDING_APPROVAL:
    'bg-[#FFF3C4] text-[#8A6100] dark:bg-[#2E2710] dark:text-[#F5C21B] border-transparent',
  ACCOUNTANT_REVIEW:
    'bg-[#E2EAF8] text-[#1F4FA3] dark:bg-[#15254A] dark:text-[#8DB2F5] border-transparent',
  CORRECTION_REQUIRED:
    'bg-[#FCE9D6] text-[#A3500B] dark:bg-[#36230F] dark:text-[#F0A15E] border-transparent',
  REJECTED:
    'bg-[#F9E1E1] text-[#B42323] dark:bg-[#3A1719] dark:text-[#F27D7D] border-transparent',
  APPROVED:
    'bg-[#DFF2E5] text-[#1F7A3E] dark:bg-[#13301F] dark:text-[#6BD08F] border-transparent',
  PAID:
    'bg-[#DFF2E5] text-[#1F7A3E] dark:bg-[#13301F] dark:text-[#6BD08F] border-transparent',
  COMPLETED:
    'bg-[#DFF2E5] text-[#1F7A3E] dark:bg-[#13301F] dark:text-[#6BD08F] border-transparent',
  PAYMENT_PROCESSING:
    'bg-[#E2EAF8] text-[#1F4FA3] dark:bg-[#15254A] dark:text-[#8DB2F5] border-transparent',
};

const SIZE_CLASSES: Record<StatusSize, string> = {
  sm: 'text-[10.5px] px-2 py-0.5 font-semibold rounded-full gap-1.5',
  md: 'text-xs px-2.5 py-0.5 font-semibold rounded-full gap-1.5 whitespace-nowrap',
  lg: 'text-xs px-3 py-1 font-bold rounded-full gap-2 whitespace-nowrap',
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
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
      {humanStatus(status)}
    </span>
  );
};

export default StatusBadge;
