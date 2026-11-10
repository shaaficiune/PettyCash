import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Card,
  CardContent,
  Button,
  Select,
  Badge,
} from '../components/ui';
import {
  BarChart3,
  Users,
  Download,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Eye,
  X,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Building2,
  MapPin,
  Filter,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RegionRow {
  regionId: string;
  regionName: string;
  companyId: string;
  companyName: string;
  regionBudget: number;
  totalSpent: number;
  remainingBudget: number;
  percentageUsed: number;
  status: 'SAFE' | 'WARNING' | 'EXCEEDED';
  byCategory?: Record<string, { spent: number; count: number; requests?: any[] }>;
}

interface RegionApiSummary {
  totalSpent: number;
  somtelSpent: number;
  bluekomSpent: number;
}

interface RegionData {
  summary: RegionApiSummary;
  rows: RegionRow[];
}

interface EmployeeRequest {
  id: string;
  requestNumber: string;
  purpose: string;
  requestedAmount: number;
  approvedAmount: number;
  status: string;
  date: string;
  receiverName?: string;
}

interface EmployeeRow {
  userId: string;
  fullName: string;
  username: string;
  phone: string;
  companyName: string;
  regionName: string;
  departmentName: string;
  totalRequests: number;
  totalRequested: number;
  totalApproved: number;
  totalPaid: number;
  totalSettled: number;
  pendingSettlementCount: number;
  pendingSettlementAmount: number;
  requests: EmployeeRequest[];
}

interface EmployeeSummary {
  totalEmployees: number;
  totalRequests: number;
  totalRequested: number;
  totalApproved: number;
  totalPaid: number;
  totalPendingSettlementAmount: number;
  totalPendingSettlementCount: number;
}

interface EmployeeData {
  summary: EmployeeSummary;
  employees: EmployeeRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function formatDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getThisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: formatDateLocal(start),
    endDate: formatDateLocal(end),
  };
}

function getLastMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    startDate: formatDateLocal(start),
    endDate: formatDateLocal(end),
  };
}

const STATUS_CONFIG = {
  SAFE: {
    label: 'Safe',
    bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    bar: 'bg-emerald-500',
    icon: CheckCircle,
  },
  WARNING: {
    label: 'Warning (80%+)',
    bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    bar: 'bg-amber-500',
    icon: AlertTriangle,
  },
  EXCEEDED: {
    label: 'Exceeded (100%+)',
    bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    bar: 'bg-rose-500',
    icon: TrendingUp,
  },
};

const REQ_STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: 'Pending',
  ACCOUNTANT_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  PAYMENT_PROCESSING: 'Processing',
  PAID: 'Paid',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

const REQ_STATUS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  ACCOUNTANT_REVIEW: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
  APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
  PAYMENT_PROCESSING: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
  PAID: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
  COMPLETED: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
  REJECTED: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
};

// ─── KPI Metric Card ──────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  variant?: 'blue' | 'amber' | 'emerald' | 'purple' | 'default';
}) {
  const styles = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-100 dark:border-blue-900/40',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-900/40',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-900/40',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-100 dark:border-purple-900/40',
    },
    default: {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-700',
    },
  }[variant];

  return (
    <Card className="shadow-xs hover:shadow-sm transition-shadow">
      <CardContent className="p-4 flex items-center gap-3.5">
        <div className={`p-3 rounded-xl border ${styles.bg} ${styles.border} ${styles.text} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </p>
          <p className="text-xl font-bold font-mono tracking-tight text-foreground mt-0.5">
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Reports Page ────────────────────────────────────────────────────────

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();

  // Role guard
  if (
    user &&
    user.role !== 'SUPER_ADMIN' &&
    user.role !== 'ACCOUNTANT' &&
    user.role !== 'APPROVAL_TWO'
  ) {
    return <Navigate to="/" replace />;
  }

  const [activeTab, setActiveTab] = useState<'region' | 'employee'>('region');

  // Filters
  const { startDate: initialStart, endDate: initialEnd } = getThisMonthRange();
  const [periodPreset, setPeriodPreset] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [companyId, setCompanyId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [statusScope, setStatusScope] = useState('APPROVED_AND_PAID');
  const [empSearch, setEmpSearch] = useState('');

  // Dropdown options
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string; companyId?: string; company?: { id: string } }[]>([]);

  // Data states
  const [regionData, setRegionData] = useState<RegionData | null>(null);
  const [regionLoading, setRegionLoading] = useState(false);
  const [empData, setEmpData] = useState<EmployeeData | null>(null);
  const [empLoading, setEmpLoading] = useState(false);

  // Expanded region category breakdowns
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

  // Drill-down modal for employee
  const [drillEmployee, setDrillEmployee] = useState<EmployeeRow | null>(null);

  useEffect(() => {
    api.get('/companies').then((r) => setCompanies(r.data)).catch(() => {});
    api.get('/regions').then((r) => setRegions(r.data)).catch(() => {});
  }, []);

  // Filter visible regions based on selected company
  const visibleRegions = useMemo(() => {
    if (!companyId) return regions;
    return regions.filter((r) => (r.companyId || r.company?.id) === companyId);
  }, [regions, companyId]);

  const fetchRegionData = useCallback(async () => {
    setRegionLoading(true);
    try {
      const params: Record<string, string> = { statusScope };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (companyId) params.companyId = companyId;
      if (regionId) params.regionId = regionId;
      const res = await api.get('/reports/region-budget-heads', { params });
      setRegionData(res.data);
    } catch (err) {
      console.error('Failed to load regional budget report', err);
    } finally {
      setRegionLoading(false);
    }
  }, [startDate, endDate, companyId, regionId, statusScope]);

  const fetchEmpData = useCallback(async () => {
    setEmpLoading(true);
    try {
      const params: Record<string, string> = { statusScope };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (companyId) params.companyId = companyId;
      if (regionId) params.regionId = regionId;
      const res = await api.get('/reports/employee-spending', { params });
      setEmpData(res.data);
    } catch (err) {
      console.error('Failed to load employee spending report', err);
    } finally {
      setEmpLoading(false);
    }
  }, [startDate, endDate, companyId, regionId, statusScope]);

  // Refetch when filters change
  useEffect(() => {
    fetchRegionData();
    fetchEmpData();
  }, [fetchRegionData, fetchEmpData]);

  const handlePresetChange = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM') => {
    setPeriodPreset(preset);
    if (preset === 'THIS_MONTH') {
      const { startDate: s, endDate: e } = getThisMonthRange();
      setStartDate(s);
      setEndDate(e);
    } else if (preset === 'LAST_MONTH') {
      const { startDate: s, endDate: e } = getLastMonthRange();
      setStartDate(s);
      setEndDate(e);
    }
  };

  const handleExportCurrent = () => {
    const params = new URLSearchParams({ statusScope });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (companyId) params.append('companyId', companyId);
    if (regionId) params.append('regionId', regionId);
    const baseUrl = (api.defaults.baseURL || '').replace(/\/$/, '');

    if (activeTab === 'region') {
      window.open(`${baseUrl}/reports/export-region-budget-excel?${params.toString()}`, '_blank');
    } else {
      window.open(`${baseUrl}/reports/export-employee-spending-excel?${params.toString()}`, '_blank');
    }
  };

  const toggleRegionExpand = (id: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compute live aggregates from region rows
  const regionRows = regionData?.rows || [];
  const totalRegionBudget = regionRows.reduce((acc, r) => acc + (Number(r.regionBudget) || 0), 0);
  const totalRegionSpent = regionRows.reduce((acc, r) => acc + (Number(r.totalSpent) || 0), 0);
  const totalRegionRemaining = regionRows.reduce((acc, r) => acc + (Number(r.remainingBudget) || 0), 0);
  const totalRegionsCount = regionRows.length;

  // Filtered employees by search
  const filteredEmployees = useMemo(() => {
    if (!empData?.employees) return [];
    if (!empSearch.trim()) return empData.employees;
    const q = empSearch.toLowerCase().trim();
    return empData.employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        e.regionName.toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q)
    );
  }, [empData, empSearch]);

  const empSummary = empData?.summary || {
    totalEmployees: 0,
    totalRequests: 0,
    totalRequested: 0,
    totalApproved: 0,
    totalPaid: 0,
    totalPendingSettlementAmount: 0,
    totalPendingSettlementCount: 0,
  };

  return (
    <div className="space-y-4 font-sans pb-10">
      {/* ─── 1. HEADER SECTION ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 font-display">
            <BarChart3 className="h-5 w-5 text-[#F5B700]" />
            Budget &amp; User Reports
          </h2>
          <p className="text-xs text-muted-foreground">
            Regional budget remaining balances and per-employee cash advance &amp; spending summary
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchRegionData(); fetchEmpData(); }}
            disabled={regionLoading || empLoading}
            className="gap-1.5 text-xs h-8.5 font-medium cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regionLoading || empLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportCurrent}
            className="gap-1.5 text-xs h-8.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. EXECUTIVE FILTER HUB ─── */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-3.5 space-y-3">
          {/* Row 1: Period presets & date picker */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Segmented Period Controls */}
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 shrink-0">
              <button
                type="button"
                onClick={() => handlePresetChange('THIS_MONTH')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  periodPreset === 'THIS_MONTH'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('LAST_MONTH')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  periodPreset === 'LAST_MONTH'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => setPeriodPreset('CUSTOM')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  periodPreset === 'CUSTOM'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Unified Date Range Capsule */}
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 text-xs shrink-0 shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriodPreset('CUSTOM');
                }}
                className="bg-transparent text-xs font-medium focus:outline-none text-foreground cursor-pointer"
                title="Start Date"
              />
              <span className="text-muted-foreground text-xs font-bold px-0.5">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriodPreset('CUSTOM');
                }}
                className="bg-transparent text-xs font-medium focus:outline-none text-foreground cursor-pointer"
                title="End Date"
              />
            </div>

            {/* Company Filter (Super Admin only) */}
            {user?.role === 'SUPER_ADMIN' && (
              <div className="flex items-center gap-1.5 min-w-[150px] flex-1">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Select
                  value={companyId}
                  onChange={(e) => {
                    setCompanyId(e.target.value);
                    setRegionId('');
                  }}
                  className="text-xs h-8.5 font-medium"
                >
                  <option value="">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
            )}

            {/* Region Filter */}
            <div className="flex items-center gap-1.5 min-w-[150px] flex-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                className="text-xs h-8.5 font-medium"
              >
                <option value="">All Regions</option>
                {visibleRegions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </div>

            {/* Status Scope Filter */}
            <div className="flex items-center gap-1.5 min-w-[160px] flex-1">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select
                value={statusScope}
                onChange={(e) => setStatusScope(e.target.value)}
                className="text-xs h-8.5 font-medium"
              >
                <option value="APPROVED_AND_PAID">Approved &amp; Paid</option>
                <option value="PAID_ONLY">Paid Only</option>
                <option value="ALL">All Statuses</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 3. SEGMENTED REPORT TABS ─── */}
      <div className="flex items-center justify-between border-b border-border pb-1">
        <div className="inline-flex p-1 bg-muted/60 dark:bg-slate-900 rounded-xl border border-border gap-1">
          <button
            onClick={() => setActiveTab('region')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'region'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-primary" />
            <span>Regional Budget Limits</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4.5 bg-muted/50">
              {totalRegionsCount}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('employee')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'employee'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4 text-primary" />
            <span>Employee Spending</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4.5 bg-muted/50">
              {empSummary.totalEmployees}
            </Badge>
          </button>
        </div>

        {activeTab === 'employee' && (
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              placeholder="Search employee, phone..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {empSearch && (
              <button
                onClick={() => setEmpSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── 4. KPI STAT CARDS ─── */}
      {activeTab === 'region' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            title="Total Monthly Budget"
            value={`$${fmt(totalRegionBudget)}`}
            subtitle="Combined regional caps"
            icon={DollarSign}
            variant="blue"
          />
          <MetricCard
            title="Total Spent So Far"
            value={`$${fmt(totalRegionSpent)}`}
            subtitle="Expenses recorded"
            icon={TrendingUp}
            variant="amber"
          />
          <MetricCard
            title="Remaining Balance"
            value={`$${fmt(totalRegionRemaining)}`}
            subtitle="Available uncommitted limit"
            icon={TrendingDown}
            variant="emerald"
          />
          <MetricCard
            title="Active Regions"
            value={String(totalRegionsCount)}
            subtitle="Configured territories"
            icon={MapPin}
            variant="purple"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            title="Active Employees"
            value={String(empSummary.totalEmployees)}
            subtitle={`${empSummary.totalRequests} total requests`}
            icon={Users}
            variant="blue"
          />
          <MetricCard
            title="Total Approved"
            value={`$${fmt(empSummary.totalApproved)}`}
            subtitle={`Requested: $${fmt(empSummary.totalRequested)}`}
            icon={CheckCircle}
            variant="emerald"
          />
          <MetricCard
            title="Total Paid"
            value={`$${fmt(empSummary.totalPaid)}`}
            subtitle="Disbursed petty cash"
            icon={DollarSign}
            variant="blue"
          />
          <MetricCard
            title="Pending Settlement"
            value={`$${fmt(empSummary.totalPendingSettlementAmount)}`}
            subtitle={`${empSummary.totalPendingSettlementCount} advances unsettled`}
            icon={Clock}
            variant="amber"
          />
        </div>
      )}

      {/* ─── 5. TAB CONTENT: REGIONAL BUDGETS ─── */}
      {activeTab === 'region' && (
        <Card className="shadow-xs overflow-hidden">
          {regionLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading regional budget records...</span>
            </div>
          ) : regionRows.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No regional budget records found for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <th className="text-left px-4 py-3">Region</th>
                    <th className="text-left px-4 py-3">Company</th>
                    <th className="text-right px-4 py-3 font-mono">Monthly Budget</th>
                    <th className="text-right px-4 py-3 font-mono">Total Spent</th>
                    <th className="text-right px-4 py-3 font-mono">Remaining Balance</th>
                    <th className="px-4 py-3 min-w-[160px]">Budget Utilization</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="px-3 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {regionRows.map((row) => {
                    const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.SAFE;
                    const StatusIcon = cfg.icon;
                    const isOpen = expandedRegions.has(row.regionId);
                    const pct = Math.min(row.percentageUsed, 100);

                    const categoriesList = row.byCategory
                      ? Object.entries(row.byCategory)
                          .filter(([_, cat]) => cat.spent > 0 || cat.count > 0)
                          .map(([name, cat]) => ({ categoryName: name, total: cat.spent, count: cat.count }))
                      : [];
                    const hasCategories = categoriesList.length > 0;

                    return (
                      <React.Fragment key={row.regionId}>
                        <tr className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3 font-bold text-foreground">
                            {row.regionName}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="font-medium text-foreground">{row.companyName}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground font-semibold">
                            ${fmt(row.regionBudget)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                            ${fmt(row.totalSpent)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${fmt(row.remainingBudget)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden border border-border/40">
                                <div
                                  className={`h-full rounded-full transition-all ${cfg.bar}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-mono font-bold text-foreground w-10 text-right">
                                {row.percentageUsed}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${cfg.bg}`}
                            >
                              <StatusIcon className="w-3 h-3 shrink-0" />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            {hasCategories && (
                              <button
                                onClick={() => toggleRegionExpand(row.regionId)}
                                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                title="Expand category breakdown"
                              >
                                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Collapsible Expense Category Details */}
                        {isOpen && hasCategories && (
                          <tr className="bg-muted/30">
                            <td colSpan={8} className="px-6 py-3 border-t border-border/60">
                              <div className="space-y-1.5 max-w-lg">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Expense Category Breakdown ({row.regionName})
                                </p>
                                <div className="divide-y divide-border/60 bg-background rounded-lg border border-border p-2">
                                  {categoriesList.map((cat) => (
                                    <div key={cat.categoryName} className="flex items-center justify-between py-1 px-1.5 text-xs">
                                      <span className="text-muted-foreground font-medium">
                                        {cat.categoryName}{' '}
                                        {cat.count > 0 && (
                                          <span className="text-[10px] text-muted-foreground/80">
                                            ({cat.count} requests)
                                          </span>
                                        )}
                                      </span>
                                      <span className="font-mono font-bold text-foreground">
                                        ${fmt(cat.total)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ─── 6. TAB CONTENT: EMPLOYEE SPENDING ─── */}
      {activeTab === 'employee' && (
        <Card className="shadow-xs overflow-hidden">
          {empLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading employee spending records...</span>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No employee spending records matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <th className="text-left px-4 py-3">Employee Details</th>
                    <th className="text-left px-4 py-3">Region &amp; Dept</th>
                    <th className="text-center px-4 py-3">Requests</th>
                    <th className="text-right px-4 py-3 font-mono">Requested</th>
                    <th className="text-right px-4 py-3 font-mono">Approved</th>
                    <th className="text-right px-4 py-3 font-mono">Paid</th>
                    <th className="text-right px-4 py-3 font-mono">Pending Settlement</th>
                    <th className="text-center px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.userId} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground text-xs">{emp.fullName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {emp.username} · {emp.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground text-xs">{emp.regionName}</div>
                        <div className="text-[11px] text-muted-foreground">{emp.departmentName}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5">
                          {emp.totalRequests}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        ${fmt(emp.totalRequested)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        ${fmt(emp.totalApproved)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ${fmt(emp.totalPaid)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {emp.pendingSettlementCount > 0 ? (
                          <div>
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                              ${fmt(emp.pendingSettlementAmount)}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {emp.pendingSettlementCount} advance(s)
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-mono">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setDrillEmployee(emp)}
                          className="gap-1 h-7 px-2.5 text-xs font-semibold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          <span>View History</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ─── 7. EMPLOYEE DRILL-DOWN HISTORY MODAL ─── */}
      {drillEmployee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0"
          onClick={() => setDrillEmployee(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {drillEmployee.fullName} — Request History
                </h3>
                <p className="text-xs text-muted-foreground">
                  {drillEmployee.companyName} · {drillEmployee.regionName} · {drillEmployee.departmentName}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDrillEmployee(null)}
                className="cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick Stat Summary Strip */}
            <div className="grid grid-cols-3 divide-x divide-border bg-muted/20 border-b border-border">
              <div className="p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Requested</span>
                <span className="font-mono font-bold text-foreground text-sm">${fmt(drillEmployee.totalRequested)}</span>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Approved</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">${fmt(drillEmployee.totalApproved)}</span>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pending Settlement</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">${fmt(drillEmployee.pendingSettlementAmount)}</span>
              </div>
            </div>

            {/* Requests List */}
            <div className="overflow-y-auto flex-1 p-3">
              {drillEmployee.requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-xs">No specific requests on record.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                      <th className="text-left px-3 py-2 font-mono">Ref #</th>
                      <th className="text-left px-3 py-2">Purpose</th>
                      <th className="text-right px-3 py-2 font-mono">Requested</th>
                      <th className="text-right px-3 py-2 font-mono">Approved</th>
                      <th className="text-center px-3 py-2">Status</th>
                      <th className="text-right px-3 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {drillEmployee.requests.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono font-bold text-primary">{r.requestNumber}</td>
                        <td className="px-3 py-2 text-foreground font-medium max-w-[220px] truncate">{r.purpose}</td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">${fmt(r.requestedAmount)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-blue-600 dark:text-blue-400">${fmt(r.approvedAmount)}</td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              REQ_STATUS_COLORS[r.status] || 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {REQ_STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
