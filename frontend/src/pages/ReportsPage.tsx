import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
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
  Minus,
  Eye,
  X,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
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

const STATUS_CONFIG = {
  SAFE: {
    label: 'Safe',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    icon: CheckCircle,
  },
  WARNING: {
    label: 'Warning',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    bar: 'bg-amber-500',
    icon: AlertTriangle,
  },
  EXCEEDED: {
    label: 'Exceeded',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    bar: 'bg-red-500',
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
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  ACCOUNTANT_REVIEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  PAYMENT_PROCESSING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  PAID: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  COMPLETED: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3 shadow-sm">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Region Budget Tab ────────────────────────────────────────────────────────

function RegionBudgetTab({
  data,
  loading,
  onExport,
}: {
  data: RegionData | null;
  loading: boolean;
  onExport: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500">Loading regional data…</span>
      </div>
    );
  }

  if (!data) return null;

  const { rows } = data;

  // Compute summary from rows (backend summary doesn't include totalBudget/count)
  const totalBudget = rows.reduce((acc, r) => acc + r.regionBudget, 0);
  const totalSpent = rows.reduce((acc, r) => acc + r.totalSpent, 0);
  const totalRemaining = rows.reduce((acc, r) => acc + r.remainingBudget, 0);
  const regionCount = rows.length;

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Monthly Budget"
          value={`$${fmt(totalBudget)}`}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          icon={DollarSign}
        />
        <StatCard
          label="Total Spent"
          value={`$${fmt(totalSpent)}`}
          color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          icon={TrendingUp}
        />
        <StatCard
          label="Remaining Balance"
          value={`$${fmt(totalRemaining)}`}
          color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          icon={TrendingDown}
        />
        <StatCard
          label="Regions"
          value={String(regionCount)}
          color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
          icon={BarChart3}
        />
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No regional data for this period.</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Region</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Company</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Budget</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Spent</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Remaining</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[160px]">Utilization</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {rows.map((row) => {
                  const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.SAFE;
                  const StatusIcon = cfg.icon;
                  const isOpen = expanded.has(row.regionId);
                  const pct = Math.min(row.percentageUsed, 100);
                  const categoriesList = row.byCategory
                    ? Object.entries(row.byCategory)
                        .filter(([_, cat]) => cat.spent > 0 || cat.count > 0)
                        .map(([name, cat]) => ({ categoryName: name, total: cat.spent, count: cat.count }))
                    : [];
                  const hasCategories = categoriesList.length > 0;

                  return (
                    <React.Fragment key={row.regionId}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          {row.regionName}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.companyName}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-200">
                          ${fmt(row.regionBudget)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-orange-600 dark:text-orange-400">
                          ${fmt(row.totalSpent)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ${fmt(row.remainingBudget)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${cfg.bar}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-10 text-right">
                              {row.percentageUsed}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {hasCategories && (
                            <button
                              onClick={() => toggle(row.regionId)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                              title="View category breakdown"
                            >
                              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* Category breakdown row */}
                      {isOpen && hasCategories && (
                        <tr>
                          <td colSpan={8} className="px-6 pb-3 bg-slate-50 dark:bg-slate-900/50">
                            <div className="mt-2 ml-4 space-y-1.5">
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                                Expense Category Breakdown
                              </p>
                              {categoriesList.map((cat) => (
                                <div key={cat.categoryName} className="flex items-center justify-between">
                                  <span className="text-sm text-slate-600 dark:text-slate-300">
                                    {cat.categoryName} {cat.count > 0 && <span className="text-xs text-slate-400">({cat.count} requests)</span>}
                                  </span>
                                  <span className="text-sm font-semibold font-mono text-slate-800 dark:text-slate-100">
                                    ${fmt(cat.total)}
                                  </span>
                                </div>
                              ))}
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
        </div>
      )}
    </div>
  );
}

// ─── Employee Spending Tab ────────────────────────────────────────────────────

function EmployeeSpendingTab({
  data,
  loading,
  search,
  onSearchChange,
  onExport,
}: {
  data: EmployeeData | null;
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onExport: () => void;
}) {
  const [drillEmployee, setDrillEmployee] = useState<EmployeeRow | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500">Loading employee data…</span>
      </div>
    );
  }

  if (!data) return null;

  const { summary, employees } = data;

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Employees"
          value={String(summary.totalEmployees)}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          icon={Users}
        />
        <StatCard
          label="Total Approved"
          value={`$${fmt(summary.totalApproved)}`}
          color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          icon={CheckCircle}
        />
        <StatCard
          label="Total Paid"
          value={`$${fmt(summary.totalPaid)}`}
          color="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
          icon={DollarSign}
        />
        <StatCard
          label="Pending Settlement"
          value={`$${fmt(summary.totalPendingSettlementAmount)}`}
          sub={`${summary.totalPendingSettlementCount} items`}
          color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
          icon={Clock}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, username or region…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      {/* Table */}
      {employees.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No employee data for this period.</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Employee</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Region</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Department</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Requests</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Requested</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Approved</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Paid</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Pending Settle</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {employees.map((emp) => (
                  <tr key={emp.userId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{emp.fullName}</div>
                      <div className="text-xs text-slate-400">{emp.username} · {emp.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{emp.regionName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{emp.departmentName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-xs">
                        {emp.totalRequests}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-200">
                      ${fmt(emp.totalRequested)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                      ${fmt(emp.totalApproved)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      ${fmt(emp.totalPaid)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {emp.pendingSettlementCount > 0 ? (
                        <div>
                          <div className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                            ${fmt(emp.pendingSettlementAmount)}
                          </div>
                          <div className="text-xs text-slate-400">{emp.pendingSettlementCount} item(s)</div>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDrillEmployee(emp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-400 text-xs font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drill-down Modal */}
      {drillEmployee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {drillEmployee.fullName}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {drillEmployee.username} · {drillEmployee.regionName} · {drillEmployee.departmentName}
                </p>
              </div>
              <button
                onClick={() => setDrillEmployee(null)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-px bg-slate-200 dark:bg-slate-700">
              {[
                { label: 'Total Requested', value: `$${fmt(drillEmployee.totalRequested)}` },
                { label: 'Total Approved', value: `$${fmt(drillEmployee.totalApproved)}` },
                { label: 'Pending Settlement', value: `$${fmt(drillEmployee.pendingSettlementAmount)}` },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 dark:bg-slate-900 px-4 py-3 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Requests list */}
            <div className="overflow-y-auto flex-1 p-4">
              {drillEmployee.requests.length === 0 ? (
                <p className="text-center text-slate-400 py-10">No requests found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <th className="text-left px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase">Ref #</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase">Purpose</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase">Requested</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase">Approved</th>
                      <th className="text-center px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase">Status</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {drillEmployee.requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{r.requestNumber}</td>
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200 max-w-[200px] truncate">
                          {r.purpose}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-200">
                          ${fmt(r.requestedAmount)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-blue-700 dark:text-blue-400">
                          ${fmt(r.approvedAmount)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              REQ_STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {REQ_STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-slate-400">
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
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
  const { startDate: defaultStart, endDate: defaultEnd } = getThisMonthRange();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [companyId, setCompanyId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [statusScope, setStatusScope] = useState('APPROVED_AND_PAID');
  const [empSearch, setEmpSearch] = useState('');

  // Data
  const [regionData, setRegionData] = useState<RegionData | null>(null);
  const [regionLoading, setRegionLoading] = useState(false);
  const [empData, setEmpData] = useState<EmployeeData | null>(null);
  const [empLoading, setEmpLoading] = useState(false);

  // Companies & Regions for filter dropdowns
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.get('/companies').then((r) => setCompanies(r.data)).catch(() => {});
    api.get('/regions').then((r) => setRegions(r.data)).catch(() => {});
  }, []);

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
      console.error('Region budget load error', err);
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
      console.error('Employee spending load error', err);
    } finally {
      setEmpLoading(false);
    }
  }, [startDate, endDate, companyId, regionId, statusScope]);

  // Fetch both on first load and filter changes
  useEffect(() => {
    fetchRegionData();
    fetchEmpData();
  }, [fetchRegionData, fetchEmpData]);

  const handleExportRegion = async () => {
    const params = new URLSearchParams({ statusScope });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (companyId) params.append('companyId', companyId);
    if (regionId) params.append('regionId', regionId);
    const baseUrl = (api.defaults.baseURL || '').replace(/\/$/, '');
    window.open(`${baseUrl}/reports/export-region-budget-excel?${params.toString()}`, '_blank');
  };

  const handleExportEmployee = async () => {
    const params = new URLSearchParams({ statusScope });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (companyId) params.append('companyId', companyId);
    if (regionId) params.append('regionId', regionId);
    const baseUrl = (api.defaults.baseURL || '').replace(/\/$/, '');
    window.open(`${baseUrl}/reports/export-employee-spending-excel?${params.toString()}`, '_blank');
  };

  const setThisMonth = () => {
    const { startDate: s, endDate: e } = getThisMonthRange();
    setStartDate(s);
    setEndDate(e);
  };

  const setLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    setStartDate(formatDateLocal(start));
    setEndDate(formatDateLocal(end));
  };

  // Filter employee data locally by search (for fast UI response)
  const filteredEmpData: EmployeeData | null = empData
    ? {
        ...empData,
        employees: empSearch.trim()
          ? empData.employees.filter(
              (e) =>
                e.fullName.toLowerCase().includes(empSearch.toLowerCase()) ||
                e.username.toLowerCase().includes(empSearch.toLowerCase()) ||
                e.regionName.toLowerCase().includes(empSearch.toLowerCase()) ||
                e.phone.toLowerCase().includes(empSearch.toLowerCase())
            )
          : empData.employees,
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Budget &amp; User Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Regional budget utilization and per-employee spending breakdown
          </p>
        </div>
        <button
          onClick={() => { fetchRegionData(); fetchEmpData(); }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Period shortcuts */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Period</label>
            <div className="flex gap-2">
              <button
                onClick={setThisMonth}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                This Month
              </button>
              <button
                onClick={setLastMonth}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                Last Month
              </button>
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {/* Company filter */}
          {user?.role === 'SUPER_ADMIN' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Company</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Region filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Region</label>
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="">All Regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Status scope */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Include</label>
            <select
              value={statusScope}
              onChange={(e) => setStatusScope(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="APPROVED_AND_PAID">Approved &amp; Paid</option>
              <option value="PAID_ONLY">Paid Only</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('region')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'region'
              ? 'bg-[#0D1C3D] text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Regional Budgets
        </button>
        <button
          onClick={() => setActiveTab('employee')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'employee'
              ? 'bg-[#0D1C3D] text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Employee Spending
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'region' ? (
        <RegionBudgetTab
          data={regionData}
          loading={regionLoading}
          onExport={handleExportRegion}
        />
      ) : (
        <EmployeeSpendingTab
          data={filteredEmpData}
          loading={empLoading}
          search={empSearch}
          onSearchChange={setEmpSearch}
          onExport={handleExportEmployee}
        />
      )}
    </div>
  );
};

export default ReportsPage;
