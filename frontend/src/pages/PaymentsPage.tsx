import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Printer, Receipt, Download } from 'lucide-react';
import { PaymentVoucherModal } from '../components/PaymentVoucherModal';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../utils/format';
import { DataTable, DataTableColumnHeader } from '../components/ui/data-table';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [paidBy, setPaidBy] = useState<string>('');
  const [selectedPaymentForVoucher, setSelectedPaymentForVoucher] = useState<any>(null);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const companyQuery = companyFilter !== 'ALL' ? `&companyId=${companyFilter}` : '';
      const dateQuery = (fromDate ? `&from=${fromDate}` : '') + (toDate ? `&to=${toDate}` : '');
      const paidByQuery = paidBy ? `&paidById=${paidBy}` : '';
      const res = await api.get(`/payments?page=1&pageSize=300${companyQuery}${dateQuery}${paidByQuery}`);
      setPayments(res.data.items || res.data || []);
    } catch (e) {
      console.error('Failed to load payments', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
    window.addEventListener('companyFilterChanged', loadPayments);
    return () => window.removeEventListener('companyFilterChanged', loadPayments);
  }, []);

  const exportCsv = () => {
    const headers = ['Request #', 'Company', 'Amount', 'Method', 'Paid By', 'Date', 'Ref / Txn'];
    const rows = payments.map((p) => [
      p.request?.requestNumber || '',
      p.request?.company?.name || '',
      p.amountPaid || 0,
      p.paymentMethod || '',
      p.paidBy?.fullName || p.paidBy?.username || '',
      p.paymentDate || '',
      p.referenceNumber || p.transactionId || '',
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
            aria-label="Select all"
            className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(!!e.target.checked)}
            aria-label="Select row"
            className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'requestNumber',
        id: 'requestNumber',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Request #" />
        ),
        accessorFn: (row) => row.request?.requestNumber || '',
        cell: ({ row }) => {
          const p = row.original;
          return (
            <Link
              to={`/requests/${p.request?.requestNumber || p.request?.id}`}
              className="font-semibold hover:underline text-primary"
            >
              {p.request?.requestNumber || '—'}
            </Link>
          );
        },
      },
      {
        id: 'company',
        accessorFn: (row) => row.request?.company?.name || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Company" />
        ),
        cell: ({ row }) => {
          const p = row.original;
          const isSomtel = p.request?.company?.name === 'Somtel';
          const isBluekom = p.request?.company?.name === 'Bluekom';
          return (
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded whitespace-nowrap ${
                isSomtel
                  ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20'
                  : isBluekom
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {p.request?.company?.name || '—'}
            </span>
          );
        },
      },
      {
        accessorKey: 'amountPaid',
        header: ({ column }) => (
          <div className="text-right">
            <DataTableColumnHeader column={column} title="Amount" />
          </div>
        ),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="text-right font-bold text-slate-800 dark:text-slate-100">
              {formatCurrency(p.amountPaid, p.currency || p.request?.currency)}
            </div>
          );
        },
      },
      {
        accessorKey: 'paymentMethod',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Method" />
        ),
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-400 text-xs">
            {row.original.paymentMethod || '—'}
          </span>
        ),
      },
      {
        id: 'paidBy',
        accessorFn: (row) => row.paidBy?.fullName || row.paidBy?.username || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Paid By" />
        ),
        cell: ({ row }) => (
          <span className="text-slate-600 dark:text-slate-400 text-xs">
            {row.original.paidBy?.fullName || row.original.paidBy?.username || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'paymentDate',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => (
          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
            {formatDate(row.original.paymentDate)}
          </span>
        ),
      },
      {
        id: 'referenceNumber',
        accessorFn: (row) => row.referenceNumber || row.transactionId || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Ref / Txn" />
        ),
        cell: ({ row }) => (
          <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
            {row.original.referenceNumber || row.original.transactionId || '—'}
          </span>
        ),
      },
      {
        id: 'voucher',
        header: () => <div className="text-center">Voucher</div>,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setSelectedPaymentForVoucher(p);
                  setIsVoucherOpen(true);
                }}
                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                title="Print Payment Voucher"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Payments</h2>
          <p className="text-xs text-slate-500">Disbursements and payment records</p>
        </div>

        <button
          onClick={exportCsv}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Date & User Filters */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-xs flex flex-wrap gap-2.5 items-end">
        <div className="flex-1 min-w-[130px]">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex-1 min-w-[130px]">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Paid By (User ID)</label>
          <input
            placeholder="User ID"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadPayments()}
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-all"
          >
            Apply
          </button>
          {(fromDate || toDate || paidBy) && (
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
                setPaidBy('');
                setTimeout(() => loadPayments(), 0);
              }}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* SHADCN/UI DATA TABLE */}
      <DataTable
        columns={columns}
        data={payments}
        isLoading={loading}
        searchPlaceholder="Filter payments by request #, method, paid by..."
        pageSize={20}
        pageSizeOptions={[10, 20, 50, 100]}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="No payments recorded"
            description="There are no payment records matching your filter."
          />
        }
      />

      {/* Payment Voucher Printable Modal */}
      <PaymentVoucherModal
        isOpen={isVoucherOpen}
        onClose={() => {
          setIsVoucherOpen(false);
          setSelectedPaymentForVoucher(null);
        }}
        request={selectedPaymentForVoucher?.request}
        payment={selectedPaymentForVoucher}
      />
    </div>
  );
};

export default PaymentsPage;
