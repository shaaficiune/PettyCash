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
  Wallet
} from 'lucide-react';
import api from '../services/api';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [companyContext, setCompanyContext] = useState<string>('ALL'); // ALL, Somtel, Bluekom
  const [companies, setCompanies] = useState<any[]>([]);

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
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-colors duration-300 h-screen sticky top-0">
        {/* Logo Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <span className="text-2xl font-bold bg-gradient-to-r from-bluekom-600 via-purple-600 to-somtel-600 bg-clip-text text-transparent font-sans tracking-wide">
            CashDesk
          </span>
        </div>

        {/* Navigation Links — scrolls independently */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {navItems
            .filter(item => item.roles.includes(user.role))
            .map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-primary text-white shadow-md shadow-primary/20 dark:shadow-none' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
        </nav>

        {/* User profile footer — always pinned at bottom */}
        <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
              {user.fullName.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-100">{user.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                  {user.role.replace('_', ' ')}
                </span>
                {user.role === 'SUPER_ADMIN' || user.role === 'ACCOUNTANT' ? (
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
                    All Companies
                  </span>
                ) : (
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    user.company?.name === 'Somtel' 
                      ? 'bg-somtel-100 dark:bg-somtel-900/40 text-somtel-600 dark:text-somtel-400' 
                      : 'bg-bluekom-100 dark:bg-bluekom-900/40 text-bluekom-600 dark:text-bluekom-400'
                  }`}>
                    {user.company?.name}
                  </span>
                )}

              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30 rounded-lg text-sm font-semibold transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER NAVBAR */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between px-8 z-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
              {location.pathname === '/' 
                ? 'Executive Dashboard' 
                : location.pathname.substring(1).replace('/', ' / ')}
            </h1>

            {/* Accountant / Admin Company Context Switcher */}
            {(user.role === 'ACCOUNTANT' || user.role === 'SUPER_ADMIN') && (
              <div className="flex items-center gap-2 ml-4">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Company View:</span>
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

          <div className="flex items-center gap-4">
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
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-2">
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
        <main className="flex-1 overflow-y-auto p-8">
          {/* Outlet injects nested pages */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};
