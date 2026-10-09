import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Link, useSearchParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  Filter,
  FileSpreadsheet,
  Printer,
  Eye,
  Calendar,
  MapPin,
  Receipt,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../utils/format';
import { DataTable, DataTableColumnHeader } from '../components/ui/data-table';

const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfWeekString = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  const start = new Date(now.getFullYear(), now.getMonth(), diff);
  return getLocalDateString(start);
};

const getStartOfMonthString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

export const RequestsListPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const isEmployee = user?.role === 'EMPLOYEE';
  const [datePreset, setDatePreset] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'>(() =>
    isEmployee ? 'THIS_MONTH' : 'TODAY'
  );
  const [startDate, setStartDate] = useState(() =>
    isEmployee ? getStartOfMonthString() : getLocalDateString()
  );
  const [endDate, setEndDate] = useState(() => getLocalDateString());

  useEffect(() => {
    if (user?.role === 'EMPLOYEE') {
      setDatePreset('THIS_MONTH');
      setStartDate(getStartOfMonthString());
      setEndDate(getLocalDateString());
    }
  }, [user?.role]);

  const applyDatePreset = (preset: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL' | 'CUSTOM') => {
    setDatePreset(preset);
    const today = getLocalDateString();
    if (preset === 'TODAY') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'THIS_WEEK') {
      setStartDate(getStartOfWeekString());
      setEndDate(today);
    } else if (preset === 'THIS_MONTH') {
      setStartDate(getStartOfMonthString());
      setEndDate(today);
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'CUSTOM') {
      if (!startDate) setStartDate(today);
      if (!endDate) setEndDate(today);
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setRegionFilter('');
    applyDatePreset('ALL');
  };

  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus !== null) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  useEffect(() => {
    // Load regions for filter dropdown
    const compFilter = sessionStorage.getItem('companyFilter') || 'ALL';
    const params: any = {};
    if (compFilter !== 'ALL') params.companyId = compFilter;
    api
      .get('/companies/regions', { params })
      .then((res) => setRegions(res.data || []))
      .catch(() => console.error('Failed to load regions'));
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const params: any = { page: 1, pageSize: 200 };
      if (companyFilter !== 'ALL') params.companyId = companyFilter;
      if (statusFilter) params.status = statusFilter;
      if (regionFilter) params.regionId = regionFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/requests', { params });
      const data = res.data;
      if (data && data.items) {
        setRequests(data.items);
      } else {
        setRequests(data || []);
      }
    } catch (e) {
      console.error('Failed to load requests list', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    window.addEventListener('companyFilterChanged', loadRequests);
    return () => {
      window.removeEventListener('companyFilterChanged', loadRequests);
    };
  }, [statusFilter, regionFilter, startDate, endDate]);

  const handleExportExcel = async () => {
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const params: any = {};
      if (companyFilter !== 'ALL') params.companyId = companyFilter;
      if (regionFilter) params.regionId = regionFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/reports/export-excel', { params, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `petty_cash_requests_${new Date().toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Excel Export failed', e);
    }
  };

  const handleExportPdf = async () => {
    const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
    const params = new URLSearchParams();
    if (companyFilter !== 'ALL') params.append('companyId', companyFilter);
    if (regionFilter) params.append('regionId', regionFilter);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) {
      alert('Please allow popups to view and print the PDF report.');
      return;
    }

    try {
      const res = await api.get(`/reports/export-pdf?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      printWindow.location.href = url;
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      printWindow.close();
      console.error('PDF export failed', e);
    }
  };

  // Filter client-side by priority (status/region/date are handled server-side)
  const filteredData = useMemo(() => {
    if (!priorityFilter) return requests;
    return requests.filter((req) => req.priority === priorityFilter);
  }, [requests, priorityFilter]);

  // Define shadcn/ui TanStack Columns
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Request #" />
        ),
        cell: ({ row }) => {
          const req = row.original;
          return (
            <Link
              to={`/requests/${req.requestNumber || req.id}`}
              className="font-semibold text-primary hover:underline"
            >
              {req.requestNumber}
            </Link>
          );
        },
      },
      {
        accessorKey: 'requestDate',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => {
          const req = row.original;
          return (
            <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
              {formatDate(req.requestDate || req.createdAt)}
            </span>
          );
        },
      },
      {
        id: 'requester',
        accessorFn: (row) => row.user?.fullName || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employee" />
        ),
        cell: ({ row }) => {
          const req = row.original;
          return (
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {req.user?.fullName}
              </p>
              {req.company?.name && (
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    req.company.name === 'Somtel'
                      ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20'
                      : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                  }`}
                >
                  {req.company.name}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'receiverName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Beneficiary" />
        ),
        cell: ({ row }) => {
          const req = row.original;
          return req.receiverName ? (
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                {req.receiverName}
              </p>
              {req.receiverPhone && (
                <p className="text-[11px] text-slate-400 font-mono">
                  {req.receiverPhone}
                </p>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          );
        },
      },
      {
        id: 'region',
        accessorFn: (row) => row.region?.name || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Region" />
        ),
        cell: ({ row }) => {
          const req = row.original;
          return req.region?.name ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
              {req.region.name}
            </span>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          );
        },
      },
      {
        id: 'category',
        accessorFn: (row) =>
          row.budgetHead ? `${row.budgetHead.code} – ${row.budgetHead.name}` : row.requestType || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Category" />
        ),
        cell: ({ row }) => {
          const req = row.original;
          return (
            <span className="text-slate-600 dark:text-slate-400 text-xs">
              {req.budgetHead
                ? `${req.budgetHead.code} – ${req.budgetHead.name}`
                : req.requestType || '—'}
            </span>
          );
        },
      },
      {
        accessorKey: 'requestedAmount',
        header: ({ column }) => (
          <div className="text-right">
            <DataTableColumnHeader column={column} title="Amount" />
          </div>
        ),
        cell: ({ row }) => {
          const req = row.original;
          const isApproved = ['APPROVED', 'PAID', 'COMPLETED'].includes(req.status);
          const hasDifferentApproved =
            isApproved &&
            req.approvedAmount &&
            Number(req.approvedAmount) !== Number(req.requestedAmount);

          return (
            <div className="text-right">
              {hasDifferentApproved ? (
                <div className="flex flex-col items-end">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(req.approvedAmount, req.currency)}
                  </span>
                  <span className="text-[10px] text-slate-400 line-through">
                    Req: {formatCurrency(req.requestedAmount, req.currency)}
                  </span>
                </div>
              ) : (
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {formatCurrency(
                    isApproved && req.approvedAmount ? req.approvedAmount : req.requestedAmount,
                    req.currency
                  )}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'priority',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Priority" />
        ),
        cell: ({ row }) => {
          const priority = row.original.priority;
          return (
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                priority === 'URGENT' || priority === 'HIGH'
                  ? 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
                  : priority === 'MEDIUM'
                  ? 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              {priority}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <div className="text-center">
            <DataTableColumnHeader column={column} title="Status" />
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-center">
            <StatusBadge status={row.original.status} />
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-center">Action</div>,
        cell: ({ row }) => {
          const req = row.original;
          return (
            <div className="text-center">
              <Link
                to={`/requests/${req.requestNumber || req.id}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold transition-all shadow-xs"
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </Link>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-3 font-sans">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-base font-bold text-slate-800 dark:text-white whitespace-nowrap leading-none">
            Petty Cash Requests
          </h2>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600 text-xs">·</span>
          <p className="hidden sm:block text-[11px] text-slate-400 truncate">
            Manage and review petty cash requests
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Export Excel
          </button>

          <button
            onClick={handleExportPdf}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Printer className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            Export PDF
          </button>

          {(user?.role === 'EMPLOYEE' || user?.role === 'ACCOUNTANT') && (
            <Link
              to="/requests/new"
              className="px-3 py-1.5 bg-gold hover:bg-gold-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md"
            >
              <Plus className="h-3.5 w-3.5" />
              New Request
            </Link>
          )}
        </div>
      </div>

      {/* FILTER HUB */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm flex flex-col gap-2.5 transition-colors">
        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
          {/* Date Select Dropdown */}
          <div className="flex items-center gap-1.5 min-w-[130px] flex-1 sm:flex-initial">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={datePreset}
              onChange={(e) => applyDatePreset(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer w-full font-medium"
            >
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Date...</option>
              <option value="ALL">All Time</option>
            </select>
          </div>

          {/* Region Filter - Accountant and Admin only */}
          {!isEmployee && (
            <div className="flex items-center gap-1.5 min-w-[130px] flex-1 sm:flex-initial">
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
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer w-full"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval (Accountant)</option>
              <option value="ACCOUNTANT_REVIEW">Accountant Reviewed (CFO)</option>
              <option value="CORRECTION_REQUIRED">Correction Required</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer w-full sm:w-28"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        {/* Custom Range Picker / Active Filter Reset Bar */}
        {(datePreset === 'CUSTOM' ||
          regionFilter ||
          statusFilter ||
          priorityFilter ||
          datePreset !== 'TODAY') && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
            {datePreset === 'CUSTOM' ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Custom Dates:
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
            ) : (
              <div className="text-[11px] text-slate-400">
                Date Preset:{' '}
                <span className="font-semibold text-primary">
                  {datePreset === 'TODAY'
                    ? 'Today'
                    : datePreset === 'THIS_WEEK'
                    ? 'This Week'
                    : datePreset === 'THIS_MONTH'
                    ? 'This Month'
                    : 'All Time'}
                </span>
              </div>
            )}

            <button
              onClick={handleResetFilters}
              className="text-[11px] text-primary hover:underline font-semibold cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* SHADCN/UI UPGRADED DATA TABLE */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={loading}
        searchPlaceholder="Search by request #, name, etc..."
        pageSize={20}
        pageSizeOptions={[10, 20, 50, 100]}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="No requests found"
            description="Try adjusting your filters or date range."
            action={
              datePreset === 'TODAY' || datePreset === 'THIS_MONTH' ? (
                <button
                  type="button"
                  onClick={() => applyDatePreset('ALL')}
                  className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                >
                  View All Time Requests
                </button>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
};
