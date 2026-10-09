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
  X,
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../utils/format';
import { DataTable, DataTableColumnHeader } from '../components/ui/data-table';

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
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
      a.download = `petty_cash_ledger_${new Date().toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Excel Export failed', e);
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
    try {
      const res = await api.get(`/funds/transactions/export-pdf?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      if (printWindow) {
        printWindow.location.href = url;
        window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      }
    } catch (e) {
      if (printWindow) printWindow.close();
      console.error('PDF export failed', e);
    } finally {
      setExportingPdf(false);
    }
  };

  // Define shadcn/ui TanStack Columns for Transactions
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
        accessorKey: 'date',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => {
          const t = row.original;
          return (
            <span className="whitespace-nowrap text-slate-600 dark:text-slate-300 font-semibold text-xs">
              {formatDate(t.date || t.createdAt)}
            </span>
          );
        },
      },
      {
        id: 'company',
        accessorFn: (row) => row.company?.name || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Company" />
        ),
        cell: ({ row }) => {
          const t = row.original;
          const isSomtel = t.company?.name === 'Somtel';
          return (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                isSomtel
                  ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20'
                  : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
              }`}
            >
              {t.company?.name || 'N/A'}
            </span>
          );
        },
      },
      {
        id: 'reference',
        accessorFn: (row) => row.request?.requestNumber || row.referenceNumber || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Req / Invoice #" />
        ),
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="flex flex-col gap-0.5 whitespace-nowrap">
              {t.request?.requestNumber && (
                <span className="font-semibold text-primary text-xs">
                  #{t.request.requestNumber}
                </span>
              )}
              {(t.referenceNumber || t.request?.invoiceNumber) && (
                <span className="text-[11px] text-slate-400 font-mono">
                  {t.referenceNumber || t.request?.invoiceNumber}
                </span>
              )}
              {!t.request?.requestNumber && !t.referenceNumber && (
                <span className="text-slate-400 text-xs">—</span>
              )}
            </div>
          );
        },
      },
      {
        id: 'employee',
        accessorFn: (row) => row.employee?.fullName || row.request?.user?.fullName || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employee" />
        ),
        cell: ({ row }) => {
          const t = row.original;
          const emp = t.employee?.fullName || t.request?.user?.fullName;
          return (
            <span className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate max-w-[140px] block">
              {emp || '—'}
            </span>
          );
        },
      },
      {
        id: 'recipient',
        accessorFn: (row) => row.request?.receiverName || row.request?.vendorName || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Recipient" />
        ),
        cell: ({ row }) => {
          const t = row.original;
          const name = t.request?.receiverName || t.request?.vendorName;
          const phone = t.request?.receiverPhone;
          return name ? (
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate max-w-[130px]">
                {name}
              </p>
              {phone && <p className="text-[10px] text-slate-400 font-mono">{phone}</p>}
            </div>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          );
        },
      },
      {
        id: 'region',
        accessorFn: (row) => row.request?.region?.name || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Region" />
        ),
        cell: ({ row }) => {
          const region = row.original.request?.region?.name;
          return region ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
              {region}
            </span>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          );
        },
      },
      {
        id: 'category',
        accessorFn: (row) => row.request?.budgetHead?.name || row.description || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Category" />
        ),
        cell: ({ row }) => {
          const category = row.original.request?.budgetHead?.name;
          return (
            <span className="text-slate-600 dark:text-slate-400 text-xs truncate max-w-[130px] block">
              {category || '—'}
            </span>
          );
        },
      },
      {
        accessorKey: 'transactionType',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => {
          const type = row.original.transactionType;
          return (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap border ${
                type === 'ALLOCATION' || type === 'TRANSFER_IN'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                  : type === 'PAYMENT' || type === 'TRANSFER_OUT'
                  ? 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              {type}
            </span>
          );
        },
      },
      {
        accessorKey: 'debit',
        header: ({ column }) => (
          <div className="text-right">
            <DataTableColumnHeader column={column} title="Debit" />
          </div>
        ),
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="text-right font-bold text-rose-600 dark:text-rose-400 text-xs whitespace-nowrap">
              {t.debit && Number(t.debit) > 0
                ? `−${formatCurrency(t.debit, t.currency || t.company?.currency || 'USD')}`
                : '—'}
            </div>
          );
        },
      },
      {
        accessorKey: 'credit',
        header: ({ column }) => (
          <div className="text-right">
            <DataTableColumnHeader column={column} title="Credit" />
          </div>
        ),
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs whitespace-nowrap">
              {t.credit && Number(t.credit) > 0
                ? `+${formatCurrency(t.credit, t.currency || t.company?.currency || 'USD')}`
                : '—'}
            </div>
          );
        },
      },
      {
        accessorKey: 'balanceAfter',
        header: ({ column }) => (
          <div className="text-right">
            <DataTableColumnHeader column={column} title="Balance" />
          </div>
        ),
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="text-right font-bold text-slate-900 dark:text-white text-xs whitespace-nowrap">
              {formatCurrency(t.balanceAfter || 0, t.currency || t.company?.currency || 'USD')}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-center">Action</div>,
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setSelectedTx(t)}
                className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                title="View Details"
              >
                <Eye className="h-3.5 w-3.5" />
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
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Transactions Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Chronological log of petty cash allocations, disbursements, payments, and financial movements
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {exportingExcel ? 'Exporting...' : 'Export Excel'}
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            {exportingPdf ? 'Preparing...' : 'Export PDF'}
          </button>

          <button
            onClick={loadTransactions}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* FILTER HUB */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-xs flex flex-col gap-2.5 transition-colors">
        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
          {/* DATE PRESET SELECT */}
          <div className="flex items-center gap-1.5 min-w-[130px] flex-1 sm:flex-initial">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={datePreset}
              onChange={(e) => applyDatePreset(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer w-full font-medium"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Range...</option>
            </select>
          </div>

          {/* REGION FILTER - GROUPED BY COMPANY */}
          <div className="flex items-center gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer w-full"
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
            </select>
          </div>

          {/* MOVEMENT TYPE FILTER */}
          <div className="flex items-center gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer w-full"
            >
              <option value="">All Movement Types</option>
              <option value="PAYMENT">Payment / Expense</option>
              <option value="ALLOCATION">Fund Allocation</option>
              <option value="CARRY_FORWARD">Carry Forward</option>
              <option value="TRANSFER_IN">Transfer In</option>
              <option value="TRANSFER_OUT">Transfer Out</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="REIMBURSEMENT">Reimbursement</option>
            </select>
          </div>
        </div>

        {/* CUSTOM DATE RANGE BAR */}
        {(datePreset === 'CUSTOM' || startDate || endDate) && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Date Range:
              </span>
              <span className="text-[11px] text-slate-400">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                setDatePreset('ALL');
                setStartDate('');
                setEndDate('');
                setTypeFilter('');
                setRegionFilter('');
              }}
              className="text-xs text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* SHADCN/UI UPGRADED DATA TABLE */}
      <DataTable
        columns={columns}
        data={transactions}
        isLoading={loading}
        searchPlaceholder="Search by request #, employee, recipient, or ref..."
        pageSize={20}
        pageSizeOptions={[10, 20, 50, 100]}
        emptyState={
          <EmptyState
            icon={DollarSign}
            title="No transactions found"
            description="No transaction ledger entries match your filter criteria."
          />
        }
      />

      {/* TRANSACTION DETAILS MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                  Transaction Details
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  ID: {selectedTx.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {new Date(selectedTx.date || selectedTx.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Company</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedTx.company?.name || '—'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Type</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedTx.transactionType}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Request #</span>
                  <span className="font-bold text-primary">
                    {selectedTx.request?.requestNumber ? `#${selectedTx.request.requestNumber}` : '—'}
                  </span>
                </div>
              </div>

              {(selectedTx.referenceNumber || selectedTx.request?.invoiceNumber) && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Invoice #</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-xs">
                    {selectedTx.referenceNumber || selectedTx.request?.invoiceNumber}
                  </span>
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Employee / Initiator</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedTx.employee?.fullName || selectedTx.request?.user?.fullName || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Recipient / Merchant</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedTx.request?.receiverName || selectedTx.request?.vendorName || '—'}
                    {selectedTx.request?.receiverPhone && ` (${selectedTx.request.receiverPhone})`}
                  </span>
                </div>
                {selectedTx.request?.region?.name && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Region</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedTx.request.region.name}
                    </span>
                  </div>
                )}
                {selectedTx.request?.budgetHead?.name && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Category / Budget Head</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedTx.request.budgetHead.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Description / Purpose</span>
                <p className="font-medium text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  {selectedTx.description || selectedTx.request?.purpose || 'No description provided'}
                </p>
                {selectedTx.remarks && (
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    Remarks: {selectedTx.remarks}
                  </p>
                )}
              </div>

              {/* Financial Movement Breakdown */}
              <div className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-xl grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Debit</span>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    {selectedTx.debit ? `−${formatCurrency(selectedTx.debit, selectedTx.currency || selectedTx.company?.currency || 'USD')}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Credit</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedTx.credit ? `+${formatCurrency(selectedTx.credit, selectedTx.currency || selectedTx.company?.currency || 'USD')}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Balance After</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    {formatCurrency(selectedTx.balanceAfter || 0, selectedTx.currency || selectedTx.company?.currency || 'USD')}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
