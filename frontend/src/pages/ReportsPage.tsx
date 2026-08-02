import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileSpreadsheet, Search, LogIn, LogOut, UserPlus, UserCog, UserX, FileText, CheckCircle, XCircle, Banknote, RefreshCw, Trash2, Eye } from 'lucide-react';

// Map action codes → human labels, icons, colors
const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  LOGIN:           { label: 'Login',            icon: <LogIn className="h-3 w-3" />,       bg: 'bg-emerald-100 dark:bg-emerald-950/50',  text: 'text-emerald-700 dark:text-emerald-300' },
  LOGOUT:          { label: 'Logout',           icon: <LogOut className="h-3 w-3" />,      bg: 'bg-slate-100 dark:bg-slate-800',         text: 'text-slate-600 dark:text-slate-400' },
  CREATE_USER:     { label: 'User Created',     icon: <UserPlus className="h-3 w-3" />,    bg: 'bg-indigo-100 dark:bg-indigo-950/50',    text: 'text-indigo-700 dark:text-indigo-300' },
  UPDATE_USER:     { label: 'User Updated',     icon: <UserCog className="h-3 w-3" />,     bg: 'bg-amber-100 dark:bg-amber-950/50',      text: 'text-amber-700 dark:text-amber-300' },
  DISABLE_USER:    { label: 'User Deleted',     icon: <UserX className="h-3 w-3" />,       bg: 'bg-rose-100 dark:bg-rose-950/50',        text: 'text-rose-700 dark:text-rose-300' },
  DELETE_USER:     { label: 'User Deleted',     icon: <UserX className="h-3 w-3" />,       bg: 'bg-rose-100 dark:bg-rose-950/50',        text: 'text-rose-700 dark:text-rose-300' },
  CREATE_REQUEST:  { label: 'Request Created',  icon: <FileText className="h-3 w-3" />,    bg: 'bg-blue-100 dark:bg-blue-950/50',        text: 'text-blue-700 dark:text-blue-300' },
  UPDATE_REQUEST:  { label: 'Request Updated',  icon: <FileText className="h-3 w-3" />,    bg: 'bg-sky-100 dark:bg-sky-950/50',          text: 'text-sky-700 dark:text-sky-300' },
  DELETE_REQUEST:  { label: 'Request Deleted',  icon: <Trash2 className="h-3 w-3" />,      bg: 'bg-rose-100 dark:bg-rose-950/50',        text: 'text-rose-700 dark:text-rose-300' },
  APPROVE_REQUEST: { label: 'Request Approved', icon: <CheckCircle className="h-3 w-3" />, bg: 'bg-emerald-100 dark:bg-emerald-950/50',  text: 'text-emerald-700 dark:text-emerald-300' },
  REJECT_REQUEST:  { label: 'Request Rejected', icon: <XCircle className="h-3 w-3" />,     bg: 'bg-rose-100 dark:bg-rose-950/50',        text: 'text-rose-700 dark:text-rose-300' },
  RECORD_PAYMENT:  { label: 'Payment Recorded', icon: <Banknote className="h-3 w-3" />,    bg: 'bg-violet-100 dark:bg-violet-950/50',    text: 'text-violet-700 dark:text-violet-300' },
  RESET_PASSWORD:  { label: 'Password Reset',   icon: <RefreshCw className="h-3 w-3" />,   bg: 'bg-orange-100 dark:bg-orange-950/50',    text: 'text-orange-700 dark:text-orange-300' },
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
    if (body.status)
      return `Status changed to ${body.status}`;
    if (body.approvedAmount !== undefined)
      return `Approved amount: $${body.approvedAmount}`;
    if (body.purpose && body.requestedAmount)
      return `"${body.purpose}" — $${body.requestedAmount} ${body.currency || ''}`.trim();
    if (body.purpose)
      return body.purpose;
    if (body.fullName && body.username)
      return `${body.fullName} (@${body.username})`;
    if (body.fullName)
      return body.fullName;
    if (body.comments && body.comments.trim())
      return body.comments;

    return ok ? 'Completed successfully' : '';
  } catch {
    return '';
  }
}

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'audit'>('analytics');
  const [auditSearch, setAuditSearch] = useState('');

  const loadReportingData = async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const companyQuery = companyFilter !== 'ALL' ? `?companyId=${companyFilter}` : '';

      const [statsRes, breakdownRes] = await Promise.all([
        api.get(`/reports/dashboard-stats${companyQuery}`),
        api.get(`/reports/breakdowns${companyQuery}`)
      ]);

      setStats(statsRes.data);
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
    return () => {
      window.removeEventListener('companyFilterChanged', loadReportingData);
    };
  }, []);

  const handleExportCSV = () => {
    const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
    const companyQuery = companyFilter !== 'ALL' ? `&companyId=${companyFilter}` : '';
    window.open(`/api/reports/export-csv?token=${localStorage.getItem('accessToken')}${companyQuery}`);
  };

  const filteredAudits = auditLogs.filter(log => {
    const matchSearch = log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                        (log.user?.fullName && log.user.fullName.toLowerCase().includes(auditSearch.toLowerCase())) ||
                        (log.details && log.details.toLowerCase().includes(auditSearch.toLowerCase()));
    return matchSearch;
  });

  const COLORS = ['#3b82f6', '#ea580c', '#8b5cf6', '#ec4899', '#10b981'];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Reporting &amp; Audits</h2>
          <p className="text-xs text-slate-500">View real-time financial stats, exports, and security trails</p>
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
      {user?.role === 'SUPER_ADMIN' && (
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            Expense Analytics
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            System Audit Trail
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : activeTab === 'analytics' ? (
        /* ANALYTICS PANEL */
        <div className="space-y-6">
          {breakdown && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Department breakdown */}
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

              {/* Company splits */}
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm transition-colors">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-6">Expense Split by Company</h3>
                <div className="h-64">
                  {breakdown.company?.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-20">No company spends recorded</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={breakdown.company}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {breakdown.company.map((entry: any, index: number) => (
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
          {/* Search bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm flex gap-4 items-center transition-colors">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search by action, user name, or details..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">{filteredAudits.length} events</span>
          </div>

          {/* Audit log cards */}
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
                    <div key={log.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      {/* Action badge */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[10px] whitespace-nowrap shrink-0 ${cfg.bg} ${cfg.text}`}>
                        {cfg.icon}
                        {cfg.label}
                      </div>

                      {/* User */}
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

                      {/* Detail */}
                      <div className="flex-1 min-w-0">
                        {meta ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{meta}</p>
                        ) : null}
                      </div>

                      {/* Time */}
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
