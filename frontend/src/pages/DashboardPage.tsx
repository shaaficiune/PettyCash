import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Wallet, FileText, Clock, CheckCircle2, XCircle,
  PlusCircle, ArrowRight, Building2,
  Loader2, Receipt, Banknote, CheckCheck, AlertTriangle,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate, fitKpis } from '../utils/format';
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

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtMoney = (n: number) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface CardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ElementType;
  iconClass?: string;
  bgClass?: string;
  topBarClass?: string;
  to?: string;
  hero?: boolean;
}


const SummaryCard: React.FC<CardProps> = ({
  label, value, sub, icon: Icon, to, hero = false,
  iconClass, bgClass, topBarClass,
}) => {
  if (hero) {
    const heroContent = (
      <div className="bg-gradient-to-br from-[#0D1C3D] to-[#162A56] dark:from-[#0A1224] dark:to-[#101C38] text-[#EEF2FB] border border-[#1E3360] dark:border-[#1C2B4E] rounded-xl p-4 sm:p-5 shadow-md shadow-slate-900/10 dark:shadow-black/40 hover:border-[#F5B700] dark:hover:border-[#FBBF24] transition-all flex flex-col justify-between min-h-[110px] group">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9BB1DE] block">
            {label}
          </span>
          <span className={`font-mono ${fitKpis(value)} font-bold text-[#F5B700] dark:text-[#FBBF24] tracking-tight leading-tight block my-1.5 font-financial tabular-nums`}>
            {value}
          </span>
          {sub && <span className="text-xs text-[#C5D3EE] block truncate">{sub}</span>}
        </div>
        {to && (
          <span className="text-xs font-bold text-[#F5B700] dark:text-[#FBBF24] mt-2 flex items-center gap-1 group-hover:underline">
            View details →
          </span>
        )}
      </div>
    );
    if (to) return <Link to={to} className="block">{heroContent}</Link>;
    return heroContent;
  }

  const cardContent = (
    <Card className={`relative overflow-hidden transition-all duration-200 hover:shadow-md border border-border/80 bg-card ${
      to ? 'hover:border-[#F5B700]/70 cursor-pointer group' : ''
    }`}>
      {topBarClass && (
        <div className={`h-[3px] w-full ${topBarClass}`} />
      )}
      <div className="p-4 sm:p-5 flex items-center gap-3.5">
        {Icon && (
          <div className={`flex-shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs ${
            bgClass || 'bg-muted/60 dark:bg-muted/40 border-border/50'
          }`}>
            <Icon className={`h-5 w-5 ${iconClass || 'text-muted-foreground group-hover:text-foreground'}`} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted-foreground truncate">{label}</p>
          <p className="text-lg sm:text-xl font-bold text-foreground leading-tight tracking-tight mt-0.5 font-financial tabular-nums">{value}</p>
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
    <Table className="fin-table">
      <TableHeader className="bg-gradient-to-r from-[#0D1C3D] to-[#0A1630] dark:from-[#0B1325] dark:to-[#080D1A] font-bold text-[11px] uppercase tracking-wider text-white">
        <TableRow className="border-none bg-transparent hover:bg-transparent">
          <TableHead className="py-3 px-4 text-white">Request #</TableHead>
          <TableHead className="py-3 px-4 hidden sm:table-cell text-white">Date</TableHead>
          {showEmployee && <TableHead className="py-3 px-4 text-white">Employee</TableHead>}
          {showCompany && <TableHead className="py-3 px-4 hidden sm:table-cell text-white">Company</TableHead>}
          <TableHead className="py-3 px-4 hidden md:table-cell text-white">Purpose</TableHead>
          <TableHead className="py-3 px-4 text-white">Amount</TableHead>
          <TableHead className="py-3 px-4 text-white">Status</TableHead>
          {showRemarks && <TableHead className="py-3 px-4 hidden lg:table-cell text-white">Remarks</TableHead>}
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
                  {(() => {
                    const name = (req.company?.name || '').toLowerCase();
                    const isSomtel = name.includes('somtel');
                    const isBluekom = name.includes('bluekom');
                    return (
                      <span className={isSomtel ? 'co-badge-somtel' : isBluekom ? 'co-badge-bluekom' : 'text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground'}>
                        {req.company?.name || 'N/A'}
                      </span>
                    );
                  })()}
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

// 1. SUPER ADMIN DASHBOARD
const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const q = companyFilter !== 'ALL' ? `?companyId=${companyFilter}` : '';
      const [s, r] = await Promise.all([
        api.get(`/reports/dashboard-stats${q}`),
        api.get(`/requests${q ? q + '&' : '?'}page=1&pageSize=7`),
      ]);
      setStats(s.data);
      setRecentRequests(r.data?.items || r.data || []);
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
      hero: true,
      to: '/funds',
    },
    ...companyCards.map((c: any) => ({ ...c, hero: true, to: '/funds' })),
    ...carryCards,
  ];

  const requestCards: CardProps[] = [
    {
      label: 'Total Requests',
      value: stats?.counts?.total ?? 0,
      sub: "This month's submissions",
      icon: FileText,
      topBarClass: 'bg-[#1F5FBF]',
      iconClass: 'text-[#1F5FBF] dark:text-[#60A5FA]',
      bgClass: 'bg-[#EFF6FF] dark:bg-[#1F5FBF]/15 border-[#BFDBFE] dark:border-[#1F5FBF]/30',
      to: '/requests?datePreset=THIS_MONTH',
    },
    {
      label: 'Pending Requests',
      value: stats?.counts?.pending ?? 0,
      sub: 'Awaiting approval',
      icon: Clock,
      topBarClass: 'bg-[#F5B700]',
      iconClass: 'text-[#D97706] dark:text-[#FBBF24]',
      bgClass: 'bg-[#FFFBEB] dark:bg-[#F5B700]/15 border-[#FDE68A] dark:border-[#F5B700]/30',
      to: '/requests?status=PENDING_APPROVAL&datePreset=THIS_MONTH',
    },
    {
      label: 'Approved Requests',
      value: stats?.counts?.approved ?? 0,
      sub: 'Reviewed & authorized',
      icon: CheckCircle2,
      topBarClass: 'bg-[#059669]',
      iconClass: 'text-[#059669] dark:text-[#34D399]',
      bgClass: 'bg-[#ECFDF5] dark:bg-[#059669]/15 border-[#A7F3D0] dark:border-[#059669]/30',
      to: '/requests?status=APPROVED&datePreset=THIS_MONTH',
    },
    {
      label: 'Paid Requests',
      value: stats?.counts?.paid ?? 0,
      sub: stats?.amounts?.totalPaid ? `${fmtMoney(stats.amounts.totalPaid)} disbursed this month` : 'Disbursed this month',
      icon: Banknote,
      topBarClass: 'bg-[#2563EB]',
      iconClass: 'text-[#2563EB] dark:text-[#818CF8]',
      bgClass: 'bg-[#EEF2FF] dark:bg-[#2563EB]/15 border-[#C7D2FE] dark:border-[#2563EB]/30',
      to: '/requests?status=PAID&datePreset=THIS_MONTH',
    },
    {
      label: 'Completed Requests',
      value: stats?.counts?.completed ?? 0,
      sub: 'Settled & reconciled',
      icon: CheckCheck,
      topBarClass: 'bg-[#0D9488]',
      iconClass: 'text-[#0D9488] dark:text-[#2DD4BF]',
      bgClass: 'bg-[#F0FDFA] dark:bg-[#0D9488]/15 border-[#99F6E4] dark:border-[#0D9488]/30',
      to: '/requests?status=COMPLETED&datePreset=THIS_MONTH',
    },
    {
      label: 'Rejected Requests',
      value: stats?.counts?.rejected ?? 0,
      sub: 'Not approved this month',
      icon: XCircle,
      topBarClass: 'bg-[#DC2626]',
      iconClass: 'text-[#DC2626] dark:text-[#F87171]',
      bgClass: 'bg-[#FEF2F2] dark:bg-[#DC2626]/15 border-[#FECACA] dark:border-[#DC2626]/30',
      to: '/requests?status=REJECTED&datePreset=THIS_MONTH',
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Low Balance Float Alert (Threshold < $300) ── */}
      {funds?.perCompany?.some((c: any) => c.balance < 300) && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-300 rounded-xl text-xs font-medium animate-in fade-in-50 duration-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Low Float Alert (Threshold &lt; $300):</strong>{' '}
              {funds.perCompany
                .filter((c: any) => c.balance < 300)
                .map((c: any) => `${c.name} available balance is $${Number(c.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
                .join('; ')}
              {' '}— please request replenishment.
            </span>
            <Link to="/funds">
              <Button variant="gold" size="xs" className="h-6 px-2.5 text-[11px] font-bold shadow-xs">
                Replenish Float →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Section 1: Liquidity & Fund Balances (Hero Cards) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2 font-display">
              <Wallet className="h-4 w-4 text-[#F5B700]" />
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

      {/* ── Section 3: Recent Petty Cash Requests (View All Requests) ── */}
      <Card className="shadow-xs overflow-hidden border border-border/80 bg-card mt-6">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2 font-display">
              <Receipt className="h-4 w-4 text-[#F5B700] dark:text-[#FBBF24]" />
              Recent Petty Cash Requests
            </h3>
            <p className="text-xs text-muted-foreground">Latest submissions across Somtel & Bluekom operations</p>
          </div>
          <Link
            to="/requests"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D97706] dark:text-[#FBBF24] hover:text-[#B45309] dark:hover:text-[#F59E0B] px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-all w-fit"
          >
            View All Requests <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <RequestsTable
            rows={recentRequests}
            showEmployee={true}
            showCompany={true}
            showRemarks={false}
            emptyMessage={
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent requests found for this filter.
              </div>
            }
          />
        </CardContent>
        {recentRequests.length > 0 && (
          <div className="p-3 bg-muted/20 border-t border-border flex justify-center">
            <Link
              to="/requests"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
            >
              View complete requests archive ({stats?.counts?.total ?? recentRequests.length} total) →
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};

// 2. ACCOUNTANT DASHBOARD
const AccountantDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const q = companyFilter !== 'ALL' ? `?companyId=${companyFilter}` : '';
      const [s, r] = await Promise.all([
        api.get(`/reports/dashboard-stats${q}`),
        api.get(`/requests${q ? q + '&' : '?'}page=1&pageSize=7`),
      ]);
      setStats(s.data);
      setRecentRequests(r.data?.items || r.data || []);
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
      hero: true,
      to: '/funds',
    },
    ...companyCards.map((c: any) => ({ ...c, hero: true, to: '/funds' })),
    ...carryCards,
  ];

  const requestCards: CardProps[] = [
    {
      label: 'Total Requests',
      value: stats?.counts?.total ?? 0,
      sub: "This month's submissions",
      icon: FileText,
      topBarClass: 'bg-[#1F5FBF]',
      iconClass: 'text-[#1F5FBF] dark:text-[#60A5FA]',
      bgClass: 'bg-[#EFF6FF] dark:bg-[#1F5FBF]/15 border-[#BFDBFE] dark:border-[#1F5FBF]/30',
      to: '/requests?datePreset=THIS_MONTH',
    },
    {
      label: 'Pending Requests',
      value: stats?.counts?.pending ?? 0,
      sub: 'Awaiting your review',
      icon: Clock,
      topBarClass: 'bg-[#F5B700]',
      iconClass: 'text-[#D97706] dark:text-[#FBBF24]',
      bgClass: 'bg-[#FFFBEB] dark:bg-[#F5B700]/15 border-[#FDE68A] dark:border-[#F5B700]/30',
      to: '/requests?status=PENDING_APPROVAL&datePreset=THIS_MONTH',
    },
    {
      label: 'Approved Requests',
      value: stats?.counts?.approved ?? 0,
      sub: 'Reviewed & authorized',
      icon: CheckCircle2,
      topBarClass: 'bg-[#059669]',
      iconClass: 'text-[#059669] dark:text-[#34D399]',
      bgClass: 'bg-[#ECFDF5] dark:bg-[#059669]/15 border-[#A7F3D0] dark:border-[#059669]/30',
      to: '/requests?status=APPROVED&datePreset=THIS_MONTH',
    },
    {
      label: 'Paid Requests',
      value: stats?.counts?.paid ?? 0,
      sub: stats?.amounts?.totalPaid ? `${fmtMoney(stats.amounts.totalPaid)} disbursed this month` : 'Disbursed this month',
      icon: Banknote,
      topBarClass: 'bg-[#2563EB]',
      iconClass: 'text-[#2563EB] dark:text-[#818CF8]',
      bgClass: 'bg-[#EEF2FF] dark:bg-[#2563EB]/15 border-[#C7D2FE] dark:border-[#2563EB]/30',
      to: '/requests?status=PAID&datePreset=THIS_MONTH',
    },
    {
      label: 'Completed Requests',
      value: stats?.counts?.completed ?? 0,
      sub: 'Settled & reconciled',
      icon: CheckCheck,
      topBarClass: 'bg-[#0D9488]',
      iconClass: 'text-[#0D9488] dark:text-[#2DD4BF]',
      bgClass: 'bg-[#F0FDFA] dark:bg-[#0D9488]/15 border-[#99F6E4] dark:border-[#0D9488]/30',
      to: '/requests?status=COMPLETED&datePreset=THIS_MONTH',
    },
    {
      label: 'Rejected Requests',
      value: stats?.counts?.rejected ?? 0,
      sub: 'Not approved this month',
      icon: XCircle,
      topBarClass: 'bg-[#DC2626]',
      iconClass: 'text-[#DC2626] dark:text-[#F87171]',
      bgClass: 'bg-[#FEF2F2] dark:bg-[#DC2626]/15 border-[#FECACA] dark:border-[#DC2626]/30',
      to: '/requests?status=REJECTED&datePreset=THIS_MONTH',
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Low Balance Float Alert (Accountant - Threshold < $300) ── */}
      {funds?.perCompany?.some((c: any) => c.balance < 300) && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-300 rounded-xl text-xs font-medium animate-in fade-in-50 duration-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Low Float Alert (Threshold &lt; $300):</strong>{' '}
              {funds.perCompany
                .filter((c: any) => c.balance < 300)
                .map((c: any) => `${c.name} available balance is $${Number(c.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
                .join('; ')}
              {' '}— please replenish float reserves.
            </span>
            <Link to="/funds">
              <Button variant="gold" size="xs" className="h-6 px-2.5 text-[11px] font-bold shadow-xs">
                Replenish Float →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Section 1: Liquidity & Fund Balances ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2 font-display">
              <Wallet className="h-4 w-4 text-[#F5B700]" />
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

      {/* ── Section 3: Recent Petty Cash Requests (View All Requests) ── */}
      <Card className="shadow-xs overflow-hidden border border-border/80 bg-card mt-6">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2 font-display">
              <Receipt className="h-4 w-4 text-[#F5B700] dark:text-[#FBBF24]" />
              Recent Petty Cash Requests
            </h3>
            <p className="text-xs text-muted-foreground">Latest submissions pending cashier payout & audit</p>
          </div>
          <Link
            to="/requests"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D97706] dark:text-[#FBBF24] hover:text-[#B45309] dark:hover:text-[#F59E0B] px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-all w-fit"
          >
            View All Requests <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <RequestsTable
            rows={recentRequests}
            showEmployee={true}
            showCompany={true}
            showRemarks={false}
            emptyMessage={
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent requests found for this filter.
              </div>
            }
          />
        </CardContent>
        {recentRequests.length > 0 && (
          <div className="p-3 bg-muted/20 border-t border-border flex justify-center">
            <Link
              to="/requests"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
            >
              View complete requests archive ({stats?.counts?.total ?? recentRequests.length} total) →
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};

// 3. EMPLOYEE DASHBOARD
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
      topBarClass: 'bg-[#1F5FBF]',
      iconClass: 'text-[#1F5FBF] dark:text-[#60A5FA]',
      bgClass: 'bg-[#EFF6FF] dark:bg-[#1F5FBF]/15 border-[#BFDBFE] dark:border-[#1F5FBF]/30',
      to: '/requests?datePreset=THIS_MONTH',
    },
    {
      label: 'Pending',
      value: stats?.counts?.pending ?? 0,
      sub: 'Awaiting review',
      icon: Clock,
      topBarClass: 'bg-[#F5B700]',
      iconClass: 'text-[#D97706] dark:text-[#FBBF24]',
      bgClass: 'bg-[#FFFBEB] dark:bg-[#F5B700]/15 border-[#FDE68A] dark:border-[#F5B700]/30',
      to: '/requests?status=PENDING_APPROVAL&datePreset=THIS_MONTH',
    },
    {
      label: 'Approved',
      value: stats?.counts?.approved ?? 0,
      sub: 'Ready for payment',
      icon: CheckCircle2,
      topBarClass: 'bg-[#059669]',
      iconClass: 'text-[#059669] dark:text-[#34D399]',
      bgClass: 'bg-[#ECFDF5] dark:bg-[#059669]/15 border-[#A7F3D0] dark:border-[#059669]/30',
      to: '/requests?status=APPROVED&datePreset=THIS_MONTH',
    },
    {
      label: 'Paid',
      value: stats?.counts?.paid ?? 0,
      sub: stats?.amounts?.totalPaid ? `${fmtMoney(stats.amounts.totalPaid)} disbursed this month` : 'Disbursed this month',
      icon: Banknote,
      topBarClass: 'bg-[#2563EB]',
      iconClass: 'text-[#2563EB] dark:text-[#818CF8]',
      bgClass: 'bg-[#EEF2FF] dark:bg-[#2563EB]/15 border-[#C7D2FE] dark:border-[#2563EB]/30',
      to: '/requests?status=PAID&datePreset=THIS_MONTH',
    },
    {
      label: 'Completed',
      value: stats?.counts?.completed ?? 0,
      sub: 'Settled & closed',
      icon: CheckCheck,
      topBarClass: 'bg-[#0D9488]',
      iconClass: 'text-[#0D9488] dark:text-[#2DD4BF]',
      bgClass: 'bg-[#F0FDFA] dark:bg-[#0D9488]/15 border-[#99F6E4] dark:border-[#0D9488]/30',
      to: '/requests?status=COMPLETED&datePreset=THIS_MONTH',
    },
    {
      label: 'Rejected',
      value: stats?.counts?.rejected ?? 0,
      sub: 'Not approved',
      icon: XCircle,
      topBarClass: 'bg-[#DC2626]',
      iconClass: 'text-[#DC2626] dark:text-[#F87171]',
      bgClass: 'bg-[#FEF2F2] dark:bg-[#DC2626]/15 border-[#FECACA] dark:border-[#DC2626]/30',
      to: '/requests?status=REJECTED&datePreset=THIS_MONTH',
    },
  ];

  return (
    <div className="space-y-6">

      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground font-display">My Request Status</h2>
          <p className="text-xs text-muted-foreground">Workflow status and recent regional submissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/transactions">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
              My Reports
            </Button>
          </Link>
          <Link to="/requests/new">
            <Button variant="default" size="sm" className="gap-2 shadow-sm bg-gradient-to-r from-[#FFC30B] to-[#F5B700] text-slate-950 font-bold hover:brightness-105">
              <PlusCircle className="h-4 w-4" />
              New Petty Cash Request
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Section: Petty Cash Summary Widget ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2 font-display">
              <Wallet className="h-4 w-4 text-[#F5B700]" />
              Petty Cash Summary (This Month)
            </h3>
            <p className="text-xs text-muted-foreground">Personal disbursement and settlement status for {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}</p>
          </div>
          <Link to="/transactions" className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
            View My Reports <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <SummaryCard
            label="My Total Requests (Bishan)"
            value={stats?.counts?.total ?? 0}
            sub={`${stats?.counts?.pending ?? 0} currently in review`}
            hero
            to="/requests?datePreset=THIS_MONTH"
          />
          <SummaryCard
            label="Disbursed Cash (PAID)"
            value={fmtMoney(stats?.amounts?.totalPaid ?? 0)}
            sub={`${stats?.counts?.paid ?? 0} disbursed transactions`}
            hero
            to="/transactions"
          />
          <SummaryCard
            label="Pending Settlement"
            value={stats?.counts?.paid ?? 0}
            sub="Rasiidhada weli ku dhiman"
            hero
            to="/requests?status=PAID"
          />
        </div>
      </div>

      {/* My Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {statCards.map((c, i) => <SummaryCard key={i} {...c} />)}
      </div>

      {/* My Recent Requests */}
      <Card className="shadow-xs overflow-hidden border border-border/80 bg-card">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2 font-display">
              <Receipt className="h-4 w-4 text-[#F5B700] dark:text-[#FBBF24]" />
              My Recent Requests
            </h3>
            <p className="text-xs text-muted-foreground">Your recent regional petty cash submissions</p>
          </div>
          <Link
            to="/requests"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D97706] dark:text-[#FBBF24] hover:text-[#B45309] dark:hover:text-[#F59E0B] px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-all w-fit"
          >
            View All Requests <ArrowRight className="h-3.5 w-3.5" />
          </Link>
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
        {myRequests.length > 0 && (
          <div className="p-3 bg-muted/20 border-t border-border flex justify-center">
            <Link
              to="/requests"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
            >
              View all my requests ({myRequests.length}) →
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};

const Loader: React.FC = () => (
  <div className="flex items-center justify-center h-64 gap-3">
    <Loader2 className="h-7 w-7 animate-spin text-primary" />
    <span className="text-sm text-muted-foreground font-medium">Loading dashboard…</span>
  </div>
);

// ROOT EXPORT — picks dashboard by role
export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Loader />;

  if (user.role === 'SUPER_ADMIN' || user.role === 'APPROVAL_TWO') return <SuperAdminDashboard />;
  if (user.role === 'ACCOUNTANT') return <AccountantDashboard />;
  return <EmployeeDashboard />;
};

export default DashboardPage;
