import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Users, 
  Bell, 
  Sun, 
  Moon, 
  LogOut, 
  FileCheck,
  Coins,
  Wallet,
  Menu,
  X,
  KeyRound,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronLeft,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Receipt,
  AlertTriangle,
  History
} from 'lucide-react';
import api from '../services/api';
import {
  Button,
  Input,
  Label,
  Avatar,
  AvatarFallback,
  Separator,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Alert,
  AlertDescription,
} from '../components/ui';

const PAGE_TITLES: Record<string, string> = {
  '/':                     'Dashboard',
  '/requests':             'All requests',
  '/requests/new':         'New petty cash request',
  '/funds':                'Cash fund',
  '/transactions':         'Petty cash reports',
  '/reports':              'Petty cash reports',
  '/settlements/pending':  'Settlement Audits',
  '/audit-trail':          'Audit Trail',
  '/users':                'User directory',
  '/settings':             'Settings',
  '/payments':             'Payment vouchers',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (/^\/requests\/edit\//.test(pathname)) return 'Edit Request';
  if (/^\/requests\/[^/]+$/.test(pathname)) return 'Request Detail';
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
  const [lowFloatAlerts, setLowFloatAlerts] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {
        // ignore storage error
      }
      return next;
    });
  };

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
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch companies & check low-balance float for Accountant/Admin/ApprovalTwo
  useEffect(() => {
    if (user && (user.role === 'ACCOUNTANT' || user.role === 'SUPER_ADMIN' || user.role === 'APPROVAL_TWO')) {
      api.get('/companies')
        .then(res => setCompanies(res.data))
        .catch(err => console.error('Failed to load companies list', err));

      api.get('/reports/dashboard-stats')
        .then(res => {
          const perCo = res.data?.funds?.perCompany || [];
          const low = perCo
            .filter((c: any) => typeof c.balance === 'number' && c.balance < 300)
            .map((c: any) => `${c.name} ($${Number(c.balance).toFixed(2)})`);
          setLowFloatAlerts(low);
        })
        .catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  const handleCompanyContextChange = (value: string) => {
    setCompanyContext(value);
    sessionStorage.setItem('companyFilter', value);
    document.documentElement.removeAttribute('data-company');
    window.dispatchEvent(new Event('companyFilterChanged'));
  };

  interface NavItem {
    label: string;
    path: string;
    icon: React.ElementType;
    roles: string[];
  }

  interface NavSection {
    section: string;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ACCOUNTANT', 'APPROVAL_TWO', 'EMPLOYEE'] },
      ],
    },
    {
      section: 'Petty cash',
      items: [
        { label: 'New request', path: '/requests/new', icon: PlusCircle, roles: ['EMPLOYEE', 'ACCOUNTANT'] },
        { label: 'All requests', path: '/requests', icon: FileText, roles: ['ACCOUNTANT', 'SUPER_ADMIN', 'APPROVAL_TWO'] },
        { label: 'My requests', path: '/requests', icon: FileText, roles: ['EMPLOYEE'] },
        { label: 'Cash fund', path: '/funds', icon: Wallet, roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
      ],
    },
    {
      section: 'Records',
      items: [
        { label: 'Petty cash reports', path: '/transactions', icon: Coins, roles: ['SUPER_ADMIN', 'ACCOUNTANT', 'APPROVAL_TWO', 'EMPLOYEE'] },
        { label: 'Payment vouchers', path: '/payments', icon: Receipt, roles: ['ACCOUNTANT', 'SUPER_ADMIN', 'APPROVAL_TWO'] },
        { label: 'Settlement Audits', path: '/settlements/pending', icon: FileCheck, roles: ['ACCOUNTANT', 'SUPER_ADMIN'] },
        { label: 'Audit Trail', path: '/audit-trail', icon: History, roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
      ],
    },
    {
      section: 'Administration',
      items: [
        { label: 'User directory', path: '/users', icon: Users, roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
        { label: 'Settings', path: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
      ],
    },
  ];

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const userInitials = user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-200">
      
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR */}
      <aside className={`border-r border-[#0A1630] dark:border-[#1C2B4E] bg-[#0D1C3D] dark:bg-[#0A1224] flex flex-col transition-all duration-300 ease-in-out h-screen fixed inset-y-0 left-0 z-50 md:sticky md:top-0 md:translate-x-0 ${
        isCollapsed ? 'w-64 md:w-20' : 'w-64'
      } ${
        mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Logo Header - Petty Cash Office */}
        <div className={`h-16 flex items-center border-b border-white/10 dark:border-[#1C2B4E] flex-shrink-0 px-4 sm:px-6 transition-all ${
          isCollapsed ? 'md:px-3 justify-between md:justify-center' : 'justify-between'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              onClick={isCollapsed ? toggleSidebarCollapse : undefined}
              className={`w-[34px] h-[34px] rounded-[7px] bg-gradient-to-br from-[#FFC30B] to-[#F5B700] text-[#141000] font-black font-display flex items-center justify-center text-[15px] shadow-sm shadow-amber-500/20 shrink-0 ${
                isCollapsed ? 'cursor-pointer hover:brightness-105 transition-all' : ''
              }`}
              title={isCollapsed ? 'Expand sidebar' : undefined}
            >
              PC
            </div>
            <div className={`flex flex-col min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
              <span className="text-[15px] font-bold text-white tracking-tight leading-snug font-display">
                Petty Cash Office
              </span>
              <span className="text-[11px] font-medium text-[#9BB1DE] leading-none">
                Bluekom · Somtel
              </span>
            </div>
          </div>

          {/* Desktop collapse toggle button inside sidebar header */}
          <button
            onClick={toggleSidebarCollapse}
            className={`hidden md:flex p-1.5 rounded-lg text-[#9BB1DE] hover:text-white hover:bg-white/10 cursor-pointer transition-colors ${
              isCollapsed ? 'hidden' : ''
            }`}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-[#9BB1DE] hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links Grouped by Section */}
        <nav className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {navSections.map(sec => {
            const visibleItems = sec.items.filter(item => item.roles.includes(user.role));
            if (visibleItems.length === 0) return null;
            return (
              <div key={sec.section} className="space-y-1">
                {!isCollapsed && (
                  <div className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#8EA7D8] px-2.5 pt-1 pb-1">
                    {sec.section}
                  </div>
                )}
                {visibleItems.map(item => {
                  const isActive = location.pathname === item.path || 
                    (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      title={item.label}
                      className={`flex items-center rounded-md text-[13.5px] transition-all ${
                        isCollapsed 
                          ? 'md:justify-center md:px-0 md:py-2.5 px-3 py-2 gap-3' 
                          : 'gap-2.5 px-3 py-2'
                      } ${
                        isActive 
                          ? 'bg-[#182F5E] dark:bg-[#132244] text-white font-medium shadow-[inset_3px_0_0_#F5B700]' 
                          : 'text-[#D6DEF2] hover:bg-[#182F5E]/70 dark:hover:bg-[#132244]/70 hover:text-white'
                      }`}
                    >
                      <item.icon className={`h-4 w-4 shrink-0 opacity-85 ${isActive ? 'text-[#F5B700]' : 'text-[#8EA7D8]'}`} />
                      <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div ref={profileDropdownRef} className="flex-shrink-0 p-3 sm:p-4 border-t border-white/10 dark:border-[#1C2B4E] bg-[#0D1C3D] dark:bg-[#0A1224] relative">

          {/* Profile Dropdown Popover */}
          {showProfileDropdown && (
            <div className={`absolute bottom-full mb-2 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-[60] animate-in fade-in-0 zoom-in-95 duration-150 ${
              isCollapsed ? 'left-3 right-3 md:left-full md:bottom-2 md:ml-3 md:w-56' : 'left-3 right-3'
            }`}>
              {/* User info header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-muted/30">
                <Avatar size="sm">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{user.fullName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user.email || user.username}
                  </p>
                </div>
              </div>

              {/* Change Password */}
              <button
                onClick={openChangePassword}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                Change Password
              </button>

              <Separator />

              {/* Log out */}
              <button
                onClick={() => { setShowProfileDropdown(false); logout(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}

          {/* Profile card button */}
          <button
            onClick={() => setShowProfileDropdown(prev => !prev)}
            className={`w-full flex items-center rounded-lg transition-colors cursor-pointer group text-left ${
              isCollapsed ? 'md:justify-center md:p-2 p-2 gap-3' : 'gap-3 p-2'
            } ${
              showProfileDropdown ? 'bg-white/15' : 'hover:bg-white/10'
            }`}
            title={isCollapsed ? user.fullName : undefined}
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-[#F5B700] border border-[#D9A300] text-[#0D1C3D] font-bold text-xs group-hover:bg-[#FBBF24] transition-colors">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className={`flex-1 min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
              <p className="text-xs font-bold truncate text-white">{user.fullName}</p>
              <p className="text-[11px] text-white/60 truncate">
                {user.email || user.username}
              </p>
            </div>
            <ChevronUp className={`h-3.5 w-3.5 text-white/50 transition-transform duration-200 flex-shrink-0 ${
              isCollapsed ? 'md:hidden' : ''
            } ${
              showProfileDropdown ? 'rotate-0' : 'rotate-180'
            }`} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER NAVBAR (Dual-Brand Navy / Obsidian Palette) */}
        <header className="h-16 border-b border-[#1C3360] dark:border-[#1C2B4E] bg-[#0D1C3D] dark:bg-[#0A1224] text-white flex items-center justify-between px-4 sm:px-8 z-10 transition-colors">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 text-white/80 hover:bg-[#182F5E] dark:hover:bg-[#132244] rounded-lg cursor-pointer shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop collapse toggle */}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden md:flex p-2 -ml-1 text-white/80 hover:bg-[#182F5E] dark:hover:bg-[#132244] hover:text-white rounded-lg cursor-pointer shrink-0 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <PanelLeft className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
            </button>

            <h1 className="text-base sm:text-[19px] font-semibold text-white tracking-tight truncate font-display">
              {getPageTitle(location.pathname)}
            </h1>

            {/* Accountant / Admin Company Context Switcher */}
            {(user.role === 'ACCOUNTANT' || user.role === 'SUPER_ADMIN') && (
              <div className="hidden sm:flex items-center gap-2 ml-4">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{
                  backgroundColor: companyContext === 'ALL' ? '#F5B700' : (companies.find(c => c.id === companyContext)?.name?.toLowerCase().includes('somtel') ? '#F5B700' : '#3B82F6')
                }} />
                <span className="text-xs text-[#C9D3EC] font-medium whitespace-nowrap">Company:</span>
                <select
                  value={companyContext}
                  onChange={(e) => handleCompanyContextChange(e.target.value)}
                  className="text-xs font-semibold bg-[#182F5E] dark:bg-[#132244] text-white border border-[#28447E] dark:border-[#1C2B4E] rounded-md px-2.5 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#F5B700]"
                >
                  <option value="ALL">All Companies</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Company Switcher */}
            {(user.role === 'ACCOUNTANT' || user.role === 'SUPER_ADMIN') && (
              <div className="sm:hidden flex items-center">
                <select
                  value={companyContext}
                  onChange={(e) => handleCompanyContextChange(e.target.value)}
                  className="text-xs font-semibold bg-[#182F5E] dark:bg-[#132244] text-white border border-[#28447E] dark:border-[#1C2B4E] rounded-md px-2 py-1 cursor-pointer max-w-[130px] focus:outline-none"
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
              className="p-2 rounded-md border border-[#28447E] dark:border-[#1C2B4E] bg-[#182F5E] dark:bg-[#132244] text-white hover:bg-[#203D7A] dark:hover:bg-[#1A2D58] transition-colors cursor-pointer"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="h-4 w-4 text-[#F5B700]" /> : <Moon className="h-4 w-4 text-slate-200" />}
            </button>

            {/* Notification Hub */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-md border border-[#28447E] dark:border-[#1C2B4E] bg-[#182F5E] dark:bg-[#132244] text-white hover:bg-[#203D7A] dark:hover:bg-[#1A2D58] transition-colors relative cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-[#DC2626] text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-xl z-20 py-2 animate-in fade-in-0 zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-border flex justify-between items-center bg-muted/30">
                    <span className="text-xs font-bold text-foreground">Notifications ({unreadCount} new)</span>
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
                      <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                        No notifications found
                      </div>
                    ) : (
                      notifications.map((notif: any) => (
                        <div 
                          key={notif.id} 
                          className={`px-4 py-3 border-b border-border/50 text-left transition-colors ${
                            !notif.isRead ? 'bg-primary/5 dark:bg-primary/10' : ''
                          }`}
                        >
                          <p className="text-xs font-bold text-foreground">{notif.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{notif.message}</p>
                          <span className="text-[9px] text-muted-foreground/70 block mt-1">
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

        {/* Low-Balance Cash Float Top-Bar Alert Banner (< $300 threshold) */}
        {lowFloatAlerts.length > 0 && (
          <div className="bg-[#FFFBEB] dark:bg-[#251A08] border-b border-[#F5B700]/40 px-4 py-2 flex items-center justify-between text-xs text-[#92400E] dark:text-[#FDE68A] transition-colors shrink-0">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 text-[#F5B700] shrink-0" />
              <span>
                <strong>Low Cash Float Alert (&lt; $300):</strong>{' '}
                {lowFloatAlerts.join(', ')} is running low on funds. Please replenish cash float.
              </span>
            </div>
            <Link
              to="/funds"
              className="font-bold underline text-[#B45309] dark:text-[#FBBF24] hover:opacity-80 shrink-0 ml-3"
            >
              Replenish Float →
            </Link>
          </div>
        )}

        {/* DYNAMIC SCROLLABLE BODY PAGE CANVAS */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-[#080D1A] text-foreground p-3 sm:p-5 lg:p-6 min-w-0 transition-colors">
          <div className="max-w-[1536px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── CHANGE PASSWORD MODAL ──────────────────────────────────────── */}
      <Dialog open={showCpModal} onOpenChange={setShowCpModal}>
        <DialogContent onClose={() => setShowCpModal(false)} className="sm:max-w-md p-0 overflow-hidden">
          {/* Header Banner */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-[#0B1F4D] to-[#0d3d3d] text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-white">Change Password</DialogTitle>
                <DialogDescription className="text-[11px] text-white/70">Update your account login password</DialogDescription>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <Alert variant="warning" className="py-2.5">
              <AlertDescription className="text-xs leading-relaxed">
                After changing your password, you will be signed out and need to log in again.
              </AlertDescription>
            </Alert>

            {/* Current Password */}
            <div className="space-y-1.5">
              <Label required>Current Password</Label>
              <div className="relative">
                <Input
                  id="cp-old-pass"
                  type={cpShowOld ? 'text' : 'password'}
                  value={cpOldPass}
                  onChange={e => { setCpOldPass(e.target.value); setCpError(''); }}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setCpShowOld(!cpShowOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {cpShowOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label required>
                New Password
                <span className="ml-1 text-muted-foreground font-normal">(min. 8 characters)</span>
              </Label>
              <div className="relative">
                <Input
                  id="cp-new-pass"
                  type={cpShowNew ? 'text' : 'password'}
                  value={cpNewPass}
                  onChange={e => { setCpNewPass(e.target.value); setCpError(''); }}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setCpShowNew(!cpShowNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {cpShowNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
            <div className="space-y-1.5">
              <Label required>Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="cp-confirm-pass"
                  type={cpShowConfirm ? 'text' : 'password'}
                  value={cpConfirm}
                  onChange={e => { setCpConfirm(e.target.value); setCpError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setCpShowConfirm(!cpShowConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {cpShowConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {cpConfirm && cpNewPass !== cpConfirm && (
                <p className="text-[10px] text-destructive mt-1 font-medium">Passwords do not match</p>
              )}
              {cpConfirm && cpNewPass === cpConfirm && cpNewPass.length >= 8 && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">✓ Passwords match</p>
              )}
            </div>

            {cpError && (
              <Alert variant="destructive">
                <AlertDescription>{cpError}</AlertDescription>
              </Alert>
            )}

            {cpSuccess && (
              <Alert variant="success">
                <AlertDescription>✓ Password changed successfully. Signing you out...</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCpModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleChangePassword}
              isLoading={cpSaving}
              disabled={cpSaving || cpSuccess}
            >
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardLayout;
