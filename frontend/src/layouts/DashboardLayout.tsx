import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Users, 
  BarChart3, 
  Bell, 
  Sun, 
  Moon, 
  LogOut, 
  Building2, 
  FileCheck,
  Coins,
  Wallet,
  Menu,
  X,
  UserCircle,
  KeyRound,
  Eye,
  EyeOff,
  ChevronUp
} from 'lucide-react';
import api from '../services/api';

// ── Human-readable page title map (UI-004) ─────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  '/':                     'Executive Dashboard',
  '/requests':             'Petty Cash Requests',
  '/requests/new':         'New Request',
  '/funds':                'Fund Management',
  '/transactions':         'Transaction Ledger',
  '/settlements/pending':  'Settlement Audits',
  '/users':                'User Directory',
  '/reports':              'Financial Reports',
  '/payments':             'Payments',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // requests/edit/:id or requests/:id
  if (/^\/requests\/edit\//.test(pathname)) return 'Edit Request';
  if (/^\/requests\/[^/]+$/.test(pathname)) return 'Request Detail';
  // fallback: capitalise first segment
  const segment = pathname.split('/')[1] ?? '';
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [companyContext, setCompanyContext] = useState<string>('ALL');
  const [companies, setCompanies] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Profile dropdown
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Change Password modal
  const [showCpModal, setShowCpModal] = useState(false);
  const [cpOldPass, setCpOldPass] = useState('');
  const [cpNewPass, setCpNewPass] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [cpShowOld, setCpShowOld] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpShowConfirm, setCpShowConfirm] = useState(false);
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpSaving, setCpSaving] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openChangePassword = () => {
    setShowProfileDropdown(false);
    setMobileMenuOpen(false);
    setCpOldPass(''); setCpNewPass(''); setCpConfirm('');
    setCpShowOld(false); setCpShowNew(false); setCpShowConfirm(false);
    setCpError(''); setCpSuccess(false); setCpSaving(false);
    setShowCpModal(true);
  };

  const handleChangePassword = async () => {
    setCpError('');
    if (!cpOldPass) { setCpError('Please enter your current password.'); return; }
    if (cpNewPass.length < 8) { setCpError('New password must be at least 8 characters.'); return; }
    if (cpNewPass !== cpConfirm) { setCpError('New passwords do not match.'); return; }
    if (cpOldPass === cpNewPass) { setCpError('New password must be different from current password.'); return; }
    setCpSaving(true);
    try {
      await api.post('/auth/change-password', { oldPassword: cpOldPass, newPassword: cpNewPass });
      setCpSuccess(true);
      setCpOldPass(''); setCpNewPass(''); setCpConfirm('');
      setTimeout(() => setShowCpModal(false), 1800);
    } catch (err: any) {
      setCpError(err.response?.data?.message || 'Failed to change password. Check your current password.');
    } finally {
      setCpSaving(false);
    }
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Toggle Theme
  const toggleTheme = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Sync theme on mount
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (e) {
      console.warn('Failed to load notifications');
    }
  };

  // Mark all notifications as read
  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 30 seconds for live updates
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch companies for Accountant context filtering
  useEffect(() => {
    if (user && (user.role === 'ACCOUNTANT' || user.role === 'SUPER_ADMIN')) {
      api.get('/companies')
        .then(res => setCompanies(res.data))
        .catch(err => console.error('Failed to load companies list', err));
    }
  }, [user]);

  if (!user) return null;

  // Set Company Context globally in session storage to read in query pages
  const handleCompanyContextChange = (value: string) => {
    setCompanyContext(value);
    sessionStorage.setItem('companyFilter', value);

    // ── Brand context switch — updates --primary token system-wide ──────────
    const selectedCompany = companies.find(c => c.id === value);
    if (selectedCompany?.name?.toLowerCase() === 'somtel') {
      document.documentElement.setAttribute('data-company', 'somtel');
    } else {
      document.documentElement.removeAttribute('data-company');
    }

    // Reload components in outlet by triggering a custom event
    window.dispatchEvent(new Event('companyFilterChanged'));
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ACCOUNTANT', 'EMPLOYEE'] },
    { label: 'My Requests', path: '/requests', icon: FileText, roles: ['EMPLOYEE'] },
    { label: 'Submit Request', path: '/requests/new', icon: PlusCircle, roles: ['EMPLOYEE', 'ACCOUNTANT'] },
    { label: 'All Requests', path: '/requests', icon: FileText, roles: ['ACCOUNTANT', 'SUPER_ADMIN'] },
    { label: 'Fund Management', path: '/funds', icon: Wallet, roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
    { label: 'Transaction Ledger', path: '/transactions', icon: Coins, roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
    { label: 'Settlement Audits', path: '/settlements/pending', icon: FileCheck, roles: ['ACCOUNTANT', 'SUPER_ADMIN'] },
    { label: 'User Directory', path: '/users', icon: Users, roles: ['SUPER_ADMIN'] },
    { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
  ];


  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR */}
      <aside className={`w-64 border-r border-[#072424] dark:border-slate-800 bg-[#0a2e2e] dark:bg-slate-950 flex flex-col transition-colors duration-300 h-screen fixed inset-y-0 left-0 z-50 md:sticky md:top-0 md:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Logo Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-white">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-white tracking-tight leading-none">
                CashDesk
              </span>
              <span className="text-[10px] font-semibold text-white/60 uppercase tracking-widest leading-none mt-1">
                Petty Cash
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links — scrolls independently */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems
            .filter(item => item.roles.includes(user.role))
            .map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-white/15 dark:bg-white/10 text-white font-semibold' 
                      : 'text-white/65 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-white/55'}`} />
                  {item.label}
                </Link>
              );
            })}
        </nav>

        {/* User profile footer — dropdown trigger */}
        <div ref={profileDropdownRef} className="flex-shrink-0 p-4 border-t border-white/10 dark:border-slate-800 bg-[#0a2e2e] dark:bg-slate-900/90 relative">

          {/* Profile Dropdown Popover — appears above the card */}
          {showProfileDropdown && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[60]">
              {/* User info header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="h-9 w-9 rounded-lg bg-[#0a2e2e] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.fullName}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user.email || user.username}
                  </p>
                </div>
              </div>

              {/* Change Password */}
              <button
                onClick={openChangePassword}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <KeyRound className="h-4 w-4 text-slate-400" />
                Change Password
              </button>

              {/* Divider */}
              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              {/* Log out */}
              <button
                onClick={() => { setShowProfileDropdown(false); logout(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}

          {/* Profile card button */}
          <button
            onClick={() => setShowProfileDropdown(prev => !prev)}
            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer group text-left ${
              showProfileDropdown ? 'bg-white/15' : 'hover:bg-white/10'
            }`}
          >
            <div className="h-9 w-9 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 group-hover:bg-white/25 transition-colors">
              {user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-white">{user.fullName}</p>
              <p className="text-[11px] text-white/55 truncate">
                {user.email || user.username}
              </p>
            </div>
            <ChevronUp className={`h-3.5 w-3.5 text-white/40 transition-transform duration-200 flex-shrink-0 ${
              showProfileDropdown ? 'rotate-0' : 'rotate-180'
            }`} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER NAVBAR */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 z-10 transition-colors duration-300">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
              {getPageTitle(location.pathname)}
            </h1>

            {/* Accountant / Admin Company Context Switcher */}
            {(user.role === 'ACCOUNTANT' || user.role === 'SUPER_ADMIN') && (
              <div className="hidden sm:flex items-center gap-2 ml-4">
                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Company View:</span>
                <select
                  value={companyContext}
                  onChange={(e) => handleCompanyContextChange(e.target.value)}
                  className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border-none outline-none rounded-md px-2.5 py-1 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <option value="ALL">All Companies</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Mobile Company Switcher */}
            {(user.role === 'ACCOUNTANT' || user.role === 'SUPER_ADMIN') && (
              <div className="sm:hidden flex items-center">
                <select
                  value={companyContext}
                  onChange={(e) => handleCompanyContextChange(e.target.value)}
                  className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border-none outline-none rounded-md px-2 py-1 text-slate-700 dark:text-slate-300 cursor-pointer max-w-[140px]"
                >
                  <option value="ALL">All Companies</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
            >
              {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notification Hub */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 relative cursor-pointer"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-rose-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-2">
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Notifications ({unreadCount} new)</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllRead} 
                        className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-400">
                        No notifications found
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`px-4 py-3 border-b border-slate-100 dark:border-slate-800/40 text-left transition-colors ${
                            !notif.isRead ? 'bg-primary/5 dark:bg-primary/5' : ''
                          }`}
                        >
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{notif.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{notif.message}</p>
                          <span className="text-[9px] text-slate-400 block mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* DYNAMIC SCROLLABLE BODY PAGE */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5 min-w-0">
          {/* Outlet injects nested pages */}
          <Outlet />
        </main>
      </div>

      {/* ── CHANGE PASSWORD MODAL ──────────────────────────────────────── */}
      {showCpModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCpModal(false); }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-[#0a2e2e] to-[#0d3d3d]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Change Password</h2>
                  <p className="text-[11px] text-white/60">Update your account login password</p>
                </div>
              </div>
              <button
                onClick={() => setShowCpModal(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Info note */}
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <KeyRound className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  After changing your password, you will be signed out and need to log in again.
                </p>
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="cp-old-pass"
                    type={cpShowOld ? 'text' : 'password'}
                    value={cpOldPass}
                    onChange={e => { setCpOldPass(e.target.value); setCpError(''); }}
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a2e2e] dark:focus:ring-teal-500 transition"
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setCpShowOld(!cpShowOld)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {cpShowOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password
                  <span className="ml-1 text-slate-400 font-normal">(min. 8 characters)</span>
                </label>
                <div className="relative">
                  <input
                    id="cp-new-pass"
                    type={cpShowNew ? 'text' : 'password'}
                    value={cpNewPass}
                    onChange={e => { setCpNewPass(e.target.value); setCpError(''); }}
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a2e2e] dark:focus:ring-teal-500 transition"
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setCpShowNew(!cpShowNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {cpShowNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Password strength hint */}
                {cpNewPass.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className={`h-1 flex-1 rounded-full transition-colors ${
                      cpNewPass.length >= 12 ? 'bg-emerald-500' : cpNewPass.length >= 8 ? 'bg-amber-400' : 'bg-rose-400'
                    }`} />
                    <span className={`text-[10px] font-semibold ${
                      cpNewPass.length >= 12 ? 'text-emerald-500' : cpNewPass.length >= 8 ? 'text-amber-500' : 'text-rose-400'
                    }`}>
                      {cpNewPass.length >= 12 ? 'Strong' : cpNewPass.length >= 8 ? 'Good' : 'Too short'}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="cp-confirm-pass"
                    type={cpShowConfirm ? 'text' : 'password'}
                    value={cpConfirm}
                    onChange={e => { setCpConfirm(e.target.value); setCpError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                    className={`w-full px-3 py-2.5 pr-10 text-sm border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a2e2e] dark:focus:ring-teal-500 transition ${
                      cpConfirm && cpNewPass !== cpConfirm
                        ? 'border-rose-400 dark:border-rose-500'
                        : cpConfirm && cpNewPass === cpConfirm
                        ? 'border-emerald-400 dark:border-emerald-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setCpShowConfirm(!cpShowConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {cpShowConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {cpConfirm && cpNewPass !== cpConfirm && (
                  <p className="text-[10px] text-rose-400 mt-1">Passwords do not match</p>
                )}
                {cpConfirm && cpNewPass === cpConfirm && cpNewPass.length >= 8 && (
                  <p className="text-[10px] text-emerald-500 mt-1">✓ Passwords match</p>
                )}
              </div>

              {/* Error */}
              {cpError && (
                <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2">
                  {cpError}
                </p>
              )}

              {/* Success */}
              {cpSuccess && (
                <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 font-semibold">
                  ✓ Password changed successfully. Signing you out...
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => setShowCpModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={cpSaving || cpSuccess}
                className="flex items-center gap-2 px-4 py-2 bg-[#0a2e2e] hover:bg-[#0d3d3d] disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                {cpSaving ? (
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <KeyRound className="h-3.5 w-3.5" />
                )}
                {cpSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
