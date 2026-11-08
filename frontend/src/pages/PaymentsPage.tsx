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
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('ALL');
  const [selectedPaymentForVoucher, setSelectedPaymentForVoucher] = useState<any>(null);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);

  const loadPayments = async (customFrom?: string, customTo?: string, customPaidBy?: string) => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const companyQuery = companyFilter !== 'ALL' ? `&companyId=${companyFilter}` : '';
      const fDate = customFrom !== undefined ? customFrom : fromDate;
      const tDate = customTo !== undefined ? customTo : toDate;
      const pBy = customPaidBy !== undefined ? customPaidBy : paidBy;

      const dateQuery = (fDate ? `&from=${fDate}&startDate=${fDate}` : '') + (tDate ? `&to=${tDate}&endDate=${tDate}` : '');
      const paidByQuery = pBy ? `&paidById=${encodeURIComponent(pBy)}` : '';
      const res = await api.get(`/payments?page=1&pageSize=500${companyQuery}${dateQuery}${paidByQuery}`);
      setPayments(res.data.items || res.data || []);
    } catch (e) {
      console.error('Failed to load payments', e);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: 'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH') => {
    setDatePreset(preset);
    const now = new Date();
    const formatYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let f = '';
    let t = '';
    if (preset === 'TODAY') {
      f = formatYMD(now);
      t = formatYMD(now);
    } else if (preset === 'THIS_MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      f = formatYMD(first);
      t = formatYMD(now);
    } else if (preset === 'LAST_MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      f = formatYMD(first);
      t = formatYMD(last);
    } else if (preset === 'ALL') {
      f = '';
      t = '';
    }
    setFromDate(f);
    setToDate(t);
    loadPayments(f, t);
  };

  const handleReset = () => {
    setDatePreset('ALL');
    setFromDate('');
    setToDate('');
    setPaidBy('');
    loadPayments('', '', '');
  };

  useEffect(() => {
    loadPayments();
    const onCompanyChange = () => loadPayments();
    window.addEventListener('companyFilterChanged', onCompanyChange);
    return () => window.removeEventListener('companyFilterChanged', onCompanyChange);
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
        accessorKey: 'voucherNumber',
        id: 'voucherNumber',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Voucher #" />
        ),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <span className="font-mono font-bold text-xs text-foreground">
              {p.voucherNumber || '—'}
            </span>
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
          const cName = p.request?.company?.name || '—';
          const lower = cName.toLowerCase();
          const cls = lower.includes('somtel') ? 'co-badge-somtel' :
                      lower.includes('bluekom') ? 'co-badge-bluekom' :
                      'text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground';
          return <span className={cls}>{cName}</span>;
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
          <h2 className="text-lg font-bold text-foreground font-display">Payment Vouchers</h2>
          <p className="text-xs text-muted-foreground">Historical record of all petty cash payment vouchers issued</p>
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

      {/* FILTER BAR WITH PRESETS & CUSTOM DATES */}
      <Card className="shadow-xs">
        <CardContent className="p-3 space-y-3">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-border/50">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Period:</span>
            {(['ALL', 'TODAY', 'THIS_MONTH', 'LAST_MONTH'] as const).map((preset) => {
              const labels = {
                ALL: 'All Time',
                TODAY: 'Today',
                THIS_MONTH: 'This Month',
                LAST_MONTH: 'Last Month',
              };
              const active = datePreset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {labels[preset]}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2.5 items-end">
            <div className="flex-1 min-w-[130px] space-y-1">
              <Label className="text-[11px]">From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex-1 min-w-[130px] space-y-1">
              <Label className="text-[11px]">To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex-1 min-w-[140px] space-y-1">
              <Label className="text-[11px]">Paid By (Name or ID)</Label>
              <Input
                placeholder="Name or ID"
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
              {(fromDate || toDate || paidBy || datePreset !== 'ALL') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-8"
                >
                  Reset
                </Button>
              )}
            </div>
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
