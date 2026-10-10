import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Wallet, FileText, Clock, CheckCircle2, XCircle,
  PlusCircle, ArrowRight, Building2,
  Loader2, Receipt, Banknote, CheckCheck,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../utils/format';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Card,
  CardHeader,
  CardContent,
  Button,
} from '../components/ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtMoney = (n: number) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ─── Shared Summary Card ──────────────────────────────────────────────────────
interface CardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconClass?: string;
  bgClass?: string;
  topBarClass?: string;
  to?: string;
}

const SummaryCard: React.FC<CardProps> = ({ label, value, sub, icon: Icon, to }) => {
  const cardContent = (
    <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-xs border border-border/80 bg-card ${
      to ? 'hover:border-foreground/30 cursor-pointer group' : ''
    }`}>
      <div className="p-4 sm:p-5 flex items-center gap-3.5">
        <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-muted/60 dark:bg-muted/40 border border-border/50 flex items-center justify-center">
          <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className="text-lg sm:text-xl font-bold text-foreground leading-tight tracking-tight mt-0.5">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">{sub}</p>}
        </div>
      </div>
    </Card>
  );

  if (to) {
    return <Link to={to} className="block">{cardContent}</Link>;
  }

  return cardContent;
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; to?: string; linkLabel?: string }> = ({ title, to, linkLabel }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
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
  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
    <Table>
      <TableHeader className="bg-muted/40 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
        <TableRow>
          <TableHead className="py-3 px-4">Request #</TableHead>
          <TableHead className="py-3 px-4 hidden sm:table-cell">Date</TableHead>
          {showEmployee && <TableHead className="py-3 px-4">Employee</TableHead>}
          {showCompany && <TableHead className="py-3 px-4 hidden sm:table-cell">Company</TableHead>}
          <TableHead className="py-3 px-4 hidden md:table-cell">Purpose</TableHead>
          <TableHead className="py-3 px-4">Amount</TableHead>
          <TableHead className="py-3 px-4">Status</TableHead>
          {showRemarks && <TableHead className="py-3 px-4 hidden lg:table-cell">Remarks</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="p-0">
              {emptyMessage ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <EmptyState
                  icon={Receipt}
                  title="No requests found"
                  description="There are no requests matching this view."
                />
              )}
            </TableCell>
          </TableRow>
        ) : (
          rows.map(req => (
            <TableRow key={req.id} className="hover:bg-muted/40 transition-colors">
              <TableCell className="py-3 px-4 font-semibold text-foreground">
                <Link to={`/requests/${req.requestNumber || req.id}`} className="text-sm font-bold text-primary hover:underline">
                  {req.requestNumber}
                </Link>
              </TableCell>
              <TableCell className="py-3 px-4 text-muted-foreground hidden sm:table-cell text-xs">
                {formatDate(req.requestDate || req.createdAt)}
              </TableCell>
              {showEmployee && (
                <TableCell className="py-3 px-4 font-medium text-foreground text-xs">{req.user?.fullName}</TableCell>
              )}
              {showCompany && (
                <TableCell className="py-3 px-4 hidden sm:table-cell">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {req.company?.name || 'N/A'}
                  </span>
                </TableCell>
              )}
              <TableCell className="py-3 px-4 text-muted-foreground truncate max-w-[140px] hidden md:table-cell text-xs">{req.purpose}</TableCell>
              <TableCell className="py-3 px-4 whitespace-nowrap text-xs">
                {['APPROVED', 'PAID', 'COMPLETED'].includes(req.status) && req.approvedAmount && Number(req.approvedAmount) !== Number(req.requestedAmount) ? (
                  <div>
                    <span className="font-bold text-foreground">
                      {formatCurrency(req.approvedAmount, req.currency)}
                    </span>
                    <span className="block text-[10px] text-muted-foreground line-through">
                      Req: {formatCurrency(req.requestedAmount, req.currency)}
                    </span>
                  </div>
                ) : (
                  <span className="font-bold text-foreground">
                    {formatCurrency(
                      req.approvedAmount && ['APPROVED', 'PAID', 'COMPLETED'].includes(req.status)
                        ? req.approvedAmount
                        : req.requestedAmount,
                      req.currency
                    )}
                  </span>
                )}
              </TableCell>
              <TableCell className="py-3 px-4"><StatusBadge status={req.status} /></TableCell>
              {showRemarks && (
                <TableCell className="py-3 px-4 text-muted-foreground max-w-[160px] truncate hidden lg:table-cell text-xs">
                  {req.correctionNotes || req.remarks || '—'}
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
);

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
    value: fmtMoney(c.balance),
    sub: `Allocated: ${fmtMoney(c.allocated)} · ${MONTHS[period.month - 1]} ${period.year}`,
    icon: Building2,
  })) || [];

  const carryFwd = funds?.prevMonthCarryForward;
  const carryCards: CardProps[] = carryFwd?.perCompany?.map((c: any) => ({
    label: `${c.name} — ${MONTHS[carryFwd.month - 1]} Balance`,
    value: fmtMoney(c.balance),
    sub: `${MONTHS[carryFwd.month - 1]} ${carryFwd.year} carry-forward · ${MONTHS[period.month - 1]} not yet funded`,
    icon: Building2,
    to: '/funds',
  })) || [];

  const fundCards: CardProps[] = [
    {
      label: 'Available Cash Balance',
      value: funds ? fmtMoney(funds.totalBalance) : '—',
      sub: `Allocated: ${fmtMoney(funds?.totalAllocated ?? 0)} · ${MONTHS[period.month - 1]} ${period.year}`,
      icon: Wallet,
    },
    ...companyCards,
    ...carryCards,
  ];

  const requestCards: CardProps[] = [
    {
      label: 'Total Requests',
      value: stats?.counts?.total ?? 0,
      sub: "This month's submissions",
      icon: FileText,
      to: '/requests?datePreset=THIS_MONTH',
    },
    {
      label: 'Pending Requests',
      value: stats?.counts?.pending ?? 0,
      sub: 'Awaiting approval',
      icon: Clock,
      to: '/requests?status=PENDING_APPROVAL&datePreset=THIS_MONTH',
    },
    {
      label: 'Approved Requests',
      value: stats?.counts?.approved ?? 0,
      sub: 'Reviewed & authorized',
      icon: CheckCircle2,
      to: '/requests?status=APPROVED&datePreset=THIS_MONTH',
    },
    {
      label: 'Paid Requests',
      value: stats?.counts?.paid ?? 0,
      sub: stats?.amounts?.totalPaid ? `${fmtMoney(stats.amounts.totalPaid)} disbursed this month` : 'Disbursed this month',
      icon: Banknote,
      to: '/requests?status=PAID&datePreset=THIS_MONTH',
    },
    {
      label: 'Completed Requests',
      value: stats?.counts?.completed ?? 0,
      sub: 'Settled & reconciled',
      icon: CheckCheck,
      to: '/requests?status=COMPLETED&datePreset=THIS_MONTH',
    },
    {
      label: 'Rejected Requests',
      value: stats?.counts?.rejected ?? 0,
      sub: 'Not approved this month',
      icon: XCircle,
      to: '/requests?status=REJECTED&datePreset=THIS_MONTH',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Section 1: Liquidity & Fund Balances ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Cash & Liquidity Overview
            </h3>
            <p className="text-xs text-muted-foreground">Available petty cash reserves for {MONTHS[period.month - 1]} {period.year}</p>
          </div>
          <Link to="/funds" className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
            Manage Funds <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {fundCards.map((c, i) => <SummaryCard key={i} {...c} />)}
        </div>
      </div>

      {/* ── Section 2: Monthly Request Activity ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Monthly Request Pipeline
            </h3>
            <p className="text-xs text-muted-foreground">Workflow status of submissions for {MONTHS[period.month - 1]} {period.year}</p>
          </div>
          <Link to="/requests?datePreset=THIS_MONTH" className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
            View All Requests <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {requestCards.map((c, i) => <SummaryCard key={i} {...c} />)}
        </div>
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
    value: fmtMoney(c.balance),
    sub: `Allocated: ${fmtMoney(c.allocated)} · ${MONTHS[period.month - 1]} ${period.year}`,
    icon: Building2,
  })) || [];

  const carryFwd = funds?.prevMonthCarryForward;
  const carryCards: CardProps[] = carryFwd?.perCompany?.map((c: any) => ({
    label: `${c.name} — ${MONTHS[carryFwd.month - 1]} Balance`,
    value: fmtMoney(c.balance),
    sub: `${MONTHS[carryFwd.month - 1]} ${carryFwd.year} carry-forward · ${MONTHS[period.month - 1]} not yet funded`,
    icon: Building2,
    to: '/funds',
  })) || [];

  const fundCards: CardProps[] = [
    {
      label: 'Available Cash Balance',
      value: funds ? fmtMoney(funds.totalBalance) : '—',
      sub: `Allocated: ${fmtMoney(funds?.totalAllocated ?? 0)} · ${MONTHS[period.month - 1]} ${period.year}`,
      icon: Wallet,
    },
    ...companyCards,
    ...carryCards,
  ];

  const requestCards: CardProps[] = [
    {
      label: 'Total Requests',
      value: stats?.counts?.total ?? 0,
      sub: "This month's submissions",
      icon: FileText,
      to: '/requests?datePreset=THIS_MONTH',
    },
    {
      label: 'Pending Requests',
      value: stats?.counts?.pending ?? 0,
      sub: 'Awaiting your review',
      icon: Clock,
      to: '/requests?status=PENDING_APPROVAL&datePreset=THIS_MONTH',
    },
    {
      label: 'Approved Requests',
      value: stats?.counts?.approved ?? 0,
      sub: 'Reviewed & authorized',
      icon: CheckCircle2,
      to: '/requests?status=APPROVED&datePreset=THIS_MONTH',
    },
    {
      label: 'Paid Requests',
      value: stats?.counts?.paid ?? 0,
      sub: stats?.amounts?.totalPaid ? `${fmtMoney(stats.amounts.totalPaid)} disbursed this month` : 'Disbursed this month',
      icon: Banknote,
      to: '/requests?status=PAID&datePreset=THIS_MONTH',
    },
    {
      label: 'Completed Requests',
      value: stats?.counts?.completed ?? 0,
      sub: 'Settled & reconciled',
      icon: CheckCheck,
      to: '/requests?status=COMPLETED&datePreset=THIS_MONTH',
    },
    {
      label: 'Rejected Requests',
      value: stats?.counts?.rejected ?? 0,
      sub: 'Not approved this month',
      icon: XCircle,
      to: '/requests?status=REJECTED&datePreset=THIS_MONTH',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Section 1: Liquidity & Fund Balances ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Cash & Liquidity Overview
            </h3>
            <p className="text-xs text-muted-foreground">Available petty cash reserves for {MONTHS[period.month - 1]} {period.year}</p>
          </div>
          <Link to="/funds" className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
            Manage Funds <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {fundCards.map((c, i) => <SummaryCard key={i} {...c} />)}
        </div>
      </div>

      {/* ── Section 2: Monthly Request Activity ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Monthly Request Pipeline
            </h3>
            <p className="text-xs text-muted-foreground">Workflow status of submissions for {MONTHS[period.month - 1]} {period.year}</p>
          </div>
          <Link to="/requests?datePreset=THIS_MONTH" className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
            View All Requests <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {requestCards.map((c, i) => <SummaryCard key={i} {...c} />)}
        </div>
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
      to: '/requests?datePreset=THIS_MONTH',
    },
    {
      label: 'Pending',
      value: stats?.counts?.pending ?? 0,
      sub: 'Awaiting review',
      icon: Clock,
      to: '/requests?status=PENDING_APPROVAL&datePreset=THIS_MONTH',
    },
    {
      label: 'Approved',
      value: stats?.counts?.approved ?? 0,
      sub: 'Ready for payment',
      icon: CheckCircle2,
      to: '/requests?status=APPROVED&datePreset=THIS_MONTH',
    },
    {
      label: 'Paid',
      value: stats?.counts?.paid ?? 0,
      sub: stats?.amounts?.totalPaid ? `${fmtMoney(stats.amounts.totalPaid)} disbursed this month` : 'Disbursed this month',
      icon: Banknote,
      to: '/requests?status=PAID&datePreset=THIS_MONTH',
    },
    {
      label: 'Completed',
      value: stats?.counts?.completed ?? 0,
      sub: 'Settled & closed',
      icon: CheckCheck,
      to: '/requests?status=COMPLETED&datePreset=THIS_MONTH',
    },
    {
      label: 'Rejected',
      value: stats?.counts?.rejected ?? 0,
      sub: 'Not approved',
      icon: XCircle,
      to: '/requests?status=REJECTED&datePreset=THIS_MONTH',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">My Dashboard</h2>
          <p className="text-xs text-muted-foreground">Overview of your petty cash activity</p>
        </div>
        <Link to="/requests/new">
          <Button variant="default" size="sm" className="gap-2 shadow-sm">
            <PlusCircle className="h-4 w-4" />
            New Petty Cash Request
          </Button>
        </Link>
      </div>

      {/* My Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {statCards.map((c, i) => <SummaryCard key={i} {...c} />)}
      </div>

      {/* My Recent Requests */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border">
          <SectionHeader title="My Recent Requests" to="/requests" />
        </CardHeader>
        <CardContent className="p-0">
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
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Loader ───────────────────────────────────────────────────────────────────
const Loader: React.FC = () => (
  <div className="flex items-center justify-center h-64 gap-3">
    <Loader2 className="h-7 w-7 animate-spin text-primary" />
    <span className="text-sm text-muted-foreground font-medium">Loading dashboard…</span>
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

export default DashboardPage;
