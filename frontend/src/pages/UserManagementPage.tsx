import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { UserPlus, UserCheck, ShieldAlert, KeyRound, Save, PlusCircle, Trash2, Users, MapPin, BookOpen, Pencil, X, Search, Filter } from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'budgets' | 'regions' | 'budget-heads'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User Filter state
  const [searchUser, setSearchUser] = useState('');
  const [userCompanyFilter, setUserCompanyFilter] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [userRegionId, setUserRegionId] = useState('');
  const [companyRegions, setCompanyRegions] = useState<any[]>([]);
  const [role, setRole] = useState('EMPLOYEE');

  // Region & Department Budget Editing state
  const [editingBudgets, setEditingBudgets] = useState<{ [key: string]: string }>({});
  const [savingBudgetId, setSavingBudgetId] = useState<string | null>(null);

  // Regions state
  const [regions, setRegions] = useState<any[]>([]);
  const [regionFormOpen, setRegionFormOpen] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionCompanyId, setNewRegionCompanyId] = useState('');
  const [regionError, setRegionError] = useState<string | null>(null);
  const [creatingRegion, setCreatingRegion] = useState(false);
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [editingRegionName, setEditingRegionName] = useState('');

  // Budget Heads state
  const [budgetHeads, setBudgetHeads] = useState<any[]>([]);
  const [bhFormOpen, setBhFormOpen] = useState(false);
  const [newBhName, setNewBhName] = useState('');
  const [newBhCode, setNewBhCode] = useState('');
  const [newBhDescription, setNewBhDescription] = useState('');
  const [newBhCompanyId, setNewBhCompanyId] = useState('');
  const [bhError, setBhError] = useState<string | null>(null);
  const [creatingBh, setCreatingBh] = useState(false);
  const [editingBhId, setEditingBhId] = useState<string | null>(null);
  const [editingBhName, setEditingBhName] = useState('');
  const [editingBhCode, setEditingBhCode] = useState('');
  const [editingBhDesc, setEditingBhDesc] = useState('');

  // Edit User state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '', regionId: '', role: '' });
  const [editRegions, setEditRegions] = useState<any[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);

  // Load Admin Data
  const loadUsersAndFilters = async () => {
    setLoading(true);
    try {
      const [usersRes, companiesRes, _deptsRes, regionsRes, bhRes] = await Promise.all([
        api.get('/users'),
        api.get('/companies'),
        api.get('/companies/departments'),
        api.get('/companies/regions'),
        api.get('/companies/budget-heads'),
      ]);
      setUsers(usersRes.data);
      setCompanies(companiesRes.data);
      setRegions(regionsRes.data);
      setBudgetHeads(bhRes.data);

      // Build budget map from REGIONS
      const budgetMap: { [key: string]: string } = {};
      regionsRes.data.forEach((r: any) => {
        budgetMap[r.id] = (r.monthlyBudget || 0).toString();
      });
      setEditingBudgets(budgetMap);
    } catch (e) {
      console.error('Failed to load user directory logs', e);
    } finally {
      setLoading(false);
    }
  };

  // Region handlers
  const handleCreateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegionName || !newRegionCompanyId) {
      setRegionError('Please fill in region name and select a company');
      return;
    }
    setRegionError(null);
    setCreatingRegion(true);
    try {
      await api.post('/companies/regions', { name: newRegionName, companyId: newRegionCompanyId });
      setNewRegionName(''); setNewRegionCompanyId('');
      setRegionFormOpen(false);
      await loadUsersAndFilters();
    } catch (err: any) {
      setRegionError(err.response?.data?.message || 'Failed to create region');
    } finally {
      setCreatingRegion(false);
    }
  };

  const handleSaveRegion = async (id: string) => {
    try {
      await api.patch(`/companies/regions/${id}`, { name: editingRegionName });
      setEditingRegionId(null);
      await loadUsersAndFilters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update region');
    }
  };

  const handleDeleteRegion = async (r: any) => {
    const reqCount = r._count?.requests || 0;
    if (reqCount > 0) {
      alert(`Cannot delete "${r.name}" because it has ${reqCount} associated request(s).`);
      return;
    }
    if (!window.confirm(`Delete region "${r.name}"?`)) return;
    try {
      await api.delete(`/companies/regions/${r.id}`);
      await loadUsersAndFilters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete region');
    }
  };

  // Budget Head handlers
  const handleCreateBudgetHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBhName || !newBhCode || !newBhCompanyId) {
      setBhError('Please fill in name, code, and select a company');
      return;
    }
    setBhError(null);
    setCreatingBh(true);
    try {
      await api.post('/companies/budget-heads', { name: newBhName, code: newBhCode, description: newBhDescription || undefined, companyId: newBhCompanyId });
      setNewBhName(''); setNewBhCode(''); setNewBhDescription(''); setNewBhCompanyId('');
      setBhFormOpen(false);
      await loadUsersAndFilters();
    } catch (err: any) {
      setBhError(err.response?.data?.message || 'Failed to create budget head');
    } finally {
      setCreatingBh(false);
    }
  };

  const handleSaveBudgetHead = async (id: string) => {
    try {
      await api.patch(`/companies/budget-heads/${id}`, { name: editingBhName, code: editingBhCode, description: editingBhDesc || undefined });
      setEditingBhId(null);
      await loadUsersAndFilters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update budget head');
    }
  };

  const handleDeleteBudgetHead = async (bh: any) => {
    const reqCount = bh._count?.requests || 0;
    if (reqCount > 0) {
      alert(`Cannot delete "${bh.name}" because it has ${reqCount} associated request(s).`);
      return;
    }
    if (!window.confirm(`Delete budget head "${bh.code} – ${bh.name}"?`)) return;
    try {
      await api.delete(`/companies/budget-heads/${bh.id}`);
      await loadUsersAndFilters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete budget head');
    }
  };

  useEffect(() => {
    loadUsersAndFilters();
  }, []);

  // Load regions for the edit user form when editing
  useEffect(() => {
    const cId = editingUser?.company?.id;
    if (cId) {
      api.get(`/companies/regions?companyId=${cId}`)
        .then(res => setEditRegions(res.data))
        .catch(() => {});
    }
  }, [editingUser]);

  const handleOpenEdit = (u: any) => {
    setEditingUser(u);
    setEditForm({
      fullName: u.fullName || '',
      email: u.email || '',
      phone: u.phone || '',
      regionId: u.region?.id || '',
      role: u.role?.name || u.role || 'EMPLOYEE',
    });
    setEditError(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.fullName || !editForm.phone || !editForm.role) {
      setEditError('Full Name, Phone Number, and Role are required');
      return;
    }
    setSavingUser(true);
    setEditError(null);
    try {
      await api.put(`/users/${editingUser.id}`, {
        fullName: editForm.fullName,
        email: editForm.email || undefined,
        phone: editForm.phone,
        regionId: editForm.regionId || undefined,
        role: editForm.role,
      });
      setEditingUser(null);
      await loadUsersAndFilters();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSavingUser(false);
    }
  };

  // Fetch regions when selected company changes in user creation form
  useEffect(() => {
    if (companyId) {
      api.get(`/companies/regions?companyId=${companyId}`)
        .then(res => setCompanyRegions(res.data))
        .catch(() => console.error('Failed to load regions'));
    } else {
      setCompanyRegions([]);
    }
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !phone || !companyId || !role) {
      setError('Please fill in all mandatory fields');
      return;
    }

    setError(null);
    try {
      await api.post('/users', {
        fullName,
        username,
        email: email || undefined,
        phone,
        companyId,
        regionId: userRegionId || undefined,
        role
      });

      // Clear Form
      setFullName('');
      setUsername('');
      setEmail('');
      setPhone('');
      setCompanyId('');
      setUserRegionId('');
      setRole('EMPLOYEE');
      setFormOpen(false);

      // Reload
      loadUsersAndFilters();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register new user');
    }
  };

  // Toggle user active status
  const handleToggleStatus = async (userObj: any) => {
    if (userObj.username === 'admin' && userObj.status === 'ACTIVE') {
      alert('The primary Super Admin account ("admin") cannot be disabled to prevent system lockout.');
      return;
    }
    const actionText = userObj.status === 'ACTIVE' ? 'disable' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionText} user "${userObj.fullName}"?`)) return;
    const newStatus = userObj.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await api.put(`/users/${userObj.id}`, { status: newStatus });
      setUsers(users.map(u => u.id === userObj.id ? { ...u, status: newStatus } : u));
    } catch (e) {
      console.error('Failed to toggle status', e);
    }
  };

  // Reset password
  const handleResetPassword = async (userId: string) => {
    if (!window.confirm('Reset user password to default temporary password (Welcome@2026)?')) return;
    try {
      const res = await api.post(`/users/${userId}/reset-password`);
      alert(res.data.message);
    } catch (e) {
      console.error('Password reset failed', e);
    }
  };

  // Delete user account (only disabled users allowed)
  const handleDeleteUser = async (userObj: any) => {
    if (userObj.status !== 'DISABLED') {
      alert(`User "${userObj.fullName}" must be DISABLED before deletion. Please click the Shield icon to disable the account first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete user "${userObj.fullName}" (${userObj.username})?`)) return;

    try {
      await api.delete(`/users/${userObj.id}`);
      await loadUsersAndFilters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Save region budget
  const handleSaveRegionBudget = async (regionId: string) => {
    const budgetVal = parseFloat(editingBudgets[regionId] || '0');
    setSavingBudgetId(regionId);
    try {
      await api.patch(`/companies/regions/${regionId}`, { monthlyBudget: budgetVal });
      await loadUsersAndFilters();
    } catch (err: any) {
      console.error('Failed to update region budget', err);
      alert(err.response?.data?.message || 'Failed to update region budget');
    } finally {
      setSavingBudgetId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (searchUser) {
      const q = searchUser.toLowerCase();
      const match =
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (userCompanyFilter && u.company?.id !== userCompanyFilter && u.companyId !== userCompanyFilter) {
      return false;
    }
    if (userRoleFilter && (u.role?.name || u.role) !== userRoleFilter) {
      return false;
    }
    if (userStatusFilter && u.status !== userStatusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Directory & Management</h2>
          <p className="text-xs text-slate-500">Employee accounts, regional assignments, and spending limits</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1 border border-slate-200/60 dark:border-slate-700 overflow-x-auto max-w-full">
            <button
              onClick={() => { setActiveTab('users'); setFormOpen(false); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'users' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Users Directory
            </button>
            <button
              onClick={() => { setActiveTab('budgets'); setFormOpen(false); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'budgets' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Region Budgets
            </button>
            <button
              onClick={() => { setActiveTab('regions'); setFormOpen(false); setRegionFormOpen(false); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'regions' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Regions
            </button>
            <button
              onClick={() => { setActiveTab('budget-heads'); setFormOpen(false); setBhFormOpen(false); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'budget-heads' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Budget Heads
            </button>
          </div>

          {activeTab === 'users' ? (
            <button
              onClick={() => setFormOpen(!formOpen)}
              className="px-4 py-2 bg-[#E8A020] hover:bg-[#D4911A] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="h-4.5 w-4.5" />
              {formOpen ? 'View Directory' : 'Register New User'}
            </button>
          ) : activeTab === 'regions' ? (
            <button
              onClick={() => setRegionFormOpen(!regionFormOpen)}
              className="px-4 py-2 bg-[#E8A020] hover:bg-[#D4911A] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="h-4.5 w-4.5" />
              {regionFormOpen ? 'View Regions' : 'Add New Region'}
            </button>
          ) : activeTab === 'budget-heads' ? (
            <button
              onClick={() => setBhFormOpen(!bhFormOpen)}
              className="px-4 py-2 bg-[#E8A020] hover:bg-[#D4911A] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="h-4.5 w-4.5" />
              {bhFormOpen ? 'View Budget Heads' : 'Add New Budget Head'}
            </button>
          ) : null}
        </div>
      </div>

      {/* TAB: Users */}
      {activeTab === 'users' && (
        formOpen ? (
          /* CREATE USER FORM */
          <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-md transition-colors max-w-2xl mx-auto">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6">Create New Employee Credentials</h3>
            {error && (
              <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded text-xs text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Shafi Dirie"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Username *</label>
                  <input
                    type="text"
                    placeholder="e.g. shafi"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. shafi@somtel.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. +25266..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Company *</label>
                  <select
                    value={companyId}
                    onChange={(e) => { setCompanyId(e.target.value); setUserRegionId(''); }}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="">Select Company</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">System Access Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Assigned Region (Optional)</label>
                <select
                  value={userRegionId}
                  onChange={(e) => setUserRegionId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none cursor-pointer"
                  disabled={!companyId}
                >
                  <option value="">No Region (Default)</option>
                  {companyRegions.map(r => (
                    <option key={r.id} value={r.id}>{r.name} {r.code ? `(${r.code})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-200">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-[#E8A020] hover:bg-[#D4911A] text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm transition-all">
                  Register Employee
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* USERS DIRECTORY VIEW */
          <div className="space-y-3">
            {/* FILTER HUB */}
            <div className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row gap-2 items-center transition-colors">
              <div className="relative flex-1 w-full">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search by name, username, or phone..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
                <div className="flex items-center gap-1.5 flex-1 md:flex-initial">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={userCompanyFilter}
                    onChange={(e) => setUserCompanyFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer w-full"
                  >
                    <option value="">All Companies</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer w-full md:w-32"
                >
                  <option value="">All Roles</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer w-full md:w-28"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>
            </div>

            {/* USERS TABLE */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
                  <span className="text-xs text-slate-400">Loading user directory...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-[#0a2e2e] text-white font-bold text-[11px] uppercase tracking-wider border-l-4 border-l-transparent">
                        <th className="py-3.5 px-6">Employee</th>
                        <th className="py-3.5 px-4">Company</th>
                        <th className="py-3.5 px-4 hidden lg:table-cell">Region</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr className="border-l-4 border-l-transparent">
                          <td colSpan={6} className="text-center py-12 text-sm text-slate-400">
                            No employees found matching your filters
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isSomtel = u.company?.name === 'Somtel';
                          const isBluekom = u.company?.name === 'Bluekom';
                          const rowClass = isSomtel
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 border-l-4 border-l-orange-500'
                            : isBluekom
                            ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 border-l-4 border-l-blue-600'
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-l-4 border-l-transparent';

                          return (
                            <tr
                              key={u.id}
                              className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${rowClass}`}
                            >
                              <td className="py-4 px-6">
                                <div>
                                  <p className="font-semibold text-slate-800 dark:text-slate-200">{u.fullName}</p>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                                    <span>@{u.username}</span>
                                    {u.phone && <span>• {u.phone}</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  isSomtel
                                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20'
                                    : isBluekom
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {u.company?.name || 'N/A'}
                                </span>
                              </td>
                              <td className="py-4 px-4 hidden lg:table-cell">
                                {u.region?.name ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60">
                                    {u.region.name}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-xs font-bold uppercase px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded border border-slate-200/60 dark:border-slate-700">
                                  {u.role?.name || u.role}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                  u.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                }`}>
                                  {u.status}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-center space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => handleOpenEdit(u)}
                                  title="Edit User"
                                  className="inline-flex p-1.5 hover:bg-primary/10 text-primary rounded transition-all cursor-pointer"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleResetPassword(u.id)}
                                  title="Reset Password to default"
                                  className="inline-flex p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded transition-all cursor-pointer"
                                >
                                  <KeyRound className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  title={u.status === 'ACTIVE' ? 'Disable Account' : 'Activate Account'}
                                  className={`inline-flex p-1.5 rounded transition-all cursor-pointer ${
                                    u.status === 'ACTIVE' 
                                      ? 'hover:bg-rose-50 text-rose-600' 
                                      : 'hover:bg-emerald-50 text-emerald-600'
                                  }`}
                                >
                                  {u.status === 'ACTIVE' ? <ShieldAlert className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  title={
                                    u.status === 'DISABLED'
                                      ? 'Delete User Account'
                                      : 'Account must be DISABLED before it can be deleted'
                                  }
                                  className="inline-flex p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-all cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-fadeIn">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Edit Employee</h3>
            <p className="text-xs text-slate-500 mb-6">
              Editing: <span className="font-semibold text-slate-700 dark:text-slate-300">{editingUser.fullName}</span>
              &nbsp;·&nbsp;<span className="text-slate-400">{editingUser.username}</span>
            </p>

            {editError && (
              <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded text-xs text-rose-600 dark:text-rose-400">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email (Optional)</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone Number *</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">System Access Role *</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Region (Optional)</label>
                <select
                  value={editForm.regionId}
                  onChange={(e) => setEditForm({ ...editForm, regionId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="">No Region</option>
                  {editRegions.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-200">
                  Cancel
                </button>
                <button type="submit" disabled={savingUser}
                  className="px-4 py-2 bg-[#E8A020] hover:bg-[#D4911A] text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm transition-all disabled:opacity-60 flex items-center gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {savingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: Region Budgets */}
      {activeTab === 'budgets' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
          <div className="p-5 border-b border-slate-200/60 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Region Monthly Budgets
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Monthly spending limits by operating region</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#0a2e2e] text-white font-bold text-[11px] uppercase tracking-wider border-l-4 border-l-transparent">
                  <th className="py-3.5 px-6">Region Name</th>
                  <th className="py-3.5 px-4">Company</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Assigned Users</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Requests (Total)</th>
                  <th className="py-3.5 px-4">Monthly Budget Limit ($)</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((region) => {
                  const isSomtel = region.company?.name === 'Somtel';
                  const isBluekom = region.company?.name === 'Bluekom';
                  const rowClass = isSomtel
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 border-l-4 border-l-orange-500'
                    : isBluekom
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 border-l-4 border-l-blue-600'
                    : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-l-4 border-l-transparent';

                  return (
                    <tr key={region.id} className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${rowClass}`}>
                      <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
                          {region.name}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          isSomtel
                            ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20'
                            : isBluekom
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>{region.company?.name || 'N/A'}</span>
                      </td>
                      <td className="py-4 px-4 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                          <Users className="h-3 w-3 text-slate-400" />
                          {region._count?.users || 0} users
                        </span>
                      </td>
                      <td className="py-4 px-4 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-md">
                          {region._count?.requests || 0} requests
                        </span>
                      </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 max-w-[180px]">
                        <span className="text-slate-400 font-semibold">$</span>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          value={editingBudgets[region.id] ?? (region.monthlyBudget || 0)}
                          onChange={(e) => setEditingBudgets({ ...editingBudgets, [region.id]: e.target.value })}
                          className="w-full px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleSaveRegionBudget(region.id)}
                        disabled={savingBudgetId === region.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ml-auto"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {savingBudgetId === region.id ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                );
              })}
                {regions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                      No regions found. Add regions from the Regions tab first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Regions */}
      {activeTab === 'regions' && (
        regionFormOpen ? (
          <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-md transition-colors max-w-xl mx-auto">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Add New Region
            </h3>
            {regionError && (<div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded text-xs text-rose-600 dark:text-rose-400">{regionError}</div>)}
            <form onSubmit={handleCreateRegion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Region Name *</label>
                <input type="text" placeholder="e.g. Banaadir" value={newRegionName} onChange={(e) => setNewRegionName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Company *</label>
                <select value={newRegionCompanyId} onChange={(e) => setNewRegionCompanyId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer">
                  <option value="">Select Company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setRegionFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={creatingRegion}
                  className="px-4 py-2 bg-[#E8A020] hover:bg-[#D4911A] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50 transition-all shadow-sm">
                  {creatingRegion ? 'Creating...' : 'Create Region'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
            <div className="p-5 border-b border-slate-200/60 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Regions Management
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Operational regions for petty cash requests</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#0a2e2e] text-white font-bold text-[11px] uppercase tracking-wider border-l-4 border-l-transparent">
                    <th className="py-3.5 px-6">Region Name</th>
                    <th className="py-3.5 px-4">Company</th>
                    <th className="py-3.5 px-4">Requests</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((r) => {
                    const isSomtel = r.company?.name === 'Somtel';
                    const isBluekom = r.company?.name === 'Bluekom';
                    const rowClass = isSomtel
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 border-l-4 border-l-orange-500'
                      : isBluekom
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 border-l-4 border-l-blue-600'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-l-4 border-l-transparent';

                    return (
                      <tr key={r.id} className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${rowClass}`}>
                        <td className="py-4 px-6">
                          {editingRegionId === r.id ? (
                            <input value={editingRegionName} onChange={(e) => setEditingRegionName(e.target.value)}
                              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-[200px]" />
                          ) : (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{r.name}</span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            isSomtel
                              ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20'
                              : isBluekom
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>{r.company?.name || 'N/A'}</span>
                        </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">{r._count?.requests || 0} requests</span>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {editingRegionId === r.id ? (
                            <>
                              <button onClick={() => handleSaveRegion(r.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer">
                                <Save className="h-3.5 w-3.5" /> Save
                              </button>
                              <button onClick={() => setEditingRegionId(null)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => { setEditingRegionId(r.id); setEditingRegionName(r.name); }}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg cursor-pointer">Edit</button>
                          )}
                          <button onClick={() => handleDeleteRegion(r)} className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                  {regions.length === 0 && (
                    <tr><td colSpan={5} className="py-10 text-center text-xs text-slate-400">No regions found. Add one above.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* TAB: Budget Heads */}
      {activeTab === 'budget-heads' && (
        bhFormOpen ? (
          <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-md transition-colors max-w-xl mx-auto">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-sky-500" />
              Add New Budget Head
            </h3>
            {bhError && (<div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded text-xs text-rose-600 dark:text-rose-400">{bhError}</div>)}
            <form onSubmit={handleCreateBudgetHead} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Budget Head Name *</label>
                  <input type="text" placeholder="e.g. Office Supplies" value={newBhName} onChange={(e) => setNewBhName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Code *</label>
                  <input type="text" placeholder="e.g. BH-101" value={newBhCode} onChange={(e) => setNewBhCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description (Optional)</label>
                <input type="text" placeholder="Brief description of this budget category" value={newBhDescription} onChange={(e) => setNewBhDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Company *</label>
                <select value={newBhCompanyId} onChange={(e) => setNewBhCompanyId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer">
                  <option value="">Select Company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setBhFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={creatingBh}
                  className="px-4 py-2 bg-[#E8A020] hover:bg-[#D4911A] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50 transition-all shadow-sm">
                  {creatingBh ? 'Creating...' : 'Create Budget Head'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
            <div className="p-5 border-b border-slate-200/60 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-sky-500" />
                Budget Heads Management
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Expenditure categories and classification codes</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#0a2e2e] text-white font-bold text-[11px] uppercase tracking-wider border-l-4 border-l-transparent">
                    <th className="py-3.5 px-6">Code</th>
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Description</th>
                    <th className="py-3.5 px-4">Company</th>
                    <th className="py-3.5 px-4 hidden sm:table-cell">Requests</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetHeads.map((bh) => {
                    const isSomtel = bh.company?.name === 'Somtel';
                    const isBluekom = bh.company?.name === 'Bluekom';
                    const rowClass = isSomtel
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 border-l-4 border-l-orange-500'
                      : isBluekom
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 border-l-4 border-l-blue-600'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-l-4 border-l-transparent';

                    return (
                      <tr key={bh.id} className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${rowClass}`}>
                        <td className="py-4 px-6">
                        {editingBhId === bh.id ? (
                          <input value={editingBhCode} onChange={(e) => setEditingBhCode(e.target.value)}
                            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary w-24" />
                        ) : (
                          <span className="font-mono font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30 px-2.5 py-1 rounded">{bh.code}</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {editingBhId === bh.id ? (
                          <input value={editingBhName} onChange={(e) => setEditingBhName(e.target.value)}
                            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-[200px]" />
                        ) : (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{bh.name}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-[200px] hidden md:table-cell">
                        {editingBhId === bh.id ? (
                          <input value={editingBhDesc} onChange={(e) => setEditingBhDesc(e.target.value)} placeholder="Optional description"
                            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary w-full" />
                        ) : (
                          <span className="truncate block">{bh.description || '—'}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          isSomtel
                            ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20'
                            : isBluekom
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>{bh.company?.name || 'N/A'}</span>
                      </td>
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <span className="inline-flex items-center text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">{bh._count?.requests || 0} requests</span>
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {editingBhId === bh.id ? (
                            <>
                              <button onClick={() => handleSaveBudgetHead(bh.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer">
                                <Save className="h-3.5 w-3.5" /> Save
                              </button>
                              <button onClick={() => setEditingBhId(null)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => { setEditingBhId(bh.id); setEditingBhName(bh.name); setEditingBhCode(bh.code); setEditingBhDesc(bh.description || ''); }}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg cursor-pointer">Edit</button>
                          )}
                          <button onClick={() => handleDeleteBudgetHead(bh)} className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                  {budgetHeads.length === 0 && (
                    <tr><td colSpan={6} className="py-10 text-center text-xs text-slate-400">No budget heads found. Add one above.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};
