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
 * Replace underscores with spaces and map to 2-Tier approval standard.
 * e.g.  humanStatus('PENDING_APPROVAL')   =>  'Stage 1: Awaiting Approval'
 *       humanStatus('ACCOUNTANT_REVIEW')  =>  'Stage 2: Awaiting Approval'
 */
export function humanStatus(raw: string): string {
  switch (raw) {
    case 'PENDING_APPROVAL':
      return 'Stage 1: Awaiting Approval';
    case 'ACCOUNTANT_REVIEW':
      return 'Stage 2: Awaiting Approval';
    case 'APPROVED':
      return 'Approved (Pending Payment)';
    case 'PAYMENT_PROCESSING':
      return 'Processing Payment';
    case 'PAID':
      return 'Paid';
    case 'COMPLETED':
      return 'Completed';
    case 'CORRECTION_REQUIRED':
      return 'Correction Required';
    case 'REJECTED':
      return 'Rejected';
    case 'DRAFT':
      return 'Draft';
    default:
      return (raw || '')
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
  }
}

/**
 * Auto-fit KPI number font class based on character length
 * Ensures large monetary values never overflow cards
 */
export function fitKpis(val: string | number | null | undefined): string {
  const str = String(val ?? '');
  if (str.length > 13) return 'text-lg sm:text-xl';
  if (str.length > 10) return 'text-xl sm:text-2xl';
  return 'text-2xl sm:text-[28px]';
}


// ────────────────────────────────────────────────────────────────────────────
// amountInWords — converts a numeric monetary value to English words.
// Used on Payment Voucher print templates so auditors can verify the amount.
// e.g.  amountInWords(1250.75)  =>  'One Thousand Two Hundred Fifty Dollars
//                                    and Seventy-Five Cents'
// ────────────────────────────────────────────────────────────────────────────
const _ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const _TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function _threeDigits(n: number): string {
  if (n === 0) return '';
  if (n < 20) return _ONES[n];
  if (n < 100) {
    const rem = n % 10;
    return _TENS[Math.floor(n / 10)] + (rem ? '-' + _ONES[rem] : '');
  }
  const rem = n % 100;
  return _ONES[Math.floor(n / 100)] + ' Hundred' + (rem ? ' ' + _threeDigits(rem) : '');
}

export function amountInWords(
  amount: number | string | null | undefined,
  currency = 'USD',
): string {
  const n = Math.round(Number(amount ?? 0) * 100) / 100; // round to 2dp
  if (isNaN(n) || n < 0) return 'Invalid Amount';

  const dollars = Math.floor(n);
  const cents = Math.round((n - dollars) * 100);

  const scales = ['', 'Thousand', 'Million', 'Billion'];
  const chunks: number[] = [];
  let tmp = dollars;
  if (tmp === 0) chunks.push(0);
  while (tmp > 0) { chunks.push(tmp % 1000); tmp = Math.floor(tmp / 1000); }

  const dollarWords = chunks
    .map((c, i) => (c === 0 ? '' : _threeDigits(c) + (scales[i] ? ' ' + scales[i] : '')))
    .reverse()
    .filter(Boolean)
    .join(' ');

  const centWord = cents === 0 ? 'Zero' : _threeDigits(cents);
  const currencyLabel = currency === 'USD' ? 'Dollars' : currency;
  return `${dollarWords || 'Zero'} ${currencyLabel} and ${centWord} Cents`;
}
