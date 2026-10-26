import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  Building2,
  Receipt,
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
  const { user } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE';
  const [transactions, setTransactions] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingBook, setExportingBook] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'THIS_MONTH' | 'THIS_WEEK' | 'TODAY' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch Regions & Companies
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const saved = sessionStorage.getItem('companyFilter') || 'ALL';
        const params: any = {};
        if (saved !== 'ALL') params.companyId = saved;
        const res = await api.get('/companies/regions', { params });
        setRegions(res.data || []);
      } catch (err) {
        console.error('Failed to load regions', err);
      }
    };
    const fetchCompanies = async () => {
      try {
        const res = await api.get('/companies');
        setCompanies(res.data || []);
      } catch (err) {
        console.error('Failed to load companies', err);
      }
    };
    fetchRegions();
    fetchCompanies();
    window.addEventListener('companyFilterChanged', fetchRegions);
    return () => window.removeEventListener('companyFilterChanged', fetchRegions);
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const saved = sessionStorage.getItem('companyFilter') || 'ALL';
      const params: any = { page: 1, pageSize: 500 };
      if (saved !== 'ALL') params.companyId = saved;
      if (companyFilter) params.companyId = companyFilter;
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
  }, [typeFilter, regionFilter, companyFilter, startDate, endDate]);

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
      a.download = `transactions_${new Date().toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export transactions to Excel', err);
      alert('Failed to export Excel report. Please ensure you have permission and try again.');
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
    } catch (err: any) {
      console.error('Failed to export monthly book', err);
      alert('Failed to export Monthly Petty Cash Book. Please try again.');
    } finally {
      setExportingBook(false);
    }
  };

  // Define Columns for TanStack Table
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
            <div className="text-right font-bold text-foreground text-xs whitespace-nowrap min-w-[80px]">
              {t.credit && Number(t.credit) > 0
                ? `+${formatCurrency(t.credit, t.currency || t.company?.currency || 'USD')}`
                : <span className="text-muted-foreground font-normal">—</span>}
            </div>
          );
        },
      },

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

  const renderMobileTransactionCard = (tx: any) => {
    const isDebit = Number(tx.debitAmount || 0) > 0;
    const isCredit = Number(tx.creditAmount || 0) > 0;

    // Accurate data accessors across direct ledger row and linked request
    const recipient = tx.request?.receiverName || tx.request?.vendorName || tx.recipientName;
    const phone = tx.request?.receiverPhone || tx.request?.receiverAccount || tx.recipientPhone;
    const employee = tx.request?.user?.fullName || tx.employee?.fullName;
    const region = tx.request?.region?.name || tx.region?.name;
    const category = tx.request?.budgetHead?.name || tx.category?.name;
    const purpose = tx.request?.purpose || tx.description;
    const company = tx.company?.name || tx.request?.company?.name;
    const isSomtel = company?.toLowerCase().includes('somtel');

    return (
      <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs hover:border-primary/40 transition-all space-y-2.5">
        {/* Header: Date + Company + Type Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-foreground">{formatDate(tx.transactionDate || tx.createdAt)}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {company && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isSomtel
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                }`}
              >
                {company}
              </span>
            )}
            <Badge
              variant={
                tx.transactionType === 'EXPENSE'
                  ? 'destructive'
                  : tx.transactionType === 'ALLOCATION'
                  ? 'success'
                  : 'warning'
              }
              size="sm"
              className="text-[10px] px-2 py-0.5 font-semibold uppercase"
            >
              {tx.transactionType}
            </Badge>
          </div>
        </div>

        {/* Financial Flow: Inflow / Outflow & Balance */}
        <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50/80 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800/60 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
              {isDebit ? 'Cash Out (Expense)' : isCredit ? 'Cash In (Top-up)' : 'Movement'}
            </span>
            {isDebit ? (
              <span className="font-bold text-rose-600 dark:text-rose-400 text-sm font-financial">
                −{formatCurrency(tx.debitAmount, tx.currency || 'USD')}
              </span>
            ) : isCredit ? (
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-financial">
                +{formatCurrency(tx.creditAmount, tx.currency || 'USD')}
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Running Balance</span>
            <span className="font-mono font-bold text-foreground text-sm font-financial">
              {formatCurrency(tx.runningBalance, tx.currency || 'USD')}
            </span>
          </div>
        </div>

        {/* References: Request # & Invoice # & Meta Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {tx.request?.requestNumber && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
              <Receipt className="h-3 w-3 shrink-0" />
              {tx.request.requestNumber}
            </span>
          )}
          {(tx.receiptNumber || tx.referenceNumber) && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded font-mono">
              Inv: {tx.receiptNumber || tx.referenceNumber}
            </span>
          )}
          {region && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">
              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
              {region}
            </span>
          )}
          {category && (
            <span className="inline-flex items-center text-[10.5px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded font-medium">
              {category}
            </span>
          )}
        </div>

        {/* People: Recipient / Beneficiary & Requester */}
        <div className="text-xs space-y-1 pt-0.5 border-t border-border/40">
          {recipient && (
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-muted-foreground text-[11px] shrink-0">Paid To:</span>
              <span className="font-semibold text-foreground text-right truncate">
                {recipient}
                {phone && <span className="font-mono text-[11px] text-muted-foreground font-normal ml-1">({phone})</span>}
              </span>
            </div>
          )}

          {employee && (!recipient || employee !== recipient) && (
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-muted-foreground text-[11px] shrink-0">Requester:</span>
              <span className="font-medium text-foreground text-right truncate">{employee}</span>
            </div>
          )}
        </div>

        {/* Purpose / Description */}
        {purpose && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic px-2 py-1 bg-muted/30 rounded border-l-2 border-primary/40">
            "{purpose}"
          </p>
        )}

        {/* Footer: Detail button */}
        <div className="pt-1">
          <Button
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTx(tx);
            }}
            className="gap-1.5 h-7.5 px-3 text-xs font-semibold hover:border-primary hover:text-primary cursor-pointer w-full justify-center"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View Full Details</span>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 font-display">
            <DollarSign className="h-5 w-5 text-[#F5B700]" />
            {isEmployee ? 'My Petty Cash Reports' : 'Petty Cash Reports'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isEmployee
              ? 'Personal petty cash disbursements and settlement history for your approved requests'
              : 'Petty cash book showing cash received (Debit) and payments (Credit) with running balance'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          {!isEmployee && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMonthlyBook}
              disabled={exportingBook}
              className="gap-1.5 text-xs h-8 justify-center"
              title="Export Monthly Petty Cash Book (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{exportingBook ? 'Generating...' : 'Monthly Book'}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="gap-1.5 text-xs h-8 justify-center"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{exportingExcel ? 'Exporting...' : 'Export Excel'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="gap-1.5 text-xs h-8 justify-center"
          >
            <Printer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{exportingPdf ? 'Preparing...' : 'Export PDF'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadTransactions}
            className="gap-1.5 text-xs h-8 justify-center"
          >
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* FILTER HUB */}
      <Card className="shadow-xs">
        <CardContent className="p-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-nowrap gap-2 items-center">
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

            {/* COMPANY FILTER - Admin/Accountant only */}
            {!isEmployee && (
              <div className="flex items-center gap-1.5 min-w-[135px] flex-1 sm:flex-initial">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Select
                  value={companyFilter}
                  onChange={(e) => {
                    setCompanyFilter(e.target.value);
                    setRegionFilter('');
                  }}
                  className="text-xs h-8 font-medium"
                >
                  <option value="">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

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
                  const visibleRegions = companyFilter
                    ? regions.filter((r) => (r.companyId || r.company?.id) === companyFilter)
                    : regions;

                  const groups: { [key: string]: any[] } = {};
                  visibleRegions.forEach((r) => {
                    const cName = r.company?.name || 'Other';
                    if (!groups[cName]) groups[cName] = [];
                    groups[cName].push(r);
                  });
                  const compKeys = Object.keys(groups);
                  if (compKeys.length <= 1) {
                    return visibleRegions.map((r) => (
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
        renderMobileCard={renderMobileTransactionCard}
        emptyState={
          <EmptyState
            icon={DollarSign}
            title="No records found"
            description="No petty cash report entries matching the selected criteria."
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
                  <span className="text-xs font-bold text-foreground">
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
