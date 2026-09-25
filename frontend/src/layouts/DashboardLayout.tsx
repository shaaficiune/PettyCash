import React, { useState, useEffect } from 'react';
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
  Settings,
  UserCircle,
  Save,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';

export const DashboardLayout: React.FC = () => {
  const { user, logout, updateUserContext } = useAuth();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [companyContext, setCompanyContext] = useState<string>('ALL'); // ALL, Somtel, Bluekom
  const [companies, setCompanies] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  const openProfileModal = () => {
    setProfileName(user?.fullName || '');
    setProfileError('');
    setProfileSuccess(false);
    setMobileMenuOpen(false);
    setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      setProfileError('Full name cannot be empty');
      return;
    }
    setProfileSaving(true);
    setProfileError('');
    try {
      await api.put('/auth/profile', { fullName: profileName.trim() });
      updateUserContext({ fullName: profileName.trim() });
      setProfileSuccess(true);
      setTimeout(() => setShowProfileModal(false), 1200);
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setProfileSaving(false);
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
    { label: 'Submit Request', path: '/requests/new', icon: PlusCircle, roles: ['EMPLOYEE'] },
    { label: 'All Requests', path: '/requests', icon: FileText, roles: ['ACCOUNTANT', 'SUPER_ADMIN'] },
    { label: 'Fund Management', path: '/funds', icon: Wallet, roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
    { label: 'Transaction Ledger', path: '/transactions', icon: Coins, roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
    { label: 'Settlement Audits', path: '/settlements/pending', icon: FileCheck, roles: ['ACCOUNTANT', 'SUPER_ADMIN'] },
    { label: 'User Directory', path: '/users', icon: Users, roles: ['SUPER_ADMIN'] },
    { label: 'System Analytics', path: '/reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
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

        {/* User profile footer — always pinned at bottom */}
        <div className="flex-shrink-0 p-4 border-t border-white/10 dark:border-slate-800 bg-[#0a2e2e] dark:bg-slate-900/90">
          {/* Clickable profile card — opens My Profile modal */}
          <button
            onClick={openProfileModal}
            className="w-full flex items-center gap-3 mb-3.5 p-2 -mx-0 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group text-left"
          >
            <div className="h-9 w-9 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 group-hover:bg-white/25 transition-colors">
              {user.fullName.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-white">{user.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-white/15 text-white/80 rounded border border-white/20">
                  {user.role.replace('_', ' ')}
                </span>
                {user.role === 'SUPER_ADMIN' || user.role === 'ACCOUNTANT' ? (
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/70 border border-white/15">
                    All Companies
                  </span>
                ) : (
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                    user.company?.name === 'Somtel' 
                      ? 'bg-orange-400/20 text-orange-200 border-orange-400/30' 
                      : 'bg-blue-400/20 text-blue-200 border-blue-400/30'
                  }`}>
                    {user.company?.name}
                  </span>
                )}
              </div>
            </div>
            <UserCircle className="h-3.5 w-3.5 text-white/40 group-hover:text-white/80 transition-colors flex-shrink-0" />
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-white/80 hover:text-white border border-white/15 dark:border-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
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
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize truncate">
              {location.pathname === '/' 
                ? 'Executive Dashboard' 
                : location.pathname.substring(1).replace('/', ' / ')}
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
                  className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border-none outline-none rounded-md px-2 py-1 text-slate-700 dark:text-slate-300 cursor-pointer max-w-[100px]"
                >
                  <option value="ALL">All</option>
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

      {/* ── MY PROFILE MODAL ──────────────────────────────────────────── */}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowProfileModal(false); }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-[#0a2e2e] to-[#0d3d3d]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white font-bold text-sm">
                  {user.fullName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">My Profile</h2>
                  <p className="text-[11px] text-white/60">View and update your details</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">

              {/* Role Badge */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Role</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                    {user.role.replace('_', ' ')}
                  </p>
                </div>
                {user.company?.name && (
                  <>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Company</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{user.company.name}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Username — READ ONLY */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Username <span className="text-slate-400 font-normal">(cannot be changed)</span>
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-400 dark:text-slate-500 select-none">@</span>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{user.username}</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-400 rounded font-medium">Read only</span>
                </div>
              </div>

              {/* Full Name — EDITABLE */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => { setProfileName(e.target.value); setProfileError(''); setProfileSuccess(false); }}
                  onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0a2e2e] dark:focus:ring-teal-500 transition"
                  placeholder="Your full name"
                  autoFocus
                />
              </div>

              {/* Email + Phone (read only display) */}
              {(user.email || user.phone) && (
                <div className="grid grid-cols-2 gap-3">
                  {user.email && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">Email</p>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">{user.email}</p>
                    </div>
                  )}
                  {user.phone && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1">Phone</p>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{user.phone}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {profileError && (
                <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2">
                  {profileError}
                </p>
              )}

              {/* Success */}
              {profileSuccess && (
                <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 font-semibold">
                  ✓ Profile updated successfully!
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving || profileSuccess}
                className="flex items-center gap-2 px-4 py-2 bg-[#0a2e2e] hover:bg-[#0d3d3d] disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                {profileSaving ? (
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
