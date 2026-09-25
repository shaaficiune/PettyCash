import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, Filter, FileSpreadsheet, Eye } from 'lucide-react';

export const RequestsListPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus !== null) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const params: any = { page, pageSize };
      if (companyFilter !== 'ALL') params.companyId = companyFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/requests', { params });
      const data = res.data;
      if (data && data.items) {
        setRequests(data.items);
      } else {
        // fallback to older shape
        setRequests(data || []);
      }
    } catch (e) {
      console.error('Failed to load requests list', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    window.addEventListener('companyFilterChanged', loadRequests);
    return () => {
      window.removeEventListener('companyFilterChanged', loadRequests);
    };
  }, [statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [page]);

  const handleExportCSV = async () => {
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const params: any = {};
      if (companyFilter !== 'ALL') params.companyId = companyFilter;
      const res = await api.get('/reports/export-csv', { params, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'petty_cash_requests_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  // Filter client-side by search and priority (to optimize queries)
  const filteredRequests = requests.filter(req => {
    const matchSearch = req.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
                        req.purpose.toLowerCase().includes(search.toLowerCase()) ||
                        (req.user?.fullName && req.user.fullName.toLowerCase().includes(search.toLowerCase())) ||
                        (req.region?.name && req.region.name.toLowerCase().includes(search.toLowerCase()));
    const matchPriority = priorityFilter ? req.priority === priorityFilter : true;
    return matchSearch && matchPriority;
  });

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-base font-bold text-slate-800 dark:text-white whitespace-nowrap leading-none">Petty Cash Requests</h2>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600 text-xs">·</span>
          <p className="hidden sm:block text-[11px] text-slate-400 truncate">Employee petty cash requests</p>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export CSV
          </button>
          
          {user?.role === 'EMPLOYEE' && (
            <Link
              to="/requests/new"
              className="px-3 py-1.5 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md"
              style={{ backgroundColor: '#E8A020' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#D4911A')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#E8A020')}
            >
              <Plus className="h-3.5 w-3.5" />
              New Request
            </Link>
          )}
        </div>
      </div>

      {/* FILTER HUB */}
      <div className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row gap-2 items-center transition-colors">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by #, purpose, employee, or region..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <div className="flex items-center gap-2 flex-1 md:flex-initial">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer w-full"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="CORRECTION_REQUIRED">Correction Required</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer w-full md:w-32"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {/* REQUESTS LIST TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <span className="text-xs text-slate-400">Loading requests...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#0a2e2e] text-white font-bold text-[11px] uppercase tracking-wider border-l-4 border-l-transparent">
                  <th className="py-3.5 px-6">Request #</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Region</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Request Date</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr className="border-l-4 border-l-transparent">
                    <td colSpan={8} className="text-center py-12 text-sm text-slate-400">
                      No requests found matching your filters
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const isSomtel = req.company?.name === 'Somtel';
                    const isBluekom = req.company?.name === 'Bluekom';
                    const rowClass = isSomtel
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 border-l-4 border-l-orange-500'
                      : isBluekom
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 border-l-4 border-l-blue-600'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-l-4 border-l-transparent';

                    return (
                      <tr
                        key={req.id}
                        className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${rowClass}`}
                      >
                        <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                          {req.requestNumber}
                        </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{req.user?.fullName}</p>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            req.company.name === 'Somtel' ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                          }`}>
                            {req.company.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {req.region?.name ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                            {req.region.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {new Date(req.requiredDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-100">
                        {req.currency} {Number(req.requestedAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 hidden lg:table-cell">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded border ${
                          req.priority === 'URGENT' || req.priority === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40' :
                          req.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40' :
                          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                          req.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40' :
                          req.status === 'PAID' ? 'bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40' :
                          req.status === 'APPROVED' ? 'bg-teal-50 text-teal-700 border border-teal-200/60 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40' :
                          req.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40' :
                          req.status === 'CORRECTION_REQUIRED' ? 'bg-orange-50 text-orange-700 border border-orange-200/60 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40' :
                          req.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40' :
                          'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}>
                          {req.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Link
                          to={`/requests/${req.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold transition-all"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
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
  );
};
