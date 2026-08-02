import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Wallet, FileText, Clock, CheckCircle2, XCircle,
  PlusCircle, ArrowRight, Building2,
  Loader2,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COMPANY_COLORS: Record<string, string> = {
  Bluekom: '#3b82f6',
  Somtel:  '#f97316',
};

const fmtMoney = (n: number) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    COMPLETED:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    PAID:               'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    APPROVED:           'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    PENDING_APPROVAL:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    CORRECTION_REQUIRED:'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    REJECTED:           'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    DRAFT:              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full whitespace-nowrap ${map[status] || map.DRAFT}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

// ─── Shared Summary Card ──────────────────────────────────────────────────────
interface CardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconClass: string;
  bgClass: string;
  topBarClass?: string;
  to?: string;
}
const SummaryCard: React.FC<CardProps> = ({ label, value, sub, icon: Icon, iconClass, bgClass, topBarClass, to }) => {
  const cardContent = (
    <div className={`relative bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-3.5 shadow-sm hover:shadow-md transition-all overflow-hidden flex items-center gap-3.5 ${
      to ? 'hover:border-primary/40 cursor-pointer group' : ''
    }`}>
      {topBarClass && <div className={`absolute inset-x-0 top-0 h-[2px] ${topBarClass}`} />}
      <div className={`flex-shrink-0 h-9 w-9 rounded-lg ${bgClass} flex items-center justify-center`}>
        <Icon className={`h-4 w-4 ${iconClass}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight tracking-tight">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  if (to) {
    return <Link to={to} className="block">{cardContent}</Link>;
  }

  return cardContent;
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; to?: string; linkLabel?: string }> = ({ title, to, linkLabel }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h3>
    {to && (
      <Link to={to} className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
        {linkLabel || 'View all'} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    )}
  </div>
);

// ─── Requests Table (shared) ──────────────────────────────────────────────────
interface ReqTableProps {
  rows: any[];
  showCompany?: boolean;
  showEmployee?: boolean;
  showRemarks?: boolean;
  emptyMessage?: React.ReactNode;
}
const RequestsTable: React.FC<ReqTableProps> = ({
  rows, showCompany = false, showEmployee = true, showRemarks = false, emptyMessage,
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <th className="py-3 px-4">Request #</th>
          <th className="py-3 px-4">Date</th>
          {showEmployee && <th className="py-3 px-4">Employee</th>}
          {showCompany && <th className="py-3 px-4">Company</th>}
          <th className="py-3 px-4">Purpose</th>
          <th className="py-3 px-4">Amount</th>
          <th className="py-3 px-4">Status</th>
          {showRemarks && <th className="py-3 px-4">Remarks</th>}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={8} className="text-center py-10 text-xs text-slate-400">
              {emptyMessage ?? 'No requests found.'}
            </td>
          </tr>
        ) : (
          rows.map(req => (
            <tr key={req.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
              <td className="py-3 px-4">
                <Link to={`/requests/${req.id}`} className="text-xs font-bold text-primary hover:underline">
                  {req.requestNumber}
                </Link>
              </td>
              <td className="py-3 px-4 text-xs text-slate-500">
                {new Date(req.requestDate || req.createdAt).toLocaleDateString()}
              </td>
              {showEmployee && (
                <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">{req.user?.fullName}</td>
              )}
              {showCompany && (
                <td className="py-3 px-4">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                    style={{
                      background: `${COMPANY_COLORS[req.company?.name] || '#6b7280'}18`,
                      color: COMPANY_COLORS[req.company?.name] || '#6b7280',
                    }}>
                    {req.company?.name}
                  </span>
                </td>
              )}
              <td className="py-3 px-4 text-xs text-slate-500 truncate max-w-[140px]">{req.purpose}</td>
              <td className="py-3 px-4 text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                {req.currency} {Number(req.requestedAmount).toLocaleString()}
              </td>
              <td className="py-3 px-4"><StatusBadge status={req.status} /></td>
              {showRemarks && (
                <td className="py-3 px-4 text-xs text-slate-500 max-w-[160px] truncate">
                  {req.correctionNotes || req.remarks || '—'}
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SUPER ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// 1. SUPER ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const q = companyFilter !== 'ALL' ? `?companyId=${companyFilter}` : '';
      const s = await api.get(`/reports/dashboard-stats${q}`);
      setStats(s.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('companyFilterChanged', load);
    return () => window.removeEventListener('companyFilterChanged', load);
  }, [load]);

  if (loading) return <Loader />;

  const funds = stats?.funds;
  const period = stats?.period || { month: new Date().getMonth() + 1, year: new Date().getFullYear() };

  // Build company balance cards — show remainingBalance (live available after deductions)
  const companyCards = funds?.perCompany?.map((c: any) => ({
    label: `${c.name} Available`,
    value: fmtMoney(c.balance),          // balance = remainingBalance from backend
    sub: `Allocated: ${fmtMoney(c.allocated)} · ${MONTHS[period.month - 1]} ${period.year}`,
    icon: Building2,
    iconClass: c.name === 'Bluekom' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400',
    bgClass: c.name === 'Bluekom' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20',
    topBarClass: c.name === 'Bluekom' ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-gradient-to-r from-orange-500 to-amber-400',
  })) || [];

  const mainCards: CardProps[] = [
    {
      label: 'Available Cash Balance',
      value: funds ? fmtMoney(funds.totalBalance) : '—',
      sub: `Allocated: ${fmtMoney(funds?.totalAllocated ?? 0)} · ${MONTHS[period.month - 1]} ${period.year}`,
      icon: Wallet,
      iconClass: 'text-primary',
      bgClass: 'bg-primary/10',
      topBarClass: 'bg-gradient-to-r from-primary to-indigo-500',
    },
    ...companyCards,
    {
      label: 'Total Requests',
      value: stats?.counts?.total ?? 0,
      sub: "This month's submissions",
      icon: FileText,
      iconClass: 'text-slate-600 dark:text-slate-400',
      bgClass: 'bg-slate-100 dark:bg-slate-800',
      topBarClass: 'bg-gradient-to-r from-slate-400 to-slate-500',
      to: '/requests',
    },
    {
      label: 'Pending Requests',
      value: stats?.counts?.pending ?? 0,
      sub: 'Awaiting approval',
      icon: Clock,
      iconClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-900/20',
      topBarClass: 'bg-gradient-to-r from-amber-400 to-orange-400',
      to: '/requests?status=PENDING_APPROVAL',
    },
    {
      label: 'Approved Requests',
      value: stats?.counts?.approved ?? 0,
      sub: 'Reviewed & authorized',
      icon: CheckCircle2,
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
      topBarClass: 'bg-gradient-to-r from-emerald-400 to-teal-500',
      to: '/requests?status=APPROVED',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards only */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {mainCards.map((c, i) => <SummaryCard key={i} {...c} />)}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ACCOUNTANT DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const AccountantDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const q = companyFilter !== 'ALL' ? `?companyId=${companyFilter}` : '';
      const s = await api.get(`/reports/dashboard-stats${q}`);
      setStats(s.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('companyFilterChanged', load);
    return () => window.removeEventListener('companyFilterChanged', load);
  }, [load]);

  if (loading) return <Loader />;

  const funds = stats?.funds;
  const period = stats?.period || { month: new Date().getMonth() + 1, year: new Date().getFullYear() };

  const companyCards = funds?.perCompany?.map((c: any) => ({
    label: `${c.name} Available`,
    value: fmtMoney(c.balance),          // balance = remainingBalance from backend
    sub: `Allocated: ${fmtMoney(c.allocated)} · ${MONTHS[period.month - 1]} ${period.year}`,
    icon: Building2,
    iconClass: c.name === 'Bluekom' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400',
    bgClass: c.name === 'Bluekom' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20',
    topBarClass: c.name === 'Bluekom' ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-gradient-to-r from-orange-500 to-amber-400',
  })) || [];

  const mainCards: CardProps[] = [
    {
      label: 'Available Cash Balance',
      value: funds ? fmtMoney(funds.totalBalance) : '—',
      sub: `Allocated: ${fmtMoney(funds?.totalAllocated ?? 0)} · ${MONTHS[period.month - 1]} ${period.year}`,
      icon: Wallet,
      iconClass: 'text-primary',
      bgClass: 'bg-primary/10',
      topBarClass: 'bg-gradient-to-r from-primary to-indigo-500',
    },
    ...companyCards,
    {
      label: 'Total Requests',
      value: stats?.counts?.total ?? 0,
      sub: "This month's submissions",
      icon: FileText,
      iconClass: 'text-slate-600 dark:text-slate-400',
      bgClass: 'bg-slate-100 dark:bg-slate-800',
      topBarClass: 'bg-gradient-to-r from-slate-400 to-slate-500',
      to: '/requests',
    },
    {
      label: 'Pending Requests',
      value: stats?.counts?.pending ?? 0,
      sub: 'Awaiting your review',
      icon: Clock,
      iconClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-900/20',
      topBarClass: 'bg-gradient-to-r from-amber-400 to-orange-400',
      to: '/requests?status=PENDING_APPROVAL',
    },
    {
      label: 'Approved Requests',
      value: stats?.counts?.approved ?? 0,
      sub: 'Reviewed & authorized',
      icon: CheckCircle2,
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
      topBarClass: 'bg-gradient-to-r from-emerald-400 to-teal-500',
      to: '/requests?status=APPROVED',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards only */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {mainCards.map((c, i) => <SummaryCard key={i} {...c} />)}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. EMPLOYEE DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const EmployeeDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, r] = await Promise.all([
          api.get('/reports/dashboard-stats'),
          api.get('/requests?page=1&pageSize=10'),
        ]);
        setStats(s.data);
        setMyRequests(r.data?.items || r.data || []);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Loader />;

  const statCards = [
    {
      label: 'My Requests',
      value: stats?.counts?.total ?? 0,
      sub: 'Total submissions',
      icon: FileText,
      iconClass: 'text-primary',
      bgClass: 'bg-primary/10',
      topBarClass: 'bg-gradient-to-r from-primary to-indigo-500',
      to: '/requests',
    },
    {
      label: 'Pending',
      value: stats?.counts?.pending ?? 0,
      sub: 'Awaiting review',
      icon: Clock,
      iconClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-900/20',
      topBarClass: 'bg-gradient-to-r from-amber-400 to-orange-400',
      to: '/requests?status=PENDING_APPROVAL',
    },
    {
      label: 'Approved',
      value: stats?.counts?.approved ?? 0,
      sub: 'Ready for payment',
      icon: CheckCircle2,
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
      topBarClass: 'bg-gradient-to-r from-emerald-400 to-teal-400',
      to: '/requests?status=APPROVED',
    },
    {
      label: 'Rejected',
      value: stats?.counts?.rejected ?? 0,
      sub: 'Not approved',
      icon: XCircle,
      iconClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-50 dark:bg-rose-900/20',
      topBarClass: 'bg-gradient-to-r from-rose-400 to-pink-500',
      to: '/requests?status=REJECTED',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track and manage your petty cash requests</p>
        </div>
        <Link
          to="/requests/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md shadow-primary/20 transition-all text-xs"
        >
          <PlusCircle className="h-4 w-4" />
          New Petty Cash Request
        </Link>
      </div>

      {/* My Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((c, i) => <SummaryCard key={i} {...c} />)}
      </div>

      {/* My Recent Requests */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <SectionHeader title="My Recent Requests" to="/requests" />
        </div>
        <RequestsTable
          rows={myRequests}
          showEmployee={false}
          showCompany={false}
          showRemarks
          emptyMessage={
            <span>
              No requests yet.{' '}
              <Link to="/requests/new" className="text-primary hover:underline font-semibold">
                Submit your first request →
              </Link>
            </span>
          }
        />
      </div>
    </div>
  );
};

// ─── Loader ───────────────────────────────────────────────────────────────────
const Loader: React.FC = () => (
  <div className="flex items-center justify-center h-64 gap-3">
    <Loader2 className="h-7 w-7 animate-spin text-primary" />
    <span className="text-sm text-slate-400 font-medium">Loading dashboard…</span>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT — picks dashboard by role
// ═══════════════════════════════════════════════════════════════════════════════
export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Loader />;

  if (user.role === 'SUPER_ADMIN')  return <SuperAdminDashboard />;
  if (user.role === 'ACCOUNTANT')   return <AccountantDashboard />;
  return <EmployeeDashboard />;
};
