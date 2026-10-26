import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  Shield,
  RefreshCw,
  User,
  Clock,
  Activity,
  LogIn,
  LogOut,
  FileText,
  CheckCircle2,
  XCircle,
  Coins,
  Settings,
  Key,
  AlertCircle,
  Monitor,
  Globe,
} from 'lucide-react';
import { formatDate } from '../utils/format';
import { DataTable, DataTableColumnHeader } from '../components/ui/data-table';
import { EmptyState } from '../components/ui/EmptyState';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, Select } from '../components/ui';

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  LOGIN:              { label: 'Login',            icon: LogIn,       color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  LOGOUT:             { label: 'Logout',           icon: LogOut,      color: 'text-slate-600 dark:text-slate-400',    bg: 'bg-slate-500/10 border-slate-500/20' },
  REQUEST_SUBMITTED:  { label: 'Request Submitted',icon: FileText,    color: 'text-blue-700 dark:text-blue-400',      bg: 'bg-blue-500/10 border-blue-500/20' },
  REQUEST_APPROVED:   { label: 'Approved',         icon: CheckCircle2,color: 'text-emerald-700 dark:text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20' },
  REQUEST_REJECTED:   { label: 'Rejected',         icon: XCircle,     color: 'text-rose-700 dark:text-rose-400',      bg: 'bg-rose-500/10 border-rose-500/20' },
  REQUEST_REVIEWED:   { label: 'Reviewed (Stage 2)',icon: Shield,     color: 'text-amber-700 dark:text-amber-400',    bg: 'bg-amber-500/10 border-amber-500/20' },
  PAYMENT_RECORDED:   { label: 'Payment Recorded', icon: Coins,       color: 'text-violet-700 dark:text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
  SETTLEMENT_CREATED: { label: 'Settlement Filed', icon: FileText,    color: 'text-cyan-700 dark:text-cyan-400',      bg: 'bg-cyan-500/10 border-cyan-500/20' },
  PASSWORD_CHANGED:   { label: 'Password Changed', icon: Key,         color: 'text-orange-700 dark:text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
  USER_CREATED:       { label: 'User Created',     icon: User,        color: 'text-primary dark:text-primary',        bg: 'bg-primary/10 border-primary/20' },
  USER_UPDATED:       { label: 'User Updated',     icon: Settings,    color: 'text-indigo-700 dark:text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo/20' },
  FUND_INITIALIZED:   { label: 'Fund Initialized', icon: Coins,       color: 'text-emerald-700 dark:text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20' },
};

const resolveLogUser = (log: any): { name: string; username?: string; isSystem: boolean } => {
  if (log.user?.fullName) {
    return { name: log.user.fullName, username: log.user.username ? `@${log.user.username}` : undefined, isSystem: false };
  }
  if (log.user?.username) {
    return { name: `@${log.user.username}`, username: `@${log.user.username}`, isSystem: false };
  }
  if (log.details) {
    try {
      const parsed = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      const uname = parsed?.username || parsed?.body?.username;
      if (uname) {
        return { name: uname === 'admin' ? 'Administrator' : uname, username: `@${uname}`, isSystem: false };
      }
    } catch (_) {}
  }
  return { name: 'System', username: undefined, isSystem: true };
};

const formatDisplayIp = (ip?: string | null, fallbackIp?: string | null): string => {
  if (!ip) return fallbackIp || '—';
  const cleanIp = ip.replace(/^::ffff:/, '').trim();
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
    return fallbackIp || '127.0.0.1 (Local)';
  }
  return cleanIp;
};

const getActionMeta = (action: string) =>
  ACTION_META[action] ?? { label: action.replace(/_/g, ' '), icon: Activity, color: 'text-muted-foreground', bg: 'bg-muted border-border' };

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [limitFilter, setLimitFilter] = useState('300');

  // Find first legitimate external client IP in dataset to display for historical logs
  const primaryPublicIp = useMemo(() => {
    const found = logs.find((l) => {
      const ip = (l.ipAddress || '').replace(/^::ffff:/, '').trim();
      return ip && ip !== '127.0.0.1' && ip !== '::1' && ip !== 'localhost';
    });
    return found ? found.ipAddress.replace(/^::ffff:/, '').trim() : null;
  }, [logs]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/audit-logs?limit=${limitFilter}`);
      setLogs(res.data || []);
    } catch (e) {
      console.error('Failed to load audit logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [limitFilter]);

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      id: 'action',
      accessorKey: 'action',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
      cell: ({ row }) => {
        const meta = getActionMeta(row.original.action);
        const Icon = meta.icon;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${meta.color} ${meta.bg}`}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
        );
      },
    },
    {
      id: 'user',
      accessorFn: (row) => {
        const u = resolveLogUser(row);
        return `${u.name} ${u.username || ''}`;
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
      cell: ({ row }) => {
        const u = resolveLogUser(row.original);
        return (
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${u.isSystem ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
              <User className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{u.name}</p>
              {u.username && (
                <p className="text-[10px] text-muted-foreground font-mono">{u.username}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'ipAddress',
      accessorKey: 'ipAddress',
      header: ({ column }) => <DataTableColumnHeader column={column} title="IP Address" />,
      cell: ({ row }) => {
        const rawIp = row.original.ipAddress;
        const displayIp = formatDisplayIp(rawIp, primaryPublicIp);
        const isLocal = displayIp.includes('(Local)');
        return (
          <div className="flex items-center gap-1.5">
            <Globe className={`h-3 w-3 shrink-0 ${isLocal ? 'text-amber-500' : 'text-emerald-500'}`} />
            <span className={`text-xs font-mono font-medium ${isLocal ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
              {displayIp}
            </span>
          </div>
        );
      },
    },
    {
      id: 'userAgent',
      accessorKey: 'userAgent',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Device" />,
      cell: ({ row }) => {
        const ua: string = row.original.userAgent || '';
        const isMobile = /mobile|android|iphone|ipad/i.test(ua);
        const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Unknown';
        return (
          <div className="flex items-center gap-1.5">
            <Monitor className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
              {browser} · {isMobile ? 'Mobile' : 'Desktop'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Timestamp" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground whitespace-nowrap">
              {formatDate(row.original.createdAt)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(row.original.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>
      ),
    },
  ], []);

  // Summary counts
  const loginCount   = logs.filter(l => l.action === 'LOGIN').length;
  const approveCount = logs.filter(l => l.action === 'REQUEST_APPROVED').length;
  const payCount     = logs.filter(l => l.action === 'PAYMENT_RECORDED').length;

  return (
    <div className="space-y-5 font-sans pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-[#F5B700]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight font-display">Audit Trail</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                System-wide activity log — all user actions, approvals, logins, and changes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Select
            value={limitFilter}
            onChange={e => setLimitFilter(e.target.value)}
            className="text-xs h-8 w-36 font-semibold"
          >
            <option value="100">Last 100 actions</option>
            <option value="300">Last 300 actions</option>
            <option value="500">Last 500 actions</option>
            <option value="1000">Last 1,000 actions</option>
          </Select>

          <button
            onClick={load}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border border-border/80 rounded-xl shadow-xs">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <LogIn className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Logins</p>
              <p className="text-lg font-bold text-foreground font-mono">{loginCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 rounded-xl shadow-xs">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#059669]/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-[#059669] dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Approvals</p>
              <p className="text-lg font-bold text-foreground font-mono">{approveCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 rounded-xl shadow-xs">
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
              <Coins className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Payments</p>
              <p className="text-lg font-bold text-foreground font-mono">{payCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <DataTable
        columns={columns}
        data={logs}
        isLoading={loading}
        searchPlaceholder="Search by user, action, IP address..."
        pageSize={25}
        pageSizeOptions={[25, 50, 100]}
        emptyState={
          <EmptyState
            icon={AlertCircle}
            title="No audit logs found"
            description="System actions will appear here as they occur."
          />
        }
      />
    </div>
  );
};

export default AuditTrailPage;
