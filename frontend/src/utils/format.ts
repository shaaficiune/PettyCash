/**
 * CashDesk Enterprise — Shared Format Utilities
 * Centralised so every page formats financial data identically.
 */

/**
 * Format a monetary value to a consistent display string.
 * e.g.  formatCurrency(50, 'USD')  =>  'USD 50.00'
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency = 'USD',
): string {
  const n = Number(amount ?? 0);
  if (isNaN(n)) return `${currency} -`;
  return `${currency} ${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a date to a short, readable string.
 * e.g.  formatDate('2024-10-01T...')  =>  'Oct 1, 2024'
 */
export function formatDate(
  dateStr: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString(undefined, opts);
}

/**
 * Replace underscores with spaces and title-case the result.
 * e.g.  humanStatus('PENDING_APPROVAL')  =>  'Pending Approval'
 */
export function humanStatus(raw: string): string {
  return raw
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
