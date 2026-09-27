import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  FileSpreadsheet, Search, LogIn, LogOut, UserPlus, UserCog, UserX,
  FileText, CheckCircle, XCircle, Banknote, RefreshCw, Trash2, Eye,
  TrendingUp, AlertTriangle, ChevronDown, ChevronRight, X,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Audit-log helpers
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
  APPROVE_REQUEST: { label: 'Request Approved', icon: <CheckCircle className="h-3 w-3" />, bg: 'bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/40',              text: 'text-teal-700 dark:text-teal-300' },
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
   Budget Head Report Types
───────────────────────────────────────────── */
interface BudgetCategory {
  categoryName: string;
  somtelSpent: number;
  somtelCount: number;
  somtelBudget: number;
  bluekomSpent: number;
  bluekomCount: number;
  bluekomBudget: number;
  totalSpent: number;
  totalBudget: number;
  remainingBudget: number;
  percentageUsed: number;
  status: 'SAFE' | 'WARNING' | 'EXCEEDED';
  requestsCount: number;
  requests: any[];
}

interface BudgetReport {
  period: { startDate: string | null; endDate: string | null; statusScope: string };
  summary: {
    totalBudget: number;
    somtelSpent: number;
    bluekomSpent: number;
    grandTotalSpent: number;
    remainingBudget: number;
    percentageUsed: number;
  };
  categories: BudgetCategory[];
}

/* ─────────────────────────────────────────────
   Utility: date preset helpers
───────────────────────────────────────────── */
function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getPresetDates(preset: string): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
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
    default:
      return { start: toDateStr(new Date(y, m, 1)), end: toDateStr(new Date(y, m + 1, 0)) };
  }
}

/* ─────────────────────────────────────────────
   Status badge helper
───────────────────────────────────────────── */
function StatusBadge({ status }: { status: 'SAFE' | 'WARNING' | 'EXCEEDED' }) {
  const map = {
    SAFE:     { cls: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300', label: 'Safe' },
    WARNING:  { cls: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',         label: 'Warning' },
    EXCEEDED: { cls: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',              label: 'Exceeded' },
  };
  const { cls, label } = map[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{label}</span>;
}

/* ─────────────────────────────────────────────
   Drill-Down Modal
───────────────────────────────────────────── */
function DrillDownModal({ category, onClose }: { category: BudgetCategory; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{category.categoryName}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{category.requestsCount} requests &bull; ${category.totalSpent.toLocaleString()} spent</p>
          </div>
          <button
            onClick={onClose}
            id="modal-close-btn"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 grid grid-cols-2 gap-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200/50 dark:border-orange-800/30">
            <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Somtel</p>
            <p className="text-lg font-bold text-orange-700 dark:text-orange-300">${category.somtelSpent.toLocaleString()}</p>
            <p className="text-[10px] text-orange-500">{category.somtelCount} requests</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Bluekom</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">${category.bluekomSpent.toLocaleString()}</p>
            <p className="text-[10px] text-blue-500">{category.bluekomCount} requests</p>
          </div>
        </div>

        <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
          {category.requests.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">No transactions in this period.</p>
          ) : (
            category.requests.map((r: any) => (
              <div key={r.id} className="px-6 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{r.purpose}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {r.employee}{r.receiver ? ` \u2192 ${r.receiver}` : ''} &bull; {r.companyName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(r.date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })} &bull; {r.requestNumber}
                    </p>
                  </div>
                  <span className="ml-3 font-bold text-sm text-slate-900 dark:text-white shrink-0">
                    ${Number(r.amount).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Budget Head Report Tab
───────────────────────────────────────────── */
function BudgetHeadReportTab() {
  const [preset, setPreset]           = useState('THIS_MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');
  const [statusScope, setStatusScope] = useState('PAID_ONLY');
  const [report, setReport]           = useState<BudgetReport | null>(null);
  const [loading, setLoading]         = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [drillCategory, setDrillCategory] = useState<BudgetCategory | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = preset === 'CUSTOM'
        ? { start: customStart, end: customEnd }
        : getPresetDates(preset);

      const params = new URLSearchParams({ statusScope });
      if (start) params.set('startDate', start);
      if (end)   params.set('endDate', end);

      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      if (companyFilter !== 'ALL') params.set('companyId', companyFilter);

      const res = await api.get(`/reports/budget-heads?${params.toString()}`);
      setReport(res.data);
    } catch (e) {
      console.error('Failed to load budget head report', e);
    } finally {
      setLoading(false);
    }
  }, [preset, customStart, customEnd, statusScope]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const handleExcelExport = () => {
    const { start, end } = preset === 'CUSTOM'
      ? { start: customStart, end: customEnd }
      : getPresetDates(preset);

    const params = new URLSearchParams({
      token: localStorage.getItem('accessToken') || '',
      statusScope,
    });
    if (start) params.set('startDate', start);
    if (end)   params.set('endDate', end);

    const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
    if (companyFilter !== 'ALL') params.set('companyId', companyFilter);

    window.open(`/api/reports/export-budget-heads-excel?${params.toString()}`);
  };

  const toggleRow = (name: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const chartData = (report?.categories || []).map(c => ({
    name: c.categoryName.length > 14 ? c.categoryName.slice(0, 14) + '\u2026' : c.categoryName,
    Somtel:  c.somtelSpent,
    Bluekom: c.bluekomSpent,
  }));

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Controls bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm flex flex-wrap gap-3 items-center justify-between transition-colors">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <select
              id="bh-period-preset"
              value={preset}
              onChange={e => setPreset(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="THIS_QUARTER">This Quarter</option>
              <option value="YTD">Year to Date</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>

          {preset === 'CUSTOM' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                id="bh-custom-start"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="pl-3 pr-2 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                id="bh-custom-end"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="pl-3 pr-2 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          <div className="relative">
            <select
              id="bh-status-scope"
              value={statusScope}
              onChange={e => setStatusScope(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="PAID_ONLY">Actual Disbursed (Paid)</option>
              <option value="APPROVED_AND_PAID">Include Approved (Committed)</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <button
          id="bh-export-excel"
          onClick={handleExcelExport}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-teal-500/10 cursor-pointer transition-colors"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export Excel
        </button>
      </div>

      {report && (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm transition-colors">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Total Budget</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">${report.summary.totalBudget.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-1">All categories combined</p>
            </div>

            <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/30 rounded-xl shadow-sm transition-colors">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500 mb-2">Somtel Spent</p>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-300">${report.summary.somtelSpent.toLocaleString()}</p>
              <p className="text-[10px] text-orange-400 mt-1">
                {report.summary.totalBudget > 0
                  ? ((report.summary.somtelSpent / report.summary.totalBudget) * 100).toFixed(1)
                  : '0'}% of total budget
              </p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30 rounded-xl shadow-sm transition-colors">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-2">Bluekom Spent</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">${report.summary.bluekomSpent.toLocaleString()}</p>
              <p className="text-[10px] text-blue-400 mt-1">
                {report.summary.totalBudget > 0
                  ? ((report.summary.bluekomSpent / report.summary.totalBudget) * 100).toFixed(1)
                  : '0'}% of total budget
              </p>
            </div>

            <div className={`p-4 rounded-xl shadow-sm border transition-colors ${
              report.summary.percentageUsed >= 100
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30'
                : report.summary.percentageUsed >= 80
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/30'
                  : 'bg-teal-50 dark:bg-teal-950/30 border-teal-200/50 dark:border-teal-800/30'
            }`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-500 mb-2">Group Total</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">${report.summary.grandTotalSpent.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      report.summary.percentageUsed >= 100 ? 'bg-rose-500' :
                      report.summary.percentageUsed >= 80  ? 'bg-amber-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${Math.min(100, report.summary.percentageUsed)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                  {report.summary.percentageUsed}%
                </span>
              </div>
            </div>
          </div>

          {/* Grouped Bar Chart */}
          {chartData.length > 0 && (
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm transition-colors">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Expenditure by Category
                </h3>
                <div className="flex items-center gap-4 text-[10px] font-semibold">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" /> Somtel</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" /> Bluekom</span>
                </div>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barCategoryGap="25%" barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      formatter={(val: number, name: string) => [`$${val.toLocaleString()}`, name]}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="Somtel"  fill="#ea580c" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Bluekom" fill="#2563eb" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Comparative Matrix Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Comparative Matrix</h3>
              <p className="text-[10px] text-slate-400">Click any row to drill down</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-6" />
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-orange-400 uppercase tracking-wider">Somtel</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-blue-400 uppercase tracking-wider">Bluekom</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Spent</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[120px]">Utilization</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {report.categories.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                        No data available for the selected period.
                      </td>
                    </tr>
                  ) : (
                    report.categories.map((cat) => (
                      <React.Fragment key={cat.categoryName}>
                        <tr
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors cursor-pointer"
                          onClick={() => setDrillCategory(cat)}
                        >
                          <td className="px-4 py-3 text-slate-400">
                            <button
                              className="cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); toggleRow(cat.categoryName); }}
                              id={`bh-expand-${cat.categoryName.replace(/\s+/g, '-')}`}
                            >
                              {expandedRows.has(cat.categoryName)
                                ? <ChevronDown className="h-3 w-3" />
                                : <ChevronRight className="h-3 w-3" />
                              }
                            </button>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                            {cat.categoryName}
                            <span className="ml-1.5 text-[9px] text-slate-400 font-normal">({cat.requestsCount})</span>
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400 font-semibold">
                            ${cat.somtelSpent.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-semibold">
                            ${cat.bluekomSpent.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                            ${cat.totalSpent.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                            ${cat.totalBudget.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                            ${cat.remainingBudget.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    cat.status === 'EXCEEDED' ? 'bg-rose-500' :
                                    cat.status === 'WARNING'  ? 'bg-amber-500' : 'bg-teal-500'
                                  }`}
                                  style={{ width: `${Math.min(100, cat.percentageUsed)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 shrink-0 w-9 text-right">
                                {cat.percentageUsed}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={cat.status} />
                          </td>
                        </tr>

                        {expandedRows.has(cat.categoryName) && (
                          <tr>
                            <td colSpan={9} className="p-0">
                              <div className="bg-slate-50/70 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/40">
                                {cat.requests.length === 0 ? (
                                  <p className="text-[10px] text-slate-400 text-center py-4">No requests.</p>
                                ) : (
                                  cat.requests.slice(0, 8).map((r: any) => (
                                    <div key={r.id} className="flex items-center gap-3 px-8 py-2.5 text-[10px]">
                                      <span className="font-mono text-slate-400 w-24 shrink-0">{r.requestNumber}</span>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex-1 truncate">{r.purpose}</span>
                                      <span className={`font-semibold shrink-0 ${r.companyName?.toLowerCase().includes('somtel') ? 'text-orange-500' : 'text-blue-500'}`}>
                                        {r.companyName}
                                      </span>
                                      <span className="text-slate-400 shrink-0">{new Date(r.date).toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                                      <span className="font-bold text-slate-900 dark:text-white shrink-0">${Number(r.amount).toLocaleString()}</span>
                                    </div>
                                  ))
                                )}
                                {cat.requests.length > 8 && (
                                  <div className="px-8 py-2 text-[10px] text-slate-400">
                                    and {cat.requests.length - 8} more.{' '}
                                    <button onClick={() => setDrillCategory(cat)} className="text-primary underline cursor-pointer">View all</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>

                {report.categories.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100 text-xs">Grand Total</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600 dark:text-orange-400">
                        ${report.summary.somtelSpent.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                        ${report.summary.bluekomSpent.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                        ${report.summary.grandTotalSpent.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-500">
                        ${report.summary.totalBudget.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-500">
                        ${report.summary.remainingBudget.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${report.summary.percentageUsed >= 100 ? 'bg-rose-500' : report.summary.percentageUsed >= 80 ? 'bg-amber-500' : 'bg-teal-500'}`}
                              style={{ width: `${Math.min(100, report.summary.percentageUsed)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 w-9 text-right">
                            {report.summary.percentageUsed}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TrendingUp className="h-3.5 w-3.5 text-teal-500" />
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Warning alerts */}
          {report.categories.some(c => c.status !== 'SAFE') && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-bold">Budget Alert: </span>
                {report.categories.filter(c => c.status !== 'SAFE').map(c => c.categoryName).join(', ')}
                {report.categories.some(c => c.status === 'EXCEEDED') ? ' has exceeded budget limits.' : ' is approaching budget limits.'}
              </div>
            </div>
          )}
        </>
      )}

      {drillCategory && <DrillDownModal category={drillCategory} onClose={() => setDrillCategory(null)} />}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [breakdown, setBreakdown] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'budget-heads' | 'audit'>('analytics');
  const [auditSearch, setAuditSearch] = useState('');

  const loadReportingData = async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const companyQuery = companyFilter !== 'ALL' ? `?companyId=${companyFilter}` : '';
      const [breakdownRes] = await Promise.all([api.get(`/reports/breakdowns${companyQuery}`)]);
      setBreakdown(breakdownRes.data);
      if (user?.role === 'SUPER_ADMIN') {
        const auditRes = await api.get('/reports/audit-logs');
        setAuditLogs(auditRes.data);
      }
    } catch (e) {
      console.error('Failed to load reports', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportingData();
    window.addEventListener('companyFilterChanged', loadReportingData);
    return () => { window.removeEventListener('companyFilterChanged', loadReportingData); };
  }, []);

  const handleExportCSV = () => {
    const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
    const companyQuery = companyFilter !== 'ALL' ? `&companyId=${companyFilter}` : '';
    window.open(`/api/reports/export-csv?token=${localStorage.getItem('accessToken')}${companyQuery}`);
  };

  const filteredAudits = auditLogs.filter(log =>
    log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    (log.user?.fullName && log.user.fullName.toLowerCase().includes(auditSearch.toLowerCase())) ||
    (log.details && log.details.toLowerCase().includes(auditSearch.toLowerCase()))
  );

  const COLORS = ['#0a2e2e', '#E8A020', '#0d9488', '#ea580c', '#059669'];

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAccountant = user?.role === 'ACCOUNTANT';

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Reporting &amp; Audits</h2>
          <p className="text-xs text-slate-500">Financial statistics, exports, and audit history</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export All Requests (CSV)
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          id="tab-analytics"
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          Expense Analytics
        </button>

        {(isSuperAdmin || isAccountant) && (
          <button
            id="tab-budget-heads"
            onClick={() => setActiveTab('budget-heads')}
            className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'budget-heads'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            Budget Head Report
          </button>
        )}

        {isSuperAdmin && (
          <button
            id="tab-audit"
            onClick={() => setActiveTab('audit')}
            className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            System Audit Trail
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'budget-heads' ? (
        <BudgetHeadReportTab />
      ) : loading ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto" />
        </div>
      ) : activeTab === 'analytics' ? (
        <div className="space-y-6">
          {breakdown && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm transition-colors">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-6">Disbursed Spends by Department</h3>
                <div className="h-64">
                  {breakdown.department?.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-20">No departmental spend recorded</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={breakdown.department}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm transition-colors">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-6">Expense Split by Company</h3>
                <div className="h-64">
                  {breakdown.company?.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-20">No company spends recorded</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={breakdown.company} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                          {breakdown.company.map((_entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}

          {breakdown && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm transition-colors">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Departmental spend summary</h3>
                <div className="space-y-3">
                  {breakdown.department?.map((d: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800/40 pb-2 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{d.name}</span>
                      <span className="font-bold text-slate-900 dark:text-white">${d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm transition-colors">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Top Employee expenditures</h3>
                <div className="space-y-3">
                  {breakdown.employee?.map((e: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800/40 pb-2 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{e.name}</span>
                      <span className="font-bold text-slate-900 dark:text-white">${e.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* SYSTEM AUDIT TRAIL PANEL */
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm flex gap-4 items-center transition-colors">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                id="audit-search"
                placeholder="Search by action, user name, or details..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">{filteredAudits.length} events</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredAudits.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">No audit events found.</p>
              ) : (
                filteredAudits.map((log) => {
                  const cfg = getActionConfig(log.action);
                  const meta = parseMetaInfo(log.details);
                  const time = new Date(log.createdAt);
                  return (
                    <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[10px] whitespace-nowrap shrink-0 ${cfg.bg} ${cfg.text}`}>
                        {cfg.icon}
                        {cfg.label}
                      </div>
                      <div className="flex items-center gap-1.5 min-w-[120px] shrink-0">
                        {log.user ? (
                          <>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{log.user.fullName}</span>
                            <span className="text-[10px] text-slate-400 hidden sm:block">@{log.user.username}</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Anonymous</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {meta ? <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{meta}</p> : null}
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
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
