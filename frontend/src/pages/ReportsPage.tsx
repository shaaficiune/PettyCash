import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileSpreadsheet,
  FileText,
  Search,
  RefreshCw,
  Printer,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  UserPlus,
  UserCog,
  UserX,
  Trash2,
  Eye,
  Banknote,
  RotateCcw,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Audit Log Config (for Super Admin audit tab)
───────────────────────────────────────────── */
const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  LOGIN:           { label: 'Login',            icon: <LogIn className="h-3 w-3" />,       bg: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40',  text: 'text-emerald-700 dark:text-emerald-300' },
  LOGOUT:          { label: 'Logout',           icon: <LogOut className="h-3 w-3" />,      bg: 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',                  text: 'text-slate-600 dark:text-slate-400' },
  CREATE_USER:     { label: 'User Created',     icon: <UserPlus className="h-3 w-3" />,    bg: 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40',                  text: 'text-sky-700 dark:text-sky-300' },
  UPDATE_USER:     { label: 'User Updated',     icon: <UserCog className="h-3 w-3" />,     bg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40',          text: 'text-amber-700 dark:text-amber-300' },
  DISABLE_USER:    { label: 'User Deleted',     icon: <UserX className="h-3 w-3" />,       bg: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40',              text: 'text-rose-700 dark:text-rose-300' },
  DELETE_USER:     { label: 'User Deleted',     icon: <UserX className="h-3 w-3" />,       bg: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40',              text: 'text-rose-700 dark:text-rose-300' },
  CREATE_REQUEST:  { label: 'Request Created',  icon: <FileText className="h-3 w-3" />,    bg: 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40',              text: 'text-blue-700 dark:text-blue-300' },
  UPDATE_REQUEST:  { label: 'Request Updated',  icon: <FileText className="h-3 w-3" />,    bg: 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40',                  text: 'text-sky-700 dark:text-sky-300' },
  DELETE_REQUEST:  { label: 'Request Deleted',  icon: <Trash2 className="h-3 w-3" />,      bg: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40',              text: 'text-rose-700 dark:text-rose-300' },
  APPROVE_REQUEST: { label: 'Request Approved', icon: <CheckCircle2 className="h-3 w-3" />, bg: 'bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/40',              text: 'text-teal-700 dark:text-teal-300' },
  REJECT_REQUEST:  { label: 'Request Rejected', icon: <XCircle className="h-3 w-3" />,     bg: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40',              text: 'text-rose-700 dark:text-rose-300' },
  RECORD_PAYMENT:  { label: 'Payment Recorded', icon: <Banknote className="h-3 w-3" />,    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40',  text: 'text-emerald-700 dark:text-emerald-300' },
  RESET_PASSWORD:  { label: 'Password Reset',   icon: <RefreshCw className="h-3 w-3" />,   bg: 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/40',      text: 'text-orange-700 dark:text-orange-300' },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] ?? {
    label: action.replace(/_/g, ' '),
    icon: <Eye className="h-3 w-3" />,
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
  };
}

function parseMetaInfo(details: string): string {
  if (!details) return '';
  try {
    const d = JSON.parse(details);
    const body = d.body && typeof d.body === 'object' ? d.body : {};
    const ok = d.responseStatus === 'SUCCESS';
    if (body.status && body.approvedAmount !== undefined)
      return `${ok ? 'Approved' : 'Reviewed'} — amount set to $${body.approvedAmount}`;
    if (body.status) return `Status changed to ${body.status}`;
    if (body.approvedAmount !== undefined) return `Approved amount: $${body.approvedAmount}`;
    if (body.purpose && body.requestedAmount)
      return `"${body.purpose}" — $${body.requestedAmount} ${body.currency || ''}`.trim();
    if (body.purpose) return body.purpose;
    if (body.fullName && body.username) return `${body.fullName} (@${body.username})`;
    if (body.fullName) return body.fullName;
    if (body.comments && body.comments.trim()) return body.comments;
    return ok ? 'Completed successfully' : '';
  } catch {
    return '';
  }
}

/* ─────────────────────────────────────────────
   Date Preset Helpers
───────────────────────────────────────────── */
function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getPresetDates(preset: string): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case 'TODAY':
      return { start: toDateStr(now), end: toDateStr(now) };
    case 'THIS_MONTH':
      return { start: toDateStr(new Date(y, m, 1)), end: toDateStr(new Date(y, m + 1, 0)) };
    case 'LAST_MONTH':
      return { start: toDateStr(new Date(y, m - 1, 1)), end: toDateStr(new Date(y, m, 0)) };
    case 'THIS_QUARTER': {
      const q = Math.floor(m / 3);
      return { start: toDateStr(new Date(y, q * 3, 1)), end: toDateStr(new Date(y, q * 3 + 3, 0)) };
    }
    case 'YTD':
      return { start: toDateStr(new Date(y, 0, 1)), end: toDateStr(now) };
    case 'ALL_TIME':
      return { start: '', end: '' };
    default:
      return { start: toDateStr(new Date(y, m, 1)), end: toDateStr(new Date(y, m + 1, 0)) };
  }
}

/* ─────────────────────────────────────────────
   Status Badge Helper
───────────────────────────────────────────── */
function RequestStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    PAID:                 { bg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300', text: 'text-emerald-700', label: 'Paid' },
    COMPLETED:            { bg: 'bg-teal-100 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300',             text: 'text-teal-700',    label: 'Completed' },
    APPROVED:             { bg: 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300',             text: 'text-blue-700',    label: 'Approved' },
    PAYMENT_PROCESSING:   { bg: 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300',     text: 'text-purple-700',  label: 'Processing' },
    PENDING_APPROVAL:     { bg: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300',         text: 'text-amber-700',   label: 'Pending' },
    ACCOUNTANT_REVIEW:    { bg: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300',     text: 'text-indigo-700',  label: 'Review' },
    CORRECTION_REQUIRED:  { bg: 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300',     text: 'text-orange-700',  label: 'Correction' },
    REJECTED:             { bg: 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300',             text: 'text-rose-700',    label: 'Rejected' },
    DRAFT:                { bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',             text: 'text-slate-600',   label: 'Draft' },
  };

  const c = map[status] || { bg: 'bg-slate-100 text-slate-700', text: 'text-slate-600', label: status };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${c.bg}`}>
      {c.label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Main Reports Page Component
───────────────────────────────────────────── */
export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Active Main Tab
  const [mainTab, setMainTab] = useState<'financial' | 'audit'>('financial');

  // Filter States
  const [preset, setPreset]             = useState<string>('THIS_MONTH');
  const [customStart, setCustomStart]   = useState<string>('');
  const [customEnd, setCustomEnd]       = useState<string>('');
  const [companyId, setCompanyId]       = useState<string>('ALL');
  const [regionId, setRegionId]         = useState<string>('ALL');
  const [budgetHeadId, setBudgetHeadId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('PAID_ONLY');
  const [searchQuery, setSearchQuery]   = useState<string>('');
  const [page, setPage]                 = useState<number>(1);
  const [pageSize, setPageSize]         = useState<number>(25);

  // Metadata dropdown options
  const [companies, setCompanies]       = useState<any[]>([]);
  const [regions, setRegions]           = useState<any[]>([]);
  const [budgetHeads, setBudgetHeads]   = useState<any[]>([]);

  // Report Data State
  const [reportData, setReportData]     = useState<{
    summary: {
      totalCount: number;
      totalRequested: number;
      totalDisbursed: number;
      somtelSpent: number;
      bluekomSpent: number;
      paidCount: number;
      pendingCount: number;
    };
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    items: any[];
  } | null>(null);

  const [loading, setLoading]           = useState<boolean>(true);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);

  // Audit trail state
  const [auditLogs, setAuditLogs]       = useState<any[]>([]);
  const [auditSearch, setAuditSearch]   = useState<string>('');
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  // Fetch filter options (Companies, Regions, Budget Heads) on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [compRes, regRes, bhRes] = await Promise.all([
          api.get('/companies').catch(() => ({ data: [] })),
          api.get('/companies/regions').catch(() => ({ data: [] })),
          api.get('/companies/budget-heads').catch(() => ({ data: [] })),
        ]);
        setCompanies(Array.isArray(compRes.data) ? compRes.data : []);
        setRegions(Array.isArray(regRes.data) ? regRes.data : []);
        setBudgetHeads(Array.isArray(bhRes.data) ? bhRes.data : []);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    };
    fetchOptions();
  }, []);

  // Compute effective date range
  const getDateRange = useCallback(() => {
    if (preset === 'CUSTOM') {
      return { start: customStart, end: customEnd };
    }
    return getPresetDates(preset);
  }, [preset, customStart, customEnd]);

  // Build query params for report and exports
  const buildParams = useCallback((pageOverride?: number) => {
    const { start, end } = getDateRange();
    const params = new URLSearchParams();

    if (start) params.set('startDate', start);
    if (end)   params.set('endDate', end);

    // Global session company filter or local select
    const globalCompany = sessionStorage.getItem('companyFilter') || 'ALL';
    const activeCompany = companyId !== 'ALL' ? companyId : globalCompany;
    if (activeCompany !== 'ALL') params.set('companyId', activeCompany);

    if (regionId !== 'ALL') params.set('regionId', regionId);
    if (budgetHeadId !== 'ALL') params.set('budgetHeadId', budgetHeadId);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    params.set('page', String(pageOverride || page));
    params.set('pageSize', String(pageSize));

    return params;
  }, [getDateRange, companyId, regionId, budgetHeadId, statusFilter, searchQuery, page, pageSize]);

  // Load report data from backend
  const loadReport = useCallback(async (targetPage?: number) => {
    setLoading(true);
    try {
      const params = buildParams(targetPage);
      const res = await api.get(`/reports/table?${params.toString()}`);
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to load table report:', err);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Reload when filters change
  useEffect(() => {
    if (mainTab === 'financial') {
      loadReport(1);
      setPage(1);
    }
  }, [preset, customStart, customEnd, companyId, regionId, budgetHeadId, statusFilter, pageSize]);

  // Handle live search with debounce
  useEffect(() => {
    if (mainTab !== 'financial') return;
    const timer = setTimeout(() => {
      loadReport(1);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (reportData && newPage > reportData.totalPages)) return;
    setPage(newPage);
    loadReport(newPage);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setPreset('THIS_MONTH');
    setCustomStart('');
    setCustomEnd('');
    setCompanyId('ALL');
    setRegionId('ALL');
    setBudgetHeadId('ALL');
    setStatusFilter('PAID_ONLY');
    setSearchQuery('');
    setPage(1);
  };

  // Export Excel
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const params = buildParams();
      
      const res = await api.get(`/reports/export-excel?${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `petty_cash_report_${new Date().toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel export error:', err);
    } finally {
      setExportingExcel(false);
    }
  };

  // Export PDF / Print
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const params = buildParams();
      const printWindow = window.open('about:blank', '_blank');
      if (!printWindow) {
        alert('Please allow popups to view and print the report.');
        return;
      }
      const res = await api.get(`/reports/export-pdf?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(res.data);
      printWindow.location.href = url;
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  // Load audit logs for super admin
  const loadAuditLogs = async () => {
    if (!isSuperAdmin) return;
    setAuditLoading(true);
    try {
      const res = await api.get('/reports/audit-logs');
      setAuditLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Audit logs load failed:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'audit' && isSuperAdmin) {
      loadAuditLogs();
    }
  }, [mainTab, isSuperAdmin]);

  const filteredAudits = auditLogs.filter((log) =>
    log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    (log.user?.fullName && log.user.fullName.toLowerCase().includes(auditSearch.toLowerCase())) ||
    (log.details && log.details.toLowerCase().includes(auditSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-sans">
      {/* ──────────────── Header & Main Navigation ──────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Financial &amp; Expense Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full transaction details, multi-level filters, and export options
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="report-export-excel-btn"
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Download formatted Excel spreadsheet"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exportingExcel ? 'Exporting...' : 'Export Excel'}
          </button>

          <button
            id="report-export-pdf-btn"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Open printable PDF report"
          >
            <Printer className="h-4 w-4" />
            {exportingPdf ? 'Preparing...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Tabs (Financial Report vs System Audit Trail) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          id="tab-financial-report"
          onClick={() => setMainTab('financial')}
          className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            mainTab === 'financial'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Financial Report
        </button>

        {isSuperAdmin && (
          <button
            id="tab-audit-trail"
            onClick={() => setMainTab('audit')}
            className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              mainTab === 'audit'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            System Audit Trail
          </button>
        )}
      </div>

      {mainTab === 'financial' ? (
        <div className="space-y-3">
          {/* ──────────────── Dashboard Sare (Slim KPI Strip) ──────────────── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-2 shadow-xs flex flex-wrap items-center justify-between gap-y-2 gap-x-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 text-xs transition-colors">
            {/* Total Disbursed */}
            <div className="flex items-center gap-2 pr-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Total Disbursed</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  ${reportData?.summary?.totalDisbursed?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
                </span>
              </div>
            </div>

            {/* Somtel Spent */}
            <div className="flex items-center gap-2 px-3">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400 block leading-tight">Somtel</span>
                <span className="text-sm font-bold text-orange-700 dark:text-orange-300 leading-tight">
                  ${reportData?.summary?.somtelSpent?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00'}
                </span>
              </div>
            </div>

            {/* Bluekom Spent */}
            <div className="flex items-center gap-2 px-3">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block leading-tight">Bluekom</span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300 leading-tight">
                  ${reportData?.summary?.bluekomSpent?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00'}
                </span>
              </div>
            </div>

            {/* Total Requests */}
            <div className="flex items-center gap-2 px-3">
              <FileText className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Requests</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {reportData?.summary?.totalCount ?? 0}
                </span>
              </div>
            </div>

            {/* Pending */}
            <div className="flex items-center gap-2 pl-3">
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block leading-tight">Pending</span>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300 leading-tight">
                  {reportData?.summary?.pendingCount ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* ──────────────── Single-Row Integrated Toolbar ──────────────── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-xs flex flex-wrap items-center gap-2 transition-colors">
            {/* Search */}
            <div className="relative flex-1 min-w-[170px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                id="report-search-input"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 placeholder-slate-400 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Period Preset */}
            <select
              id="filter-period-preset"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            >
              <option value="TODAY">Today</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="THIS_QUARTER">This Quarter</option>
              <option value="YTD">YTD</option>
              <option value="ALL_TIME">All Time</option>
              <option value="CUSTOM">Custom Range</option>
            </select>

            {/* Company Filter */}
            <select
              id="filter-company"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Region Filter */}
            <select
              id="filter-region"
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer max-w-[150px]"
            >
              <option value="ALL">All Regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.company?.name ? `(${r.company.name})` : ''}
                </option>
              ))}
            </select>

            {/* Budget Head Filter */}
            <select
              id="filter-budget-head"
              value={budgetHeadId}
              onChange={(e) => setBudgetHeadId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer max-w-[170px]"
            >
              <option value="ALL">All Budget Heads</option>
              {budgetHeads.map((bh) => (
                <option key={bh.id} value={bh.id}>
                  {bh.code ? `[${bh.code}] ` : ''}{bh.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            >
              <option value="PAID_ONLY">Disbursed (Paid)</option>
              <option value="APPROVED_AND_PAID">Approved &amp; Paid</option>
              <option value="ALL">All Statuses</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="ACCOUNTANT_REVIEW">Accountant Review</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Reset */}
            <button
              id="report-reset-btn"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>

            {/* Custom Range (shown only if preset === 'CUSTOM') */}
            {preset === 'CUSTOM' && (
              <div className="flex items-center gap-2 w-full pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 font-medium text-[11px]">Dates:</span>
                <input
                  type="date"
                  id="filter-custom-start"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  id="filter-custom-end"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* ──────────────── Table Caadi Ah (Standard Data Table) ──────────────── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            {/* Table Header Bar */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Petty Cash Records
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Showing {reportData?.items?.length ?? 0} of {reportData?.total ?? 0} filtered records
                </p>
              </div>

              {/* Items per page selector */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-left">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Voucher #
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Region
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Budget Head
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider max-w-xs">
                      Purpose
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                      Requested ($)
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                      Disbursed ($)
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-16">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-primary" />
                          <span className="text-xs text-slate-400 font-medium">Loading report records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !reportData || reportData.items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-16 text-slate-400 text-xs">
                        <div className="max-w-xs mx-auto space-y-1">
                          <p className="font-semibold text-slate-600 dark:text-slate-300">No records found</p>
                          <p className="text-[11px] text-slate-400">
                            Try adjusting the date range, company, region, or status filters.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    reportData.items.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Voucher # */}
                        <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {row.requestNumber}
                        </td>

                        {/* Date */}
                        <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(row.requestDate).toLocaleDateString([], {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Employee */}
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          <div>{row.employeeName}</div>
                          {row.receiverName && (
                            <div className="text-[10px] text-slate-400">
                              &rarr; {row.receiverName}
                            </div>
                          )}
                        </td>

                        {/* Company */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.companyName.toLowerCase().includes('somtel')
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            }`}
                          >
                            {row.companyName}
                          </span>
                        </td>

                        {/* Region */}
                        <td className="px-3 py-3 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {row.regionName}
                        </td>

                        {/* Budget Head (Category) */}
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {row.budgetHeadCode ? (
                            <span className="font-mono text-[10px] font-semibold text-slate-400 mr-1">
                              [{row.budgetHeadCode}]
                            </span>
                          ) : null}
                          {row.budgetHeadName}
                        </td>

                        {/* Purpose */}
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={row.purpose}>
                          {row.purpose}
                        </td>

                        {/* Requested Amount */}
                        <td className="px-3 py-3 text-right font-medium text-slate-500 whitespace-nowrap">
                          ${row.requestedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Disbursed Amount */}
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {row.approvedAmount !== null ? (
                            `$${row.approvedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <RequestStatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Table Footer with Summary Totals */}
                {reportData && reportData.items.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-bold">
                      <td colSpan={7} className="px-4 py-3 text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider text-right">
                        Filtered Totals:
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-slate-600 dark:text-slate-300">
                        ${reportData.summary.totalRequested.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                        ${reportData.summary.totalDisbursed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center text-[10px] text-slate-400">
                        {reportData.total} items
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination Controls */}
            {reportData && reportData.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Page {reportData.page} of {reportData.totalPages}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {page} / {reportData.totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= reportData.totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ──────────────── System Audit Trail Tab ──────────────── */
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none h-4 w-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="audit-search-input"
                placeholder="Search audit logs..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {filteredAudits.length} events
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            {auditLoading ? (
              <div className="py-16 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
              </div>
            ) : filteredAudits.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">No audit events found.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredAudits.map((log) => {
                  const cfg = getActionConfig(log.action);
                  const meta = parseMetaInfo(log.details);
                  const time = new Date(log.createdAt);
                  return (
                    <div
                      key={log.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[10px] whitespace-nowrap shrink-0 ${cfg.bg} ${cfg.text}`}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </div>

                      <div className="flex items-center gap-1.5 min-w-[120px] shrink-0">
                        {log.user ? (
                          <>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {log.user.fullName}
                            </span>
                            <span className="text-[10px] text-slate-400 hidden sm:block">
                              @{log.user.username}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Anonymous</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {meta ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {meta}
                          </p>
                        ) : null}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {time.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
