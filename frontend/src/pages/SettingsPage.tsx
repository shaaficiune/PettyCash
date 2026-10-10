import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ColumnDef } from '@tanstack/react-table';
import {
  ShieldCheck,
  Activity,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Building,
  User,
  Lock,
} from 'lucide-react';
import { formatDate } from '../utils/format';
import { DataTable, DataTableColumnHeader } from '../components/ui/data-table';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Select,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Tabs,
  TabsList,
  TabsTrigger,
} from '../components/ui';
import { EmptyState } from '../components/ui/EmptyState';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    fullName: string;
    username: string;
    phone?: string;
  } | null;
}

const ACTION_CATEGORIES: Record<string, string[]> = {
  ALL: [],
  AUTH: ['LOGIN', 'LOGOUT'],
  REQUESTS: [
    'CREATE_REQUEST',
    'UPDATE_REQUEST',
    'DELETE_REQUEST',
    'APPROVE_REQUEST',
    'REJECT_REQUEST',
    'CORRECTION_REQUIRED',
    'REVIEW_REQUEST',
  ],
  SETTLEMENTS: [
    'SUBMIT_SETTLEMENT',
    'APPROVE_SETTLEMENT',
    'REJECT_SETTLEMENT',
    'REVIEW_SETTLEMENT',
  ],
  PAYMENTS: ['RECORD_PAYMENT'],
  USERS: ['CREATE_USER', 'UPDATE_USER', 'DISABLE_USER'],
};

interface EventNarrative {
  badge: {
    label: string;
    variant: 'success' | 'destructive' | 'warning' | 'info' | 'secondary';
  };
  sentence: string;
  subContext?: string;
  detailsList: Array<{ label: string; value: string }>;
  rawJson: string;
}

function formatIpAddress(ip: string | null): string {
  if (!ip) return 'Office Network';
  if (ip === '::1' || ip === '127.0.0.1' || ip.includes('::ffff:127.0.0.1')) return '127.0.0.1 (Local)';
  return ip.replace('::ffff:', '');
}

function parseDevice(ua: string | null): string {
  if (!ua) return 'Web Browser';
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Macintosh')) return 'Mac OS';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Mobile';
  if (ua.includes('Android')) return 'Android Mobile';
  return 'Web Client';
}

function getEventNarrative(log: AuditLogItem): EventNarrative {
  const actorName = log.user?.fullName || (log.user?.username ? `@${log.user.username}` : 'System');

  let body: any = {};
  let url = '';
  try {
    const parsed = JSON.parse(log.details || '{}');
    body = parsed.body || {};
    url = parsed.url || '';
  } catch {}

  const action = log.action;

  // 1. Authentication
  if (action === 'LOGIN' || url.includes('/auth/login')) {
    const targetUser = body.username ? `@${body.username}` : actorName;
    return {
      badge: { label: 'Login', variant: 'success' },
      sentence: `User ${targetUser} logged in`,
      subContext: 'Account signed in successfully',
      detailsList: [
        { label: 'Operator', value: actorName },
        { label: 'Username', value: targetUser },
        { label: 'Authentication', value: 'Verified & Granted' },
      ],
      rawJson: log.details || '',
    };
  }

  if (action === 'LOGOUT' || url.includes('/auth/logout')) {
    return {
      badge: { label: 'Logout', variant: 'secondary' },
      sentence: `User ${actorName} logged out`,
      subContext: 'Active session closed',
      detailsList: [
        { label: 'Operator', value: actorName },
        { label: 'Session Status', value: 'Ended' },
      ],
      rawJson: log.details || '',
    };
  }

  // 2. Request Approvals & Reviews
  if (action === 'APPROVE_REQUEST') {
    return {
      badge: { label: 'Approved', variant: 'success' },
      sentence: `User ${actorName} approved request`,
      subContext: body.reviewNotes ? `Notes: "${body.reviewNotes}"` : 'Approved for payment disbursement',
      detailsList: [
        { label: 'Approved By', value: actorName },
        { label: 'Action Decision', value: 'Approved for Disbursement' },
        ...(body.reviewNotes ? [{ label: 'Approval Notes', value: body.reviewNotes }] : []),
      ],
      rawJson: log.details || '',
    };
  }

  if (action === 'REJECT_REQUEST') {
    const reason = body.reviewNotes || body.reason || '';
    return {
      badge: { label: 'Rejected', variant: 'destructive' },
      sentence: `User ${actorName} rejected request`,
      subContext: reason ? `Reason: "${reason}"` : 'Declined by reviewer',
      detailsList: [
        { label: 'Reviewed By', value: actorName },
        { label: 'Action Decision', value: 'Request Rejected' },
        ...(reason ? [{ label: 'Rejection Reason', value: reason }] : []),
      ],
      rawJson: log.details || '',
    };
  }

  if (action === 'CORRECTION_REQUIRED') {
    return {
      badge: { label: 'Returned', variant: 'warning' },
      sentence: `User ${actorName} returned request for correction`,
      subContext: body.reviewNotes ? `Feedback: "${body.reviewNotes}"` : 'Action required by requester',
      detailsList: [
        { label: 'Reviewed By', value: actorName },
        { label: 'Action Decision', value: 'Needs Correction' },
        ...(body.reviewNotes ? [{ label: 'Review Notes', value: body.reviewNotes }] : []),
      ],
      rawJson: log.details || '',
    };
  }

  // 3. Petty Cash Requests
  if (action === 'CREATE_REQUEST') {
    const amtStr = body.amount ? `$${Number(body.amount).toLocaleString()}` : '';
    const purposeStr = body.purpose ? body.purpose : '';
    return {
      badge: { label: 'Request', variant: 'info' },
      sentence: `User ${actorName} submitted request${amtStr ? ` for ${amtStr}` : ''}`,
      subContext: purposeStr ? `Purpose: ${purposeStr}` : 'New petty cash request submitted',
      detailsList: [
        { label: 'Submitted By', value: actorName },
        ...(amtStr ? [{ label: 'Requested Amount', value: amtStr }] : []),
        ...(purposeStr ? [{ label: 'Expense Purpose', value: purposeStr }] : []),
      ],
      rawJson: log.details || '',
    };
  }

  if (action === 'UPDATE_REQUEST') {
    return {
      badge: { label: 'Updated', variant: 'warning' },
      sentence: `User ${actorName} updated request details`,
      subContext: body.purpose ? `Purpose: ${body.purpose}` : 'Request fields modified',
      detailsList: [
        { label: 'Modified By', value: actorName },
        ...(body.purpose ? [{ label: 'Purpose', value: body.purpose }] : []),
      ],
      rawJson: log.details || '',
    };
  }

  if (action === 'DELETE_REQUEST') {
    return {
      badge: { label: 'Cancelled', variant: 'destructive' },
      sentence: `User ${actorName} cancelled request`,
      subContext: 'Petty cash request removed',
      detailsList: [
        { label: 'Cancelled By', value: actorName },
      ],
      rawJson: log.details || '',
    };
  }

  // 4. Payments
  if (action === 'RECORD_PAYMENT') {
    const amtStr = body.amount || body.paidAmount ? `$${Number(body.amount || body.paidAmount).toLocaleString()}` : '';
    const methodStr = body.paymentMethod ? `via ${body.paymentMethod}` : '';
    return {
      badge: { label: 'Paid', variant: 'success' },
      sentence: `User ${actorName} paid payment${amtStr ? ` of ${amtStr}` : ''}`,
      subContext: [methodStr, body.referenceNumber ? `Ref: ${body.referenceNumber}` : ''].filter(Boolean).join(' · ') || 'Disbursed cash voucher',
      detailsList: [
        { label: 'Paid By', value: actorName },
        ...(amtStr ? [{ label: 'Paid Amount', value: amtStr }] : []),
        ...(body.paymentMethod ? [{ label: 'Payment Method', value: body.paymentMethod }] : []),
        ...(body.referenceNumber ? [{ label: 'Payment Reference', value: body.referenceNumber }] : []),
      ],
      rawJson: log.details || '',
    };
  }

  // 5. Settlements
  if (action === 'SUBMIT_SETTLEMENT') {
    const amtStr = body.actualExpenseAmount ? `$${Number(body.actualExpenseAmount).toLocaleString()}` : '';
    return {
      badge: { label: 'Settlement', variant: 'info' },
      sentence: `User ${actorName} submitted settlement${amtStr ? ` (${amtStr})` : ''}`,
      subContext: 'Receipt vouchers attached for audit',
      detailsList: [
        { label: 'Submitted By', value: actorName },
        ...(amtStr ? [{ label: 'Actual Expenses', value: amtStr }] : []),
      ],
      rawJson: log.details || '',
    };
  }

  if (action === 'APPROVE_SETTLEMENT') {
    return {
      badge: { label: 'Settled', variant: 'success' },
      sentence: `User ${actorName} approved settlement`,
      subContext: 'Expense receipts audited and cleared',
      detailsList: [
        { label: 'Audited By', value: actorName },
        { label: 'Settlement Status', value: 'Cleared & Closed' },
      ],
      rawJson: log.details || '',
    };
  }

  if (action === 'REJECT_SETTLEMENT') {
    return {
      badge: { label: 'Rejected', variant: 'destructive' },
      sentence: `User ${actorName} rejected settlement`,
      subContext: body.reviewNotes ? `Notes: "${body.reviewNotes}"` : 'Receipts failed audit verification',
      detailsList: [
        { label: 'Audited By', value: actorName },
        ...(body.reviewNotes ? [{ label: 'Audit Notes', value: body.reviewNotes }] : []),
      ],
      rawJson: log.details || '',
    };
  }

  // 6. User Management
  if (action === 'CREATE_USER') {
    const newUsername = body.username ? `@${body.username}` : (body.fullName || 'staff');
    const roleStr = body.role ? ` (${body.role})` : '';
    return {
      badge: { label: 'User Created', variant: 'info' },
      sentence: `User ${actorName} created user ${newUsername}${roleStr}`,
      subContext: 'New user registered in directory',
      detailsList: [
        { label: 'Created By', value: actorName },
        { label: 'New Account', value: newUsername },
        ...(body.role ? [{ label: 'Assigned Role', value: body.role }] : []),
      ],
      rawJson: log.details || '',
    };
  }

  if (action === 'UPDATE_USER') {
    return {
      badge: { label: 'User Updated', variant: 'warning' },
      sentence: `User ${actorName} updated user ${body.username ? `@${body.username}` : ''}`,
      subContext: 'User profile / role modified',
      detailsList: [
        { label: 'Modified By', value: actorName },
        ...(body.username ? [{ label: 'Target Account', value: `@${body.username}` }] : []),
      ],
      rawJson: log.details || '',
    };
  }

  if (action === 'DISABLE_USER') {
    return {
      badge: { label: 'User Disabled', variant: 'destructive' },
      sentence: `User ${actorName} deactivated staff account`,
      subContext: 'Account permissions revoked',
      detailsList: [
        { label: 'Deactivated By', value: actorName },
      ],
      rawJson: log.details || '',
    };
  }

  // Fallback
  return {
    badge: { label: action.replace(/_/g, ' '), variant: 'secondary' },
    sentence: `User ${actorName} performed ${action.toLowerCase().replace(/_/g, ' ')}`,
    subContext: 'System recorded administrative action',
    detailsList: [
      { label: 'Operator', value: actorName },
      { label: 'Action', value: action },
    ],
    rawJson: log.details || '',
  };
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'audit' | 'analytics' | 'organization'>('audit');

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  // Filters
  const [actionCategory, setActionCategory] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<'ALL' | 'THIS_MONTH' | 'THIS_WEEK' | 'TODAY' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Organization Data for Tab 3
  const [companies, setCompanies] = useState<any[]>([]);

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/audit-logs?limit=500');
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    api.get('/companies')
      .then((res) => setCompanies(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCompanies([]));
  }, []);

  // Date Preset handler
  const applyDatePreset = (preset: 'ALL' | 'THIS_MONTH' | 'THIS_WEEK' | 'TODAY' | 'CUSTOM') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'TODAY') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      setStartDate(monday.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category filter
      if (actionCategory !== 'ALL') {
        const allowed = ACTION_CATEGORIES[actionCategory] || [];
        if (!allowed.includes(log.action)) return false;
      }

      // Date filter
      if (startDate) {
        const logDate = log.createdAt.slice(0, 10);
        if (logDate < startDate) return false;
      }
      if (endDate) {
        const logDate = log.createdAt.slice(0, 10);
        if (logDate > endDate) return false;
      }

      return true;
    });
  }, [logs, actionCategory, startDate, endDate]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Action', 'User', 'Username', 'IP Address', 'Details'];
    const rows = filteredLogs.map((l) => [
      new Date(l.createdAt).toISOString(),
      l.action,
      `"${(l.user?.fullName || 'System').replace(/"/g, '""')}"`,
      `"${(l.user?.username || '').replace(/"/g, '""')}"`,
      l.ipAddress || '',
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  // DataTable Columns definition
  const columns: ColumnDef<AuditLogItem>[] = useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        meta: { title: 'Timestamp' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Timestamp" />
        ),
        cell: ({ row }) => {
          const d = new Date(row.original.createdAt);
          return (
            <div className="min-w-[90px]">
              <p className="font-semibold text-foreground text-xs leading-none whitespace-nowrap">
                {formatDate(row.original.createdAt)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          );
        },
      },

      {
        accessorKey: 'action',
        meta: { title: 'Type' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => {
          const narrative = getEventNarrative(row.original);
          return (
            <Badge variant={narrative.badge.variant} size="sm" className="whitespace-nowrap font-medium text-[10px]">
              {narrative.badge.label}
            </Badge>
          );
        },
      },

      {
        id: 'activity',
        meta: { title: 'Activity Summary' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Activity Summary" />
        ),
        cell: ({ row }) => {
          const narrative = getEventNarrative(row.original);
          return (
            <div className="min-w-[200px] max-w-[420px]">
              <p className="text-xs font-semibold text-foreground leading-snug">
                {narrative.sentence}
              </p>
              {narrative.subContext && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {narrative.subContext}
                </p>
              )}
            </div>
          );
        },
      },

      {
        id: 'user',
        meta: { title: 'Operator / Staff' },
        accessorFn: (row) => row.user?.fullName || row.user?.username || 'System',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Operator / Staff" />
        ),
        cell: ({ row }) => {
          const l = row.original;
          return (
            <div className="min-w-[120px] max-w-[170px]">
              <p className="font-medium text-foreground text-xs truncate">
                {l.user?.fullName || 'System Automated'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate font-mono">
                {l.user?.username ? `@${l.user.username}` : 'Internal'}
              </p>
            </div>
          );
        },
      },

      {
        accessorKey: 'ipAddress',
        meta: { title: 'Connection / IP' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Connection / IP" />
        ),
        cell: ({ row }) => (
          <div className="min-w-[80px]">
            <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
              {formatIpAddress(row.original.ipAddress)}
            </span>
          </div>
        ),
      },

      {
        id: 'actions',
        header: () => <div className="text-center">Inspect</div>,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelectedLog(row.original)}
              title="Inspect Event"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  // Analytics computation
  const analyticsSummary = useMemo(() => {
    const actionCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};
    const today = new Date().toISOString().slice(0, 10);
    let todayEvents = 0;

    logs.forEach((log) => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      const u = log.user?.fullName || 'System';
      userCounts[u] = (userCounts[u] || 0) + 1;
      if (log.createdAt.slice(0, 10) === today) {
        todayEvents += 1;
      }
    });

    const topActions = Object.entries(actionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const topUsers = Object.entries(userCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: logs.length,
      todayEvents,
      topActions,
      topUsers,
      uniqueUsers: Object.keys(userCounts).length,
    };
  }, [logs]);

  return (
    <div className="space-y-4 font-sans">
      {/* ── HEADER SECTION (Matching CashDesk Page Standards) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            System Audit &amp; Analytics
          </h2>
          <p className="text-xs text-muted-foreground">
            Administrative audit trails, system activity metrics, and organizational parameters
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList>
              <TabsTrigger value="audit" className="gap-1.5 text-xs">
                <ShieldCheck className="h-3.5 w-3.5" /> Audit Trail
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5 text-xs">
                <Activity className="h-3.5 w-3.5" /> Activity Analytics
              </TabsTrigger>
              <TabsTrigger value="organization" className="gap-1.5 text-xs">
                <Building className="h-3.5 w-3.5" /> Organization
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditLogs}
            disabled={loading}
            className="gap-1.5 text-xs h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {activeTab === 'audit' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="gap-1.5 text-xs h-8"
            >
              <Download className="h-3.5 w-3.5" />
              Export (CSV)
            </Button>
          )}
        </div>
      </div>

      {/* ════════════════ TAB 1: SYSTEM AUDIT TRAIL ════════════════ */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* FILTER CARD (Matching TransactionsPage / RequestsListPage pattern) */}
          <Card className="bg-card border-border shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* DATE RANGE PRESETS */}
                <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 dark:bg-muted/40 p-1 rounded-lg">
                  {(['ALL', 'THIS_MONTH', 'THIS_WEEK', 'TODAY', 'CUSTOM'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => applyDatePreset(preset)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        datePreset === preset
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {preset === 'ALL'
                        ? 'All Time'
                        : preset === 'THIS_MONTH'
                        ? 'This Month'
                        : preset === 'THIS_WEEK'
                        ? 'This Week'
                        : preset === 'TODAY'
                        ? 'Today'
                        : 'Custom'}
                    </button>
                  ))}
                </div>

                {/* ACTION CATEGORY FILTER */}
                <div className="flex items-center gap-1.5 min-w-[180px]">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Select
                    value={actionCategory}
                    onChange={(e) => setActionCategory(e.target.value)}
                    className="text-xs h-8"
                  >
                    <option value="ALL">All Event Categories</option>
                    <option value="AUTH">Authentication (Login/Logout)</option>
                    <option value="REQUESTS">Petty Cash Requests</option>
                    <option value="SETTLEMENTS">Settlement Audits</option>
                    <option value="PAYMENTS">Disbursements &amp; Payments</option>
                    <option value="USERS">User Administration</option>
                  </Select>
                </div>
              </div>

              {/* CUSTOM DATE RANGE PICKER */}
              {datePreset === 'CUSTOM' && (
                <div className="flex flex-wrap items-center gap-2 pt-2.5 mt-2.5 border-t border-border text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground">Custom Range:</span>
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
              )}
            </CardContent>
          </Card>

          {/* STANDARDIZED DATA TABLE */}
          <DataTable
            columns={columns}
            data={filteredLogs}
            isLoading={loading}
            searchPlaceholder="Filter audit trail by action, user, IP, or payload..."
            pageSize={20}
            pageSizeOptions={[10, 20, 50, 100]}
            emptyState={
              <EmptyState
                icon={ShieldCheck}
                title="No audit events found"
                description="No logged administrative events match your filter criteria."
              />
            }
          />
        </div>
      )}

      {/* ════════════════ TAB 2: ACTIVITY ANALYTICS ════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 border-border bg-card shadow-xs">
              <span className="text-xs font-medium text-muted-foreground">Total Logged Actions</span>
              <div className="text-xl font-bold text-foreground mt-1">
                {analyticsSummary.total.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">All recorded system events</p>
            </Card>

            <Card className="p-4 border-border bg-card shadow-xs">
              <span className="text-xs font-medium text-muted-foreground">Today's Activity</span>
              <div className="text-xl font-bold text-foreground mt-1">
                {analyticsSummary.todayEvents.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Events logged today</p>
            </Card>

            <Card className="p-4 border-border bg-card shadow-xs">
              <span className="text-xs font-medium text-muted-foreground">Active Operators</span>
              <div className="text-xl font-bold text-foreground mt-1">
                {analyticsSummary.uniqueUsers}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Unique staff accounts</p>
            </Card>

            <Card className="p-4 border-border bg-card shadow-xs">
              <span className="text-xs font-medium text-muted-foreground">Most Frequent Action</span>
              <div className="text-base font-bold text-foreground mt-1 truncate">
                {analyticsSummary.topActions[0]?.name || '—'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {analyticsSummary.topActions[0]?.count || 0} occurrences
              </p>
            </Card>
          </div>

          {/* CHARTS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Action Distribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Frequency of administrative and financial operations
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {analyticsSummary.topActions.length === 0 ? (
                  <div className="h-60 flex items-center justify-center text-xs text-muted-foreground">
                    No activity data available.
                  </div>
                ) : (
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsSummary.topActions} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '0.5rem',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Most Active Staff Accounts
                </CardTitle>
                <CardDescription className="text-xs">
                  Operators with the highest volume of audit events
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-3">
                  {analyticsSummary.topUsers.map((item, idx) => {
                    const percentage = analyticsSummary.total > 0
                      ? Math.round((item.count / analyticsSummary.total) * 100)
                      : 0;

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-foreground">{item.name}</span>
                          <span className="text-muted-foreground font-mono">
                            {item.count} events ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(4, percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ════════════════ TAB 3: ORGANIZATION & SYSTEM ════════════════ */}
      {activeTab === 'organization' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* COMPANY DIRECTORY */}
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  Operating Companies
                </CardTitle>
                <CardDescription className="text-xs">
                  Active organizational entities within the Petty Cash system
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 divide-y divide-border/40">
                {companies.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No companies registered.</p>
                ) : (
                  companies.map((c) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Code: {c.code || c.id.slice(0, 8)} · Currency: {c.currency || 'USD'}
                        </p>
                      </div>
                      <Badge variant="secondary" size="sm">
                        Active
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* ACCOUNT CREDENTIAL & PROFILE */}
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Current Session &amp; Credentials
                </CardTitle>
                <CardDescription className="text-xs">
                  Your active authorization context and account security
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Account Name</span>
                  <span className="font-semibold text-foreground">{user?.fullName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Username / Phone</span>
                  <span className="font-mono text-foreground">{user?.username || user?.phone || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Role Privileges</span>
                  <Badge variant="default" size="sm">
                    {user?.role}
                  </Badge>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Assigned Scope</span>
                  <span className="font-semibold text-foreground">
                    {user?.company?.name || 'All Companies (Super Admin)'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── DETAIL INSPECTION DIALOG (Matching App Modal Styling) ── */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        {selectedLog && (() => {
          const narrative = getEventNarrative(selectedLog);
          return (
            <DialogContent onClose={() => setSelectedLog(null)} className="sm:max-w-md p-0 overflow-hidden">
              <DialogHeader className="p-5 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Audit Event Detail
                  </DialogTitle>
                  <Badge variant={narrative.badge.variant} size="sm">
                    {narrative.badge.label}
                  </Badge>
                </div>
                <DialogDescription className="text-xs">
                  Event ID: {selectedLog.id} · {formatDate(selectedLog.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="p-5 space-y-3.5 max-h-[70vh] overflow-y-auto text-xs">
                {/* Event Overview Banner */}
                <div className="p-3.5 bg-muted/40 rounded-xl space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Activity Summary
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    {narrative.sentence}
                  </p>
                  {narrative.subContext && (
                    <p className="text-xs text-muted-foreground">
                      {narrative.subContext}
                    </p>
                  )}
                </div>

                {/* Operator & Network Connection */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-muted/40 rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Operator</span>
                    <p className="font-semibold text-foreground mt-1 truncate">
                      {selectedLog.user?.fullName || 'System Automated'}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {selectedLog.user?.username ? `@${selectedLog.user.username}` : '—'}
                    </p>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Connection &amp; Device</span>
                    <p className="font-mono text-foreground font-semibold mt-1">
                      {formatIpAddress(selectedLog.ipAddress)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {parseDevice(selectedLog.userAgent)}
                    </p>
                  </div>
                </div>

                {/* Action Specific Details */}
                {narrative.detailsList.length > 0 && (
                  <div className="p-3 bg-muted/40 rounded-xl space-y-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Action Specifics
                    </span>
                    <div className="divide-y divide-border/60">
                      {narrative.detailsList.map((item, idx) => (
                        <div key={idx} className="py-1.5 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-semibold text-foreground max-w-[240px] truncate text-right">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Raw Payload (Collapsed & Subtle) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                  >
                    {showRawJson ? '▼ Hide technical raw details' : '► View technical raw details'}
                  </button>
                  {showRawJson && (
                    <pre className="mt-2 font-mono text-[10px] text-foreground bg-card p-2.5 rounded-lg border border-border overflow-x-auto whitespace-pre-wrap max-h-40">
                      {narrative.rawJson}
                    </pre>
                  )}
                </div>
              </div>

              <DialogFooter className="p-4 border-t border-border bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
};

export default SettingsPage;
