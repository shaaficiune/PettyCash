import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { ColumnDef } from '@tanstack/react-table';
import {
  DollarSign,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Eye,
  Calendar,
  MapPin,
  Filter,
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../utils/format';
import { DataTable, DataTableColumnHeader } from '../components/ui/data-table';
import {
  Button,
  Badge,
  Card,
  CardContent,
  Select,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui';

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingBook, setExportingBook] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'THIS_MONTH' | 'THIS_WEEK' | 'TODAY' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch Regions for dropdown grouped by company
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
        const params: any = {};
        if (companyFilter !== 'ALL') params.companyId = companyFilter;
        const res = await api.get('/companies/regions', { params });
        setRegions(res.data || []);
      } catch (err) {
        console.error('Failed to load regions', err);
      }
    };
    fetchRegions();
    window.addEventListener('companyFilterChanged', fetchRegions);
    return () => window.removeEventListener('companyFilterChanged', fetchRegions);
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const params: any = { page: 1, pageSize: 500 };
      if (companyFilter !== 'ALL') params.companyId = companyFilter;
      if (typeFilter) params.transactionType = typeFilter;
      if (regionFilter) params.regionId = regionFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/funds/transactions', { params });
      if (res.data && res.data.items) {
        setTransactions(res.data.items);
      } else {
        setTransactions(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load transaction ledger log', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    window.addEventListener('companyFilterChanged', loadTransactions);
    return () => {
      window.removeEventListener('companyFilterChanged', loadTransactions);
    };
  }, [typeFilter, regionFilter, startDate, endDate]);

  const applyDatePreset = (preset: 'ALL' | 'THIS_MONTH' | 'THIS_WEEK' | 'TODAY' | 'CUSTOM') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'TODAY') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      setStartDate(monday.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const params: any = {};
      if (companyFilter !== 'ALL') params.companyId = companyFilter;
      if (typeFilter) params.transactionType = typeFilter;
      if (regionFilter) params.regionId = regionFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/funds/transactions/export-excel', { params, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export transactions to Excel', err);
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
    const params = new URLSearchParams();
    if (companyFilter !== 'ALL') params.append('companyId', companyFilter);
    if (typeFilter) params.append('transactionType', typeFilter);
    if (regionFilter) params.append('regionId', regionFilter);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) {
      alert('Please allow popups to view and print the PDF report.');
      setExportingPdf(false);
      return;
    }

    try {
      const res = await api.get(`/funds/transactions/export-pdf?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      printWindow.location.href = url;
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      printWindow.close();
      console.error('Failed to export transactions to PDF', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportMonthlyBook = async () => {
    setExportingBook(true);
    try {
      let month = new Date().getMonth() + 1;
      let year = new Date().getFullYear();
      if (startDate) {
        const d = new Date(startDate);
        month = d.getMonth() + 1;
        year = d.getFullYear();
      }
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const params: Record<string, string> = { month: String(month), year: String(year) };
      if (companyFilter !== 'ALL') params.companyId = companyFilter;
      const res = await api.get('/funds/export/monthly-book', { params, responseType: 'blob' });
      const contentDisposition = res.headers['content-disposition'] || '';
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const filename = match ? match[1] : `Petty_Cash_Book_${monthNames[month - 1]}_${year}.xlsx`;
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export monthly book', err);
    } finally {
      setExportingBook(false);
    }
  };

  // Define Columns for TanStack Table
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      // ── Checkbox ──────────────────────────────────
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

      // ── Date ──────────────────────────────────────
      {
        accessorKey: 'createdAt',
        meta: { title: 'Date' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => {
          const t = row.original;
          const d = new Date(t.createdAt);
          return (
            <div className="min-w-[80px]">
              <p className="font-semibold text-foreground text-xs leading-none whitespace-nowrap">
                {formatDate(t.createdAt)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          );
        },
      },

      // ── Company ───────────────────────────────────
      {
        id: 'company',
        meta: { title: 'Company' },
        accessorFn: (row) => row.company?.name || row.request?.company?.name || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Company" />
        ),
        cell: ({ row }) => {
          const cName = row.original.company?.name || row.original.request?.company?.name || '—';
          return (
            <Badge
              variant={cName === 'Somtel' ? 'warning' : cName === 'Bluekom' ? 'info' : 'secondary'}
              size="sm"
              className="whitespace-nowrap"
            >
              {cName}
            </Badge>
          );
        },
      },

      // ── Req # ─────────────────────────────────────
      {
        id: 'reqNumber',
        meta: { title: 'Req #' },
        accessorFn: (row) => row.request?.requestNumber || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Req #" />
        ),
        cell: ({ row }) => {
          const reqNum = row.original.request?.requestNumber;
          return (
            <div className="min-w-[80px]">
              {reqNum ? (
                <span className="font-bold text-primary text-xs whitespace-nowrap">
                  #{reqNum}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
          );
        },
      },

      // ── Invoice Number ────────────────────────────
      {
        id: 'invoiceNumber',
        meta: { title: 'Invoice #' },
        accessorFn: (row) =>
          row.referenceNumber || row.request?.invoiceNumber || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Invoice #" />
        ),
        cell: ({ row }) => {
          const t = row.original;
          const invoice = t.referenceNumber || t.request?.invoiceNumber;
          return (
            <div className="min-w-[90px]">
              {invoice ? (
                <span className="font-mono font-bold text-xs text-foreground whitespace-nowrap">
                  {invoice}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
          );
        },
      },

      // ── Employee (Requester) ──────────────────────
      {
        id: 'employee',
        meta: { title: 'Employee' },
        accessorFn: (row) => row.request?.user?.fullName || row.employee?.fullName || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employee" />
        ),
        cell: ({ row }) => {
          const t = row.original;
          // Priority to the employee who made the request, not the admin/payer
          const emp = t.request?.user?.fullName || t.employee?.fullName;
          return (
            <div className="min-w-[110px] max-w-[150px]">
              <p className="font-medium text-foreground text-xs truncate">
                {emp || '—'}
              </p>
            </div>
          );
        },
      },

      // ── Recipient Name ────────────────────────────
      {
        id: 'recipientName',
        meta: { title: 'Recipient Name' },
        accessorFn: (row) => row.request?.receiverName || row.request?.vendorName || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Recipient Name" />
        ),
        cell: ({ row }) => {
          const t = row.original;
          const rec = t.request?.receiverName || t.request?.vendorName;
          return (
            <div className="min-w-[110px] max-w-[150px]">
              <p className="text-xs text-foreground truncate font-medium">
                {rec || <span className="text-muted-foreground">—</span>}
              </p>
            </div>
          );
        },
      },

      // ── Recipient Tel / Account ───────────────────
      {
        id: 'recipientContact',
        meta: { title: 'Tel / Account' },
        accessorFn: (row) => row.request?.receiverPhone || row.request?.receiverAccount || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tel / Account" />
        ),
        cell: ({ row }) => {
          const t = row.original;
          const phone = t.request?.receiverPhone;
          const account = t.request?.receiverAccount;
          const contact = phone || account;
          return (
            <div className="min-w-[100px]">
              {contact ? (
                <span className="font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {contact}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
          );
        },
      },

      // ── Region ────────────────────────────────────
      {
        id: 'region',
        meta: { title: 'Region' },
        accessorFn: (row) => row.request?.region?.name || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Region" />
        ),
        cell: ({ row }) => {
          const region = row.original.request?.region?.name;
          return (
            <div className="min-w-[80px] max-w-[120px]">
              {region ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap truncate">
                  {region}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
          );
        },
      },

      // ── Category (Budget Head) ────────────────────
      {
        id: 'category',
        meta: { title: 'Category' },
        accessorFn: (row) => row.request?.budgetHead?.name || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Category" />
        ),
        cell: ({ row }) => {
          const bh = row.original.request?.budgetHead;
          return (
            <div className="min-w-[90px] max-w-[140px]">
              {bh?.name ? (
                <span className="text-xs text-foreground truncate font-medium">
                  {bh.name}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
          );
        },
      },

      // ── Type ──────────────────────────────────────
      {
        accessorKey: 'transactionType',
        meta: { title: 'Type' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => {
          const type = row.original.transactionType;
          return (
            <Badge
              variant={
                type === 'EXPENSE'
                  ? 'destructive'
                  : type === 'ALLOCATION'
                  ? 'success'
                  : type === 'REFUND'
                  ? 'warning'
                  : 'secondary'
              }
              size="sm"
              className="whitespace-nowrap"
            >
              {type}
            </Badge>
          );
        },
      },

      // ── Debit (-) ─────────────────────────────────
      {
        accessorKey: 'debit',
        meta: { title: 'Debit' },
        header: ({ column }) => (
          <div className="text-right">
            <DataTableColumnHeader column={column} title="Debit (−)" />
          </div>
        ),
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="text-right font-bold text-destructive text-xs whitespace-nowrap min-w-[80px]">
              {t.debit && Number(t.debit) > 0
                ? `−${formatCurrency(t.debit, t.currency || t.company?.currency || 'USD')}`
                : <span className="text-muted-foreground font-normal">—</span>}
            </div>
          );
        },
      },

      // ── Credit (+) ────────────────────────────────
      {
        accessorKey: 'credit',
        meta: { title: 'Credit' },
        header: ({ column }) => (
          <div className="text-right">
            <DataTableColumnHeader column={column} title="Credit (+)" />
          </div>
        ),
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs whitespace-nowrap min-w-[80px]">
              {t.credit && Number(t.credit) > 0
                ? `+${formatCurrency(t.credit, t.currency || t.company?.currency || 'USD')}`
                : <span className="text-muted-foreground font-normal">—</span>}
            </div>
          );
        },
      },

      // ── Balance ───────────────────────────────────
      {
        accessorKey: 'balanceAfter',
        meta: { title: 'Balance' },
        header: ({ column }) => (
          <div className="text-right">
            <DataTableColumnHeader column={column} title="Balance" />
          </div>
        ),
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="text-right font-bold text-foreground text-xs whitespace-nowrap min-w-[80px]">
              {formatCurrency(t.balanceAfter || 0, t.currency || t.company?.currency || 'USD')}
            </div>
          );
        },
      },

      // ── Action ────────────────────────────────────
      {
        id: 'actions',
        header: () => <div className="text-center">Action</div>,
        enableHiding: false,
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="text-center">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelectedTx(t)}
                title="View Details"
              >
                <Eye className="h-3.5 w-3.5" />
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
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Transactions Ledger
          </h2>
          <p className="text-xs text-muted-foreground">
            Chronological log of petty cash allocations, disbursements, payments, and financial movements
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMonthlyBook}
            disabled={exportingBook}
            className="gap-1.5 text-teal-700 dark:text-teal-400 border-border hover:bg-teal-50 dark:hover:bg-teal-950/30"
            title="Export Monthly Petty Cash Book (.xlsx)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            {exportingBook ? 'Generating...' : 'Monthly Book (.xlsx)'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="gap-1.5 text-emerald-700 dark:text-emerald-400 border-border hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            {exportingExcel ? 'Exporting...' : 'Export Excel'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="gap-1.5 text-rose-700 dark:text-rose-400 border-border hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Printer className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            {exportingPdf ? 'Preparing...' : 'Export PDF'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadTransactions}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* FILTER HUB */}
      <Card className="shadow-xs">
        <CardContent className="p-3 space-y-2.5">
          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            {/* DATE PRESET SELECT */}
            <div className="flex items-center gap-1.5 min-w-[130px] flex-1 sm:flex-initial">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select
                value={datePreset}
                onChange={(e) => applyDatePreset(e.target.value as any)}
                className="font-medium text-xs h-8"
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="CUSTOM">Custom Range...</option>
              </Select>
            </div>

            {/* REGION FILTER - GROUPED BY COMPANY */}
            <div className="flex items-center gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="text-xs h-8"
              >
                <option value="">All Regions</option>
                {(() => {
                  const groups: { [key: string]: any[] } = {};
                  regions.forEach((r) => {
                    const cName = r.company?.name || 'Other';
                    if (!groups[cName]) groups[cName] = [];
                    groups[cName].push(r);
                  });
                  const compKeys = Object.keys(groups);
                  if (compKeys.length <= 1) {
                    return regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ));
                  }
                  return compKeys.map((cName) => (
                    <optgroup key={cName} label={`── ${cName} ──`}>
                      {groups[cName].map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </optgroup>
                  ));
                })()}
              </Select>
            </div>

            {/* MOVEMENT TYPE FILTER */}
            <div className="flex items-center gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs h-8"
              >
                <option value="">All Movement Types</option>
                <option value="ALLOCATION">ALLOCATION (Credit)</option>
                <option value="EXPENSE">EXPENSE (Debit)</option>
                <option value="REFUND">REFUND (Credit)</option>
              </Select>
            </div>
          </div>

          {/* CUSTOM RANGE PICKER / BAR */}
          {datePreset === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Custom Range:
              </span>
              <span className="text-[11px] text-muted-foreground">From:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="h-7 w-auto px-2 py-0 text-xs"
              />
              <span className="text-[11px] text-muted-foreground">To:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="h-7 w-auto px-2 py-0 text-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* DATA TABLE */}
      <DataTable
        columns={columns}
        data={transactions}
        isLoading={loading}
        searchPlaceholder="Filter transactions by ref, name, description..."
        pageSize={20}
        pageSizeOptions={[10, 20, 50, 100]}
        emptyState={
          <EmptyState
            icon={DollarSign}
            title="No transactions found"
            description="No ledger movements matching the selected criteria."
          />
        }
      />

      {/* TRANSACTION DETAILS DIALOG */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        {selectedTx && (
          <DialogContent onClose={() => setSelectedTx(null)} className="sm:max-w-md p-0 overflow-hidden">
            <DialogHeader className="p-5 pb-3 border-b border-border">
              <DialogTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Transaction Detail
              </DialogTitle>
              <DialogDescription className="text-xs">
                Ref: {selectedTx.referenceNumber || selectedTx.id} · {formatDate(selectedTx.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 space-y-3.5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-muted/40 rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Type</span>
                  <Badge
                    variant={
                      selectedTx.transactionType === 'EXPENSE'
                        ? 'destructive'
                        : selectedTx.transactionType === 'ALLOCATION'
                        ? 'success'
                        : 'warning'
                    }
                    size="sm"
                    className="mt-1"
                  >
                    {selectedTx.transactionType}
                  </Badge>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Request #</span>
                  <span className="font-bold text-primary block mt-1">
                    {selectedTx.request?.requestNumber ? `#${selectedTx.request.requestNumber}` : '—'}
                  </span>
                </div>
              </div>

              {(selectedTx.referenceNumber || selectedTx.request?.invoiceNumber) && (
                <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Invoice #</span>
                  <span className="font-bold font-mono text-foreground">
                    {selectedTx.referenceNumber || selectedTx.request?.invoiceNumber}
                  </span>
                </div>
              )}

              <div className="p-3 bg-muted/40 rounded-xl space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Employee (Requester)</span>
                  <span className="font-medium text-foreground">
                    {selectedTx.request?.user?.fullName || selectedTx.employee?.fullName || '—'}
                  </span>
                </div>
                {selectedTx.employee?.fullName && selectedTx.request?.user?.fullName && selectedTx.employee.fullName !== selectedTx.request.user.fullName && (
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Processed / Paid By</span>
                    <span className="font-medium text-foreground">
                      {selectedTx.employee.fullName}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Recipient / Merchant</span>
                  <span className="font-medium text-foreground">
                    {selectedTx.request?.receiverName || selectedTx.request?.vendorName || '—'}
                    {selectedTx.request?.receiverPhone && ` (${selectedTx.request.receiverPhone})`}
                  </span>
                </div>
                {selectedTx.request?.region?.name && (
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Region</span>
                    <span className="font-medium text-foreground">
                      {selectedTx.request.region.name}
                    </span>
                  </div>
                )}
                {selectedTx.request?.budgetHead?.name && (
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Category / Budget Head</span>
                    <span className="font-medium text-foreground">
                      {selectedTx.request.budgetHead.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-muted/40 rounded-xl text-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Description / Purpose</span>
                <p className="font-medium text-foreground mt-1 leading-relaxed">
                  {selectedTx.description || selectedTx.request?.purpose || 'No description provided'}
                </p>
                {selectedTx.remarks && (
                  <p className="text-[11px] text-muted-foreground mt-1 italic">
                    Remarks: {selectedTx.remarks}
                  </p>
                )}
              </div>

              {/* Financial Movement Breakdown */}
              <div className="p-4 bg-muted rounded-xl grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Debit</span>
                  <span className="text-xs font-bold text-destructive">
                    {selectedTx.debit ? `−${formatCurrency(selectedTx.debit, selectedTx.currency || selectedTx.company?.currency || 'USD')}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Credit</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedTx.credit ? `+${formatCurrency(selectedTx.credit, selectedTx.currency || selectedTx.company?.currency || 'USD')}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Balance After</span>
                  <span className="text-xs font-bold text-foreground">
                    {formatCurrency(selectedTx.balanceAfter || 0, selectedTx.currency || selectedTx.company?.currency || 'USD')}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-border bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTx(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default TransactionsPage;
