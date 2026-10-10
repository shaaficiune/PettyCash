import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { ColumnDef } from '@tanstack/react-table';
import {
  UserPlus,
  UserCheck,
  ShieldAlert,
  KeyRound,
  Save,
  PlusCircle,
  Trash2,
  Users,
  MapPin,
  BookOpen,
  Pencil,
  Search,
  Filter,
  ArrowLeft,
  Building,
} from 'lucide-react';
import {
  DataTable,
  DataTableColumnHeader,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/data-table';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { cn } from '../lib/utils';

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
  const [userRegionFilter, setUserRegionFilter] = useState('');

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
  const [regionCompanyFilter, setRegionCompanyFilter] = useState('');
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
      setNewRegionName('');
      setNewRegionCompanyId('');
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
      await api.post('/companies/budget-heads', {
        name: newBhName,
        code: newBhCode,
        description: newBhDescription || undefined,
        companyId: newBhCompanyId,
      });
      setNewBhName('');
      setNewBhCode('');
      setNewBhDescription('');
      setNewBhCompanyId('');
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
      await api.patch(`/companies/budget-heads/${id}`, {
        name: editingBhName,
        code: editingBhCode,
        description: editingBhDesc || undefined,
      });
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
        .then((res) => setEditRegions(res.data))
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
        .then((res) => setCompanyRegions(res.data))
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
      const response = await api.post('/users', {
        fullName,
        username,
        email: email || undefined,
        phone,
        companyId,
        regionId: userRegionId || undefined,
        role,
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

      alert(`User created. One-time password: ${response.data.temporaryPassword}\nShare it with the user through a secure channel.`);

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
      setUsers(users.map((u) => (u.id === userObj.id ? { ...u, status: newStatus } : u)));
    } catch (e) {
      console.error('Failed to toggle status', e);
    }
  };

  // Reset password
  const handleResetPassword = async (userId: string) => {
    if (!window.confirm('Generate a new one-time password for this user?')) return;
    try {
      const res = await api.post(`/users/${userId}/reset-password`);
      alert(`${res.data.message}\nOne-time password: ${res.data.temporaryPassword}`);
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
    if (userRegionFilter && u.region?.id !== userRegionFilter) {
      return false;
    }
    return true;
  });

  const userColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
            aria-label="Select all"
            className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(!!e.target.checked)}
            aria-label="Select row"
            className="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'fullName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employee" />
        ),
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{u.fullName}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                <span>@{u.username}</span>
                {u.phone && <span>• {u.phone}</span>}
              </div>
            </div>
          );
        },
      },
      {
        id: 'company',
        accessorFn: (row) => row.company?.name || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Company" />
        ),
        cell: ({ row }) => {
          const u = row.original;
          return (
            <span
              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {u.company?.name || 'N/A'}
            </span>
          );
        },
      },
      {
        id: 'region',
        accessorFn: (row) => row.region?.name || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Region" />
        ),
        cell: ({ row }) => {
          const u = row.original;
          return u.region?.name ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60">
              {u.region.name}
            </span>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          );
        },
      },
      {
        id: 'role',
        accessorFn: (row) => row.role?.name || row.role || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Role" />
        ),
        cell: ({ row }) => {
          const u = row.original;
          return (
            <Badge variant="outline" className="font-bold uppercase tracking-wider text-[10px]">
              {u.role?.name || u.role}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const u = row.original;
          return (
            <Badge variant={u.status === 'ACTIVE' ? 'success' : 'secondary'}>
              {u.status}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-center min-w-[280px]">Actions</div>,
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="text-center whitespace-nowrap">
              <div className="inline-flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => handleOpenEdit(u)}
                  title="Edit user details"
                  className="gap-1 text-[11px]"
                >
                  <Pencil className="h-3 w-3 text-primary" />
                  Edit
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => handleResetPassword(u.id)}
                  title="Generate new one-time password"
                  className="gap-1 text-[11px]"
                >
                  <KeyRound className="h-3 w-3" />
                  Reset PW
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => handleToggleStatus(u)}
                  title={u.status === 'ACTIVE' ? 'Disable this account' : 'Re-activate this account'}
                  className={cn(
                    'gap-1 text-[11px]',
                    u.status === 'ACTIVE'
                      ? 'text-destructive border-border hover:bg-destructive/10'
                      : 'text-foreground border-border hover:bg-muted'
                  )}
                >
                  {u.status === 'ACTIVE' ? (
                    <>
                      <ShieldAlert className="h-3 w-3" /> Disable
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3 w-3" /> Activate
                    </>
                  )}
                </Button>

                {u.status === 'DISABLED' && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    onClick={() => handleDeleteUser(u)}
                    title="Permanently delete this account"
                    className="gap-1 text-[11px]"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-4 font-sans">
      {/* Page Header and Tab Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            User &amp; Organization Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage user accounts, roles, regional assignments, and monthly budget limits
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          <Tabs
            value={activeTab}
            onValueChange={(val: any) => {
              setActiveTab(val);
              setFormOpen(false);
              setRegionFormOpen(false);
              setBhFormOpen(false);
            }}
          >
            <TabsList>
              <TabsTrigger value="users" className="gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" /> Users
              </TabsTrigger>
              <TabsTrigger value="budgets" className="gap-1.5 text-xs">
                <MapPin className="h-3.5 w-3.5" /> Region Budgets
              </TabsTrigger>
              <TabsTrigger value="regions" className="gap-1.5 text-xs">
                <Building className="h-3.5 w-3.5" /> Regions
              </TabsTrigger>
              <TabsTrigger value="budget-heads" className="gap-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5" /> Budget Heads
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === 'users' ? (
            <Button
              variant="gold"
              size="sm"
              onClick={() => setFormOpen(!formOpen)}
              className="gap-1.5 text-xs shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              {formOpen ? 'View Users' : 'Add User'}
            </Button>
          ) : activeTab === 'regions' ? (
            <Button
              variant="gold"
              size="sm"
              onClick={() => setRegionFormOpen(!regionFormOpen)}
              className="gap-1.5 text-xs shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              {regionFormOpen ? 'View Regions' : 'Add Region'}
            </Button>
          ) : activeTab === 'budget-heads' ? (
            <Button
              variant="gold"
              size="sm"
              onClick={() => setBhFormOpen(!bhFormOpen)}
              className="gap-1.5 text-xs shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              {bhFormOpen ? 'View Budget Heads' : 'Add Budget Head'}
            </Button>
          ) : null}
        </div>
      </div>

      {/* TAB: Users */}
      {activeTab === 'users' && (
        formOpen ? (
          /* CREATE USER FORM CARD */
          <Card className="max-w-2xl mx-auto shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" /> Add New User
                  </CardTitle>
                  <CardDescription>
                    Register a new user account with role privileges and company assignment.
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label required>Full Name</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Ahmed Ali"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label required>Username</Label>
                    <Input
                      type="text"
                      placeholder="e.g. ahmed.ali"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Email (Optional)</Label>
                    <Input
                      type="email"
                      placeholder="email@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label required>Phone Number</Label>
                    <Input
                      type="text"
                      placeholder="+252 61 XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label required>Company</Label>
                    <Select
                      value={companyId}
                      onChange={(e) => {
                        setCompanyId(e.target.value);
                        setUserRegionId('');
                      }}
                      required
                    >
                      <option value="">Select Company</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label required>Role</Label>
                    <Select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="ACCOUNTANT">Accountant</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Region (Optional)</Label>
                  <Select
                    value={userRegionId}
                    onChange={(e) => setUserRegionId(e.target.value)}
                    disabled={!companyId}
                  >
                    <option value="">No Region (Default)</option>
                    {companyRegions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.code ? `(${r.code})` : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gold" className="gap-1.5 shadow-sm">
                    <Save className="h-4 w-4" /> Save User
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* USERS DIRECTORY VIEW */
          <div className="space-y-3">
            {/* FILTER HUB */}
            <Card className="p-3 shadow-xs">
              <div className="flex flex-col md:flex-row gap-2.5 items-center">
                <div className="relative flex-1 w-full">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Search className="h-4 w-4" />
                  </span>
                  <Input
                    type="text"
                    placeholder="Search users by name, username, phone..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
                  <div className="flex items-center gap-1.5 flex-1 md:flex-initial">
                    <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <Select
                      value={userCompanyFilter}
                      onChange={(e) => setUserCompanyFilter(e.target.value)}
                      className="h-9 text-xs"
                    >
                      <option value="">All Companies</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <Select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="h-9 text-xs w-full sm:w-32"
                  >
                    <option value="">All Roles</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </Select>

                  <Select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="h-9 text-xs w-full sm:w-28"
                  >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                  </Select>

                  <Select
                    value={userRegionFilter}
                    onChange={(e) => setUserRegionFilter(e.target.value)}
                    className="h-9 text-xs w-full sm:w-36"
                  >
                    <option value="">All Regions</option>
                    {(() => {
                      const filtered = regions.filter((r) => !userCompanyFilter || r.companyId === userCompanyFilter);
                      const groups: { [key: string]: any[] } = {};
                      filtered.forEach((r) => {
                        const cName = r.company?.name || 'Other';
                        if (!groups[cName]) groups[cName] = [];
                        groups[cName].push(r);
                      });
                      const compKeys = Object.keys(groups);
                      if (compKeys.length <= 1) {
                        return filtered.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ));
                      }
                      return compKeys.map((cName) => (
                        <optgroup key={cName} label={`── ${cName} ──`}>
                          {groups[cName].map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                  </Select>
                </div>
              </div>
            </Card>

            {/* SHADCN/UI USERS DATA TABLE */}
            <DataTable
              columns={userColumns}
              data={filteredUsers}
              isLoading={loading}
              searchPlaceholder="Search users by name, username, phone..."
              pageSize={15}
              pageSizeOptions={[10, 15, 25, 50]}
            />
          </div>
        )
      )}

      {/* Edit User Modal Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Editing account details for{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {editingUser?.fullName}
              </span>{' '}
              (@{editingUser?.username})
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <Alert variant="destructive">
              <AlertDescription>{editError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label required>Full Name</Label>
                <Input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label required>Phone Number</Label>
                <Input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label required>Role</Label>
                <Select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Region</Label>
              <Select
                value={editForm.regionId}
                onChange={(e) => setEditForm({ ...editForm, regionId: e.target.value })}
              >
                <option value="">No Region (Default)</option>
                {editRegions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gold"
                disabled={savingUser}
                className="gap-1.5"
              >
                <Save className="h-4 w-4" />
                {savingUser ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* TAB: Region Budgets */}
      {activeTab === 'budgets' && (
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Region Monthly Budgets
              </CardTitle>
              <CardDescription className="text-xs">
                Monthly spending limits assigned to operational regions
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <Select
                value={regionCompanyFilter}
                onChange={(e) => setRegionCompanyFilter(e.target.value)}
                className="h-8 text-xs w-40"
              >
                <option value="">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-3 px-6">Region Name</TableHead>
                    <TableHead className="py-3 px-4">Company</TableHead>
                    <TableHead className="py-3 px-4 hidden sm:table-cell">Assigned Users</TableHead>
                    <TableHead className="py-3 px-4 hidden md:table-cell">Requests (Total)</TableHead>
                    <TableHead className="py-3 px-4">Monthly Budget Limit ($)</TableHead>
                    <TableHead className="py-3 px-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regions
                    .filter((r) => !regionCompanyFilter || r.companyId === regionCompanyFilter || r.company?.id === regionCompanyFilter)
                    .map((region) => {
                      return (
                        <TableRow key={region.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                          <TableCell className="py-3.5 px-6 font-semibold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                              {region.name}
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 px-4">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {region.company?.name || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5 px-4 hidden sm:table-cell">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                              <Users className="h-3 w-3 text-slate-400" />
                              {region._count?.users || 0} users
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5 px-4 hidden md:table-cell">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-md">
                              {region._count?.requests || 0} requests
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 max-w-[180px]">
                              <span className="text-slate-400 font-semibold">$</span>
                              <Input
                                type="number"
                                step="100"
                                min="0"
                                value={editingBudgets[region.id] ?? (region.monthlyBudget || 0)}
                                onChange={(e) => setEditingBudgets({ ...editingBudgets, [region.id]: e.target.value })}
                                className="h-8 text-xs font-semibold"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 px-6 text-right">
                            <Button
                              variant="teal"
                              size="xs"
                              onClick={() => handleSaveRegionBudget(region.id)}
                              disabled={savingBudgetId === region.id}
                              className="gap-1.5 ml-auto"
                            >
                              <Save className="h-3.5 w-3.5" />
                              {savingBudgetId === region.id ? 'Saving...' : 'Save'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {regions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-xs text-slate-400">
                        No regions found. Add regions from the Regions tab first.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB: Regions */}
      {activeTab === 'regions' && (
        regionFormOpen ? (
          <Card className="max-w-xl mx-auto shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" /> Add New Region
                  </CardTitle>
                  <CardDescription>Create an operational region for cost center grouping.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setRegionFormOpen(false)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {regionError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{regionError}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleCreateRegion} className="space-y-4">
                <div className="space-y-1.5">
                  <Label required>Region Name</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Mogadishu, Hargeisa, Garowe"
                    value={newRegionName}
                    onChange={(e) => setNewRegionName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label required>Company</Label>
                  <Select
                    value={newRegionCompanyId}
                    onChange={(e) => setNewRegionCompanyId(e.target.value)}
                    required
                  >
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setRegionFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gold" disabled={creatingRegion} className="gap-1.5 shadow-sm">
                    {creatingRegion ? 'Creating...' : 'Create Region'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                Regions Management
              </CardTitle>
              <CardDescription className="text-xs">
                Operational regions for petty cash requests
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-3 px-6">Region Name</TableHead>
                      <TableHead className="py-3 px-4">Company</TableHead>
                      <TableHead className="py-3 px-4">Requests</TableHead>
                      <TableHead className="py-3 px-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regions.map((r) => {
                      return (
                        <TableRow key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                          <TableCell className="py-3.5 px-6">
                            {editingRegionId === r.id ? (
                              <Input
                                value={editingRegionName}
                                onChange={(e) => setEditingRegionName(e.target.value)}
                                className="h-8 max-w-[200px] text-xs font-semibold"
                              />
                            ) : (
                              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{r.name}</span>
                            )}
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {r.company?.name || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5 px-4">
                            <span className="inline-flex items-center text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                              {r._count?.requests || 0} requests
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5 px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {editingRegionId === r.id ? (
                                <>
                                  <Button
                                    variant="teal"
                                    size="xs"
                                    onClick={() => handleSaveRegion(r.id)}
                                    className="gap-1.5"
                                  >
                                    <Save className="h-3.5 w-3.5" /> Save
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => setEditingRegionId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => {
                                    setEditingRegionId(r.id);
                                    setEditingRegionName(r.name);
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDeleteRegion(r)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {regions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-xs text-slate-400">
                          No regions found. Add one above.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* TAB: Budget Heads */}
      {activeTab === 'budget-heads' && (
        bhFormOpen ? (
          <Card className="max-w-xl mx-auto shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" /> Add New Budget Head
                  </CardTitle>
                  <CardDescription>Expenditure classification category and account code.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setBhFormOpen(false)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bhError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{bhError}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleCreateBudgetHead} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label required>Budget Head Name</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Office Supplies"
                      value={newBhName}
                      onChange={(e) => setNewBhName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label required>Code</Label>
                    <Input
                      type="text"
                      placeholder="e.g. BH-101"
                      value={newBhCode}
                      onChange={(e) => setNewBhCode(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description (Optional)</Label>
                  <Input
                    type="text"
                    placeholder="Short description of this expense type"
                    value={newBhDescription}
                    onChange={(e) => setNewBhDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label required>Company</Label>
                  <Select
                    value={newBhCompanyId}
                    onChange={(e) => setNewBhCompanyId(e.target.value)}
                    required
                  >
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setBhFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gold" disabled={creatingBh} className="gap-1.5 shadow-sm">
                    {creatingBh ? 'Creating...' : 'Create Budget Head'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Budget Heads Management
              </CardTitle>
              <CardDescription className="text-xs">
                Expenditure categories and classification codes
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-3 px-6">Code</TableHead>
                      <TableHead className="py-3 px-4">Name</TableHead>
                      <TableHead className="py-3 px-4 hidden md:table-cell">Description</TableHead>
                      <TableHead className="py-3 px-4">Company</TableHead>
                      <TableHead className="py-3 px-4 hidden sm:table-cell">Requests</TableHead>
                      <TableHead className="py-3 px-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetHeads.map((bh) => {
                      return (
                        <TableRow key={bh.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                          <TableCell className="py-3.5 px-6">
                            {editingBhId === bh.id ? (
                              <Input
                                value={editingBhCode}
                                onChange={(e) => setEditingBhCode(e.target.value)}
                                className="h-8 w-24 text-xs font-mono font-semibold"
                              />
                            ) : (
                              <span className="font-mono font-bold text-foreground bg-muted px-2.5 py-1 rounded text-xs border border-border">
                                {bh.code}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5 px-4">
                            {editingBhId === bh.id ? (
                              <Input
                                value={editingBhName}
                                onChange={(e) => setEditingBhName(e.target.value)}
                                className="h-8 max-w-[200px] text-xs font-semibold"
                              />
                            ) : (
                              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{bh.name}</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5 px-4 text-slate-500 max-w-[200px] hidden md:table-cell text-xs">
                            {editingBhId === bh.id ? (
                              <Input
                                value={editingBhDesc}
                                onChange={(e) => setEditingBhDesc(e.target.value)}
                                placeholder="Optional description"
                                className="h-8 text-xs"
                              />
                            ) : (
                              <span className="truncate block">{bh.description || '—'}</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5 px-4">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {bh.company?.name || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5 px-4 hidden sm:table-cell">
                            <span className="inline-flex items-center text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                              {bh._count?.requests || 0} requests
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5 px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {editingBhId === bh.id ? (
                                <>
                                  <Button
                                    variant="teal"
                                    size="xs"
                                    onClick={() => handleSaveBudgetHead(bh.id)}
                                    className="gap-1.5"
                                  >
                                    <Save className="h-3.5 w-3.5" /> Save
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => setEditingBhId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => {
                                    setEditingBhId(bh.id);
                                    setEditingBhName(bh.name);
                                    setEditingBhCode(bh.code);
                                    setEditingBhDesc(bh.description || '');
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDeleteBudgetHead(bh)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {budgetHeads.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-xs text-slate-400">
                          No budget heads found. Add one above.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
};
