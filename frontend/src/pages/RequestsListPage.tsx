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
import {
  Button,
  Badge,
  Card,
  CardContent,
  Select,
  Input,
} from '../components/ui';

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
            <span className="text-muted-foreground text-xs">
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
            <div>
              <p className="font-medium text-foreground text-xs leading-none">
                {req.user?.fullName}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {req.region?.name || req.company?.name}
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
            <div>
              <span className="font-medium text-foreground text-xs block">
                {req.receiverName || '—'}
              </span>
              {req.receiverPhone && (
                <span className="text-[10px] text-muted-foreground font-mono">
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
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs max-w-[200px] truncate block" title={row.original.purpose}>
            {row.original.purpose}
          </span>
        ),
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
                  <span className="text-[10px] text-muted-foreground line-through">
                    Req: {formatCurrency(req.requestedAmount, req.currency)}
                  </span>
                </div>
              ) : (
                <span className="font-bold text-foreground">
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
            <Badge
              variant={
                priority === 'URGENT' || priority === 'HIGH'
                  ? 'destructive'
                  : priority === 'MEDIUM'
                  ? 'warning'
                  : 'secondary'
              }
              size="sm"
            >
              {priority}
            </Badge>
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
              <Link to={`/requests/${req.requestNumber || req.id}`}>
                <Button variant="outline" size="xs" className="gap-1">
                  <Eye className="h-3 w-3" />
                  View
                </Button>
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
          <h2 className="text-base font-bold text-foreground whitespace-nowrap leading-none">
            Petty Cash Requests
          </h2>
          <span className="hidden sm:inline text-muted-foreground/60 text-xs">·</span>
          <p className="hidden sm:block text-[11px] text-muted-foreground truncate">
            Manage and review petty cash requests
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-1.5 text-emerald-700 dark:text-emerald-400 border-border shadow-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Export Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            className="gap-1.5 text-rose-700 dark:text-rose-400 border-border shadow-xs hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Printer className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            Export PDF
          </Button>

          {(user?.role === 'EMPLOYEE' || user?.role === 'ACCOUNTANT') && (
            <Link to="/requests/new">
              <Button variant="gold" size="sm" className="gap-1.5 shadow-sm">
                <Plus className="h-3.5 w-3.5" />
                New Request
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
                <option value="ACCOUNTANT_REVIEW">Accountant Reviewed (CFO)</option>
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
    </div>
  );
};

export default RequestsListPage;
