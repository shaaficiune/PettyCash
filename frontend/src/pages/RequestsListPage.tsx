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
  X,
  ArrowLeft,
  Car,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
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
} from '../components/ui';
import { RequestDetailPage } from './RequestDetailPage';

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

  // Side Full Page View state
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  const openSidePanel = (req: any) => {
    setSelectedRequestId(req.requestNumber || req.id);
    setIsSidePanelOpen(true);
  };

  // Restore saved filters from sessionStorage if available
  const getSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem('requests_active_filters');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  };

  const savedFilters = getSavedFilters();

  const urlStatus = searchParams.get('status');
  const urlPreset = searchParams.get('datePreset');
  const isValidPreset = (p: string | null): p is 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL' | 'CUSTOM' =>
    p !== null && ['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'ALL', 'CUSTOM'].includes(p);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isApprovalTwo = user?.role === 'APPROVAL_TWO';
  // Default filter: APPROVAL_TWO and SUPER_ADMIN see only requests awaiting Stage 2 approval
  const defaultStatusForRole = (isSuperAdmin || isApprovalTwo) ? 'ACCOUNTANT_REVIEW' : '';
  const initialStatus = urlStatus !== null ? urlStatus : (savedFilters?.statusFilter ?? defaultStatusForRole);
  const initialPriority = savedFilters?.priorityFilter ?? '';
  const initialRegion = savedFilters?.regionFilter ?? '';
  const initialPreset = isValidPreset(urlPreset)
    ? urlPreset
    : (savedFilters?.datePreset && isValidPreset(savedFilters.datePreset)
        ? savedFilters.datePreset
        : 'THIS_MONTH');

  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState(initialPriority);
  const [regionFilter, setRegionFilter] = useState(initialRegion);
  const [datePreset, setDatePreset] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'>(initialPreset);
  const [startDate, setStartDate] = useState(() => {
    if (savedFilters?.startDate !== undefined && !urlPreset) return savedFilters.startDate;
    if (initialPreset === 'THIS_MONTH') return getStartOfMonthString();
    if (initialPreset === 'THIS_WEEK') return getStartOfWeekString();
    if (initialPreset === 'ALL') return '';
    return getLocalDateString();
  });
  const [endDate, setEndDate] = useState(() => {
    if (savedFilters?.endDate !== undefined && !urlPreset) return savedFilters.endDate;
    return getLocalDateString();
  });

  const isEmployee = user?.role === 'EMPLOYEE';

  // Persist filter changes so navigating to a request's full page and coming back never loses filters
  useEffect(() => {
    sessionStorage.setItem(
      'requests_active_filters',
      JSON.stringify({
        statusFilter,
        priorityFilter,
        regionFilter,
        datePreset,
        startDate,
        endDate,
      })
    );
  }, [statusFilter, priorityFilter, regionFilter, datePreset, startDate, endDate]);

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
    sessionStorage.removeItem('requests_active_filters');
    applyDatePreset('ALL');
  };

  useEffect(() => {
    if (urlStatus !== null) {
      setStatusFilter(urlStatus);
    }
    if (isValidPreset(urlPreset)) {
      applyDatePreset(urlPreset);
    }
  }, [urlStatus, urlPreset]);

  useEffect(() => {
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

  const filteredData = useMemo(() => {
    if (!priorityFilter) return requests;
    return requests.filter((req) => req.priority === priorityFilter);
  }, [requests, priorityFilter]);

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div className="w-5 flex justify-center">
            <input
              type="checkbox"
              checked={table.getIsAllPageRowsSelected()}
              onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
              aria-label="Select all"
              className="rounded border-input text-primary focus:ring-ring h-3.5 w-3.5 cursor-pointer"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="w-5 flex justify-center">
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={(e) => row.toggleSelected(!!e.target.checked)}
              aria-label="Select row"
              className="rounded border-input text-primary focus:ring-ring h-3.5 w-3.5 cursor-pointer"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'requestNumber',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Req #" />
        ),
        cell: ({ row }) => {
          const req = row.original;
          return (
            <button
              type="button"
              onClick={() => openSidePanel(req)}
              className="font-bold text-primary hover:underline text-xs whitespace-nowrap text-left cursor-pointer"
              title="Open full request detail inline"
            >
              {req.requestNumber}
            </button>
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
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              {formatDate(req.requestDate || req.createdAt)}
            </span>
          );
        },
      },
      {
        id: 'employee',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employee" />
        ),
        cell: ({ row }) => {
          const req = row.original;
          return (
            <div className="min-w-0 max-w-[110px]">
              <p className="font-semibold text-foreground text-xs leading-tight truncate" title={req.user?.fullName}>
                {req.user?.fullName}
              </p>
              <p className="text-[10px] text-muted-foreground truncate" title={req.region?.name || req.company?.name || '—'}>
                {req.region?.name || req.company?.name || '—'}
              </p>
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
          return (
            <div className="min-w-0 max-w-[105px]">
              <span className="font-medium text-foreground text-xs block leading-tight truncate" title={req.receiverName || '—'}>
                {req.receiverName || '—'}
              </span>
              {req.receiverPhone && (
                <span className="text-[10px] text-muted-foreground font-mono block truncate">
                  {req.receiverPhone}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'purpose',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Purpose" />
        ),
        cell: ({ row }) => {
          const text = `${row.original.purpose || ''} ${row.original.description || ''}`;
          const plateMatch = text.match(/\b([A-Z]{2}\d{3})\b/);

          return (
            <div className="max-w-[130px] flex flex-col gap-0.5">
              {plateMatch && (
                <span className="inline-flex items-center gap-1 w-fit px-1.5 py-0.5 text-[9.5px] font-bold rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-mono">
                  <Car className="h-2.5 w-2.5 shrink-0" />
                  {plateMatch[1]}
                </span>
              )}
              <span
                className="text-muted-foreground text-xs truncate block"
                title={row.original.purpose}
              >
                {row.original.purpose}
              </span>
            </div>
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
            <div className="text-right whitespace-nowrap">
              {hasDifferentApproved ? (
                <div className="flex flex-col items-end leading-none">
                  <span className="font-bold text-foreground text-xs">
                    {formatCurrency(req.approvedAmount, req.currency)}
                  </span>
                  <span className="text-[9px] text-muted-foreground line-through mt-0.5">
                    {formatCurrency(req.requestedAmount, req.currency)}
                  </span>
                </div>
              ) : (
                <span className="font-bold text-foreground text-xs">
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
          <div className="text-center">
            <DataTableColumnHeader column={column} title="Priority" />
          </div>
        ),
        cell: ({ row }) => {
          const priority = row.original.priority;
          return (
            <div className="text-center">
              <Badge
                variant={
                  priority === 'URGENT' || priority === 'HIGH'
                    ? 'destructive'
                    : priority === 'MEDIUM'
                    ? 'warning'
                    : 'secondary'
                }
                size="sm"
                className="text-[10px] px-1.5 py-0 font-medium whitespace-nowrap"
              >
                {priority}
              </Badge>
            </div>
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
          <div className="text-center flex justify-center">
            <StatusBadge status={row.original.status} size="sm" />
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
              <Button
                variant="outline"
                size="xs"
                onClick={() => openSidePanel(req)}
                className="gap-1 h-6.5 px-2 text-[11px] font-medium hover:border-primary hover:text-primary cursor-pointer"
              >
                <Eye className="h-3 w-3" />
                View
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const renderMobileRequestCard = (req: any) => {
    const isApproved = ['APPROVED', 'PAID', 'COMPLETED'].includes(req.status);
    const hasDifferentApproved =
      isApproved &&
      req.approvedAmount &&
      Number(req.approvedAmount) !== Number(req.requestedAmount);

    return (
      <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-primary/40 transition-all space-y-2.5">
        {/* Top Header: Req Number & Status */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openSidePanel(req);
            }}
            className="font-bold text-primary hover:underline text-xs flex items-center gap-1 cursor-pointer"
          >
            <Receipt className="h-3.5 w-3.5 text-primary/80" />
            <span>{req.requestNumber}</span>
          </button>
          <StatusBadge status={req.status} size="sm" />
        </div>

        {/* Amount & Priority */}
        <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block leading-tight">Amount</span>
            {hasDifferentApproved ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-foreground">
                  {formatCurrency(req.approvedAmount, req.currency)}
                </span>
                <span className="text-[10px] text-muted-foreground line-through">
                  {formatCurrency(req.requestedAmount, req.currency)}
                </span>
              </div>
            ) : (
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(
                  isApproved && req.approvedAmount ? req.approvedAmount : req.requestedAmount,
                  req.currency
                )}
              </span>
            )}
          </div>

          <Badge
            variant={
              req.priority === 'URGENT' || req.priority === 'HIGH'
                ? 'destructive'
                : req.priority === 'MEDIUM'
                ? 'warning'
                : 'secondary'
            }
            size="sm"
            className="text-[10px] px-2 py-0.5 font-semibold uppercase"
          >
            {req.priority}
          </Badge>
        </div>

        {/* Details Grid: Employee & Beneficiary */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground font-medium block">Employee</span>
            <p className="font-semibold text-foreground text-xs truncate">{req.user?.fullName || '—'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{req.region?.name || req.company?.name || '—'}</p>
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground font-medium block">Beneficiary</span>
            <p className="font-medium text-foreground text-xs truncate">{req.receiverName || '—'}</p>
            {req.receiverPhone && (
              <p className="text-[10px] text-muted-foreground font-mono truncate">{req.receiverPhone}</p>
            )}
          </div>
        </div>

        {/* Purpose */}
        {req.purpose && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic px-0.5">
            "{req.purpose}"
          </p>
        )}

        {/* Footer: Date & Action */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-[11px] text-muted-foreground">
            {formatDate(req.requestDate || req.createdAt)}
          </span>
          <Button
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              openSidePanel(req);
            }}
            className="gap-1.5 h-7 px-3 text-xs font-semibold hover:border-primary hover:text-primary cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            View Request
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 font-sans">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-foreground whitespace-nowrap leading-none font-display">
            {isEmployee ? 'My requests' : 'All requests'}
          </h2>
          <span className="hidden sm:inline text-muted-foreground/60 text-xs">·</span>
          <p className="hidden sm:block text-[11px] text-muted-foreground truncate">
            {isEmployee ? 'Track and manage your submitted expense vouchers' : 'Review, approve, and disburse regional petty cash vouchers'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {/* Export buttons — Accountant & Admin only */}
          {!isEmployee && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="gap-1.5 shadow-xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                Export Excel
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                className="gap-1.5 shadow-xs"
              >
                <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                Export PDF
              </Button>
            </>
          )}

          {/* New Request — Employees & Accountants can submit */}
          {(user?.role === 'EMPLOYEE' || user?.role === 'ACCOUNTANT') && (
            <Link to="/requests/new">
              <Button variant="gold" size="sm" className="gap-1.5 shadow-xs font-semibold">
                <Plus className="h-3.5 w-3.5" />
                New petty cash request
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* FILTER HUB */}
      <Card className="shadow-xs">
        <CardContent className="p-3 space-y-2.5">
          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            {/* Date Select Dropdown */}
            <div className="flex items-center gap-1.5 min-w-[130px] flex-1 sm:flex-initial">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select
                value={datePreset}
                onChange={(e) => applyDatePreset(e.target.value as any)}
                className="font-medium text-xs h-8"
              >
                <option value="TODAY">Today</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="CUSTOM">Custom Date...</option>
                <option value="ALL">All Time</option>
              </Select>
            </div>

            {/* Region Filter - Accountant and Admin only */}
            {!isEmployee && (
              <div className="flex items-center gap-1.5 min-w-[130px] flex-1 sm:flex-initial">
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
            )}

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs h-8"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_APPROVAL">Pending Approval (Accountant)</option>
                <option value="ACCOUNTANT_REVIEW">Stage 2: Awaiting Approval Two</option>
                <option value="CORRECTION_REQUIRED">Correction Required</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="w-full sm:w-28">
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs h-8"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>
          </div>

          {/* Custom Range Picker / Active Filter Reset Bar */}
          {(datePreset === 'CUSTOM' ||
            regionFilter ||
            statusFilter ||
            priorityFilter ||
            datePreset !== 'TODAY') && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border text-xs">
              {datePreset === 'CUSTOM' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Custom Dates:
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
              ) : (
                <div className="text-[11px] text-muted-foreground">
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

              <Button
                variant="link"
                size="xs"
                onClick={handleResetFilters}
                className="text-[11px] ml-auto p-0 h-auto"
              >
                Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SHADCN/UI UPGRADED DATA TABLE */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={loading}
        dense={true}
        searchPlaceholder="Search by request #, name, etc..."
        pageSize={20}
        pageSizeOptions={[10, 20, 50, 100]}
        renderMobileCard={renderMobileRequestCard}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="No requests found"
            description="Try adjusting your filters or date range."
            action={
              datePreset === 'TODAY' || datePreset === 'THIS_MONTH' ? (
                <Button
                  variant="link"
                  size="xs"
                  onClick={() => applyDatePreset('ALL')}
                >
                  View All Time Requests
                </Button>
              ) : undefined
            }
          />
        }
      />

      {/* DIRECT FULL PAGE INLINE / SIDE OVERLAY */}
      {isSidePanelOpen && selectedRequestId && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in-0 duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsSidePanelOpen(false)}
            aria-hidden="true"
          />
          {/* Full Page Slide-in Canvas */}
          <div className="relative z-50 w-full max-w-4xl bg-card border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
            {/* Top Bar with Close button */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40 shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidePanelOpen(false)}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Requests
                </Button>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs font-semibold text-muted-foreground">Full Page View</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSidePanelOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Complete Full Page Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFC] dark:bg-[#080D1A]">
              <RequestDetailPage
                requestId={selectedRequestId}
                isInline={true}
                onClose={() => setIsSidePanelOpen(false)}
                onActionCompleted={() => {
                  loadRequests();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsListPage;
