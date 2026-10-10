import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Printer, Receipt, Download } from 'lucide-react';
import { PaymentVoucherModal } from '../components/PaymentVoucherModal';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../utils/format';
import { DataTable, DataTableColumnHeader } from '../components/ui/data-table';
import {
  Button,
  Badge,
  Card,
  CardContent,
  Input,
  Label,
} from '../components/ui';

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
    document.body.appendChild(a);
    a.click();
    a.remove();
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
            className="rounded border-input text-primary focus:ring-ring h-4 w-4 cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(!!e.target.checked)}
            aria-label="Select row"
            className="rounded border-input text-primary focus:ring-ring h-4 w-4 cursor-pointer"
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
          return (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {p.request?.company?.name || '—'}
            </span>
          );
        },
      },
      {
        accessorKey: 'amountPaid',
        header: ({ column }) => (
          <div className="text-right">
            <DataTableColumnHeader column={column} title="Amount Paid" />
          </div>
        ),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="text-right font-bold text-foreground text-xs">
              {formatCurrency(p.amountPaid, p.request?.currency || 'USD')}
            </div>
          );
        },
      },
      {
        accessorKey: 'paymentMethod',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Method" />
        ),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <Badge variant="default" size="sm">
              {p.paymentMethod || 'EDAHAB'}
            </Badge>
          );
        },
      },
      {
        id: 'paidBy',
        accessorFn: (row) => row.paidBy?.fullName || row.paidBy?.username || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Paid By" />
        ),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <span className="text-foreground font-medium text-xs">
              {p.paidBy?.fullName || p.paidBy?.username || '—'}
            </span>
          );
        },
      },
      {
        accessorKey: 'paymentDate',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <span className="text-muted-foreground text-xs">
              {formatDate(p.paymentDate || p.createdAt)}
            </span>
          );
        },
      },
      {
        id: 'references',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Ref / Invoice / Txn" />
        ),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="text-xs">
              {p.referenceNumber && (
                <span className="font-mono text-foreground font-medium block">
                  Inv: {p.referenceNumber}
                </span>
              )}
              {p.transactionId && (
                <span className="font-mono text-[11px] text-muted-foreground block">
                  Txn: {p.transactionId}
                </span>
              )}
              {!p.referenceNumber && !p.transactionId && (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-center">Voucher</div>,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="text-center">
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  setSelectedPaymentForVoucher(p);
                  setIsVoucherOpen(true);
                }}
                className="gap-1"
                title="Print Payment Voucher"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-4 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Disbursement Records</h2>
          <p className="text-xs text-muted-foreground">Historical ledger of all petty cash payments made</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* FILTER BAR */}
      <Card className="shadow-xs">
        <CardContent className="p-3 flex flex-wrap gap-2.5 items-end">
          <div className="flex-1 min-w-[130px] space-y-1">
            <Label className="text-[11px]">From</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex-1 min-w-[130px] space-y-1">
            <Label className="text-[11px]">To</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex-1 min-w-[120px] space-y-1">
            <Label className="text-[11px]">Paid By (User ID)</Label>
            <Input
              placeholder="User ID"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => loadPayments()}
              className="h-8"
            >
              Apply
            </Button>
            {(fromDate || toDate || paidBy) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setPaidBy('');
                  setTimeout(() => loadPayments(), 0);
                }}
                className="h-8"
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
