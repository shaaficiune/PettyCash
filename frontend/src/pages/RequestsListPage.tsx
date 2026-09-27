import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, Filter, FileSpreadsheet, Printer, Eye, Calendar, MapPin } from 'lucide-react';


const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfWeekString = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  const start = new Date(now.getFullYear(), now.getMonth(), diff);
  return getLocalDateString(start);
};

const getStartOfMonthString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

export const RequestsListPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page] = useState(1);
  const [pageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [datePreset, setDatePreset] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'>('TODAY');
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [endDate, setEndDate] = useState(() => getLocalDateString());

  const applyDatePreset = (preset: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL' | 'CUSTOM') => {
    setDatePreset(preset);
    const today = getLocalDateString();
    if (preset === 'TODAY') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'THIS_WEEK') {
      setStartDate(getStartOfWeekString());
      setEndDate(today);
    } else if (preset === 'THIS_MONTH') {
      setStartDate(getStartOfMonthString());
      setEndDate(today);
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'CUSTOM') {
      if (!startDate) setStartDate(today);
      if (!endDate) setEndDate(today);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setDatePreset('CUSTOM');
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setDatePreset('CUSTOM');
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setRegionFilter('');
    applyDatePreset('ALL');
  };

  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus !== null) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  useEffect(() => {
    // Load regions for filter dropdown
    const compFilter = sessionStorage.getItem('companyFilter') || 'ALL';
    const params: any = {};
    if (compFilter !== 'ALL') params.companyId = compFilter;
    api.get('/companies/regions', { params })
      .then(res => setRegions(res.data || []))
      .catch(() => console.error('Failed to load regions'));
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const params: any = { page, pageSize };
      if (companyFilter !== 'ALL') params.companyId = companyFilter;
      if (statusFilter) params.status = statusFilter;
      if (regionFilter) params.regionId = regionFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/requests', { params });
      const data = res.data;
      if (data && data.items) {
        setRequests(data.items);
      } else {
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
  }, [statusFilter, regionFilter, startDate, endDate]);

  useEffect(() => {
    loadRequests();
  }, [page]);

  const handleExportExcel = async () => {
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const params: any = {};
      if (companyFilter !== 'ALL') params.companyId = companyFilter;
      if (regionFilter) params.regionId = regionFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/reports/export-excel', { params, responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `petty_cash_requests_${new Date().toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Excel Export failed', e);
    }
  };

  const handleExportPdf = () => {
    const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
    const params = new URLSearchParams();
    if (companyFilter !== 'ALL') params.append('companyId', companyFilter);
    if (regionFilter) params.append('regionId', regionFilter);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const token = localStorage.getItem('accessToken');
    const pdfUrl = `${api.defaults.baseURL || '/api'}/reports/export-pdf?${params.toString()}`;
    
    // Open printable HTML window
    const printWindow = window.open(pdfUrl, '_blank');
    if (!printWindow) {
      alert('Please allow popups to view and print the PDF report.');
    }
  };

  // Filter client-side by search and priority
  const filteredRequests = requests.filter(req => {
    const s = search.toLowerCase();
    const matchSearch =
      req.requestNumber.toLowerCase().includes(s) ||
      req.purpose.toLowerCase().includes(s) ||
      (req.user?.fullName && req.user.fullName.toLowerCase().includes(s)) ||
      (req.region?.name && req.region.name.toLowerCase().includes(s)) ||
      (req.receiverName && req.receiverName.toLowerCase().includes(s)) ||
      (req.receiverPhone && req.receiverPhone.toLowerCase().includes(s));
    const matchPriority = priorityFilter ? req.priority === priorityFilter : true;
    return matchSearch && matchPriority;
  });

  return (
    <div className="space-y-3 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-base font-bold text-slate-800 dark:text-white whitespace-nowrap leading-none">Petty Cash Requests</h2>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600 text-xs">·</span>
          <p className="hidden sm:block text-[11px] text-slate-400 truncate">Employee petty cash requests</p>
        </div>
        
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Export Excel
          </button>

          <button
            onClick={handleExportPdf}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Printer className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            Export PDF
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
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm flex flex-col gap-2.5 transition-colors">
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by #, purpose, receiver, employee, region..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto shrink-0">
            {/* Date Select Dropdown */}
            <div className="flex items-center gap-1.5 min-w-[130px] flex-1 sm:flex-initial">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={datePreset}
                onChange={(e) => applyDatePreset(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer w-full font-medium"
              >
                <option value="TODAY">Today</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="CUSTOM">Custom Date...</option>
                <option value="ALL">All Time</option>
              </select>
            </div>

            {/* Region Filter */}
            <div className="flex items-center gap-1.5 min-w-[130px] flex-1 sm:flex-initial">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer w-full"
              >
                <option value="">All Regions</option>
                {regions.map((reg) => (
                  <option key={reg.id} value={reg.id}>{reg.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer w-full"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_APPROVAL">Pending Approval (Accountant)</option>
                <option value="ACCOUNTANT_REVIEW">Accountant Reviewed (CFO)</option>
                <option value="CORRECTION_REQUIRED">Correction Required</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer w-full sm:w-28"
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

        {/* Custom Range Picker / Active Filter Reset Bar */}
        {(datePreset === 'CUSTOM' || regionFilter || statusFilter || priorityFilter || datePreset !== 'TODAY' || search) && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
            {datePreset === 'CUSTOM' ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Custom Dates:</span>
                <span className="text-[11px] text-slate-400">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                />
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">
                Filter: <span className="font-semibold text-primary">{datePreset === 'TODAY' ? 'Today' : datePreset === 'THIS_WEEK' ? 'This Week' : datePreset === 'THIS_MONTH' ? 'This Month' : 'All Time'}</span>
              </div>
            )}

            <button
              onClick={handleResetFilters}
              className="text-[11px] text-primary hover:underline font-semibold cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          </div>
        )}
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
                  <th className="py-3 px-4">Request #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Receiver / Merchant</th>
                  <th className="py-3 px-3 hidden md:table-cell">Region</th>
                  <th className="py-3 px-3 hidden lg:table-cell">Category</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3 hidden xl:table-cell">Priority</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr className="border-l-4 border-l-transparent">
                    <td colSpan={10} className="text-center py-12 text-sm text-slate-400">
                      <div>No requests found matching your filters</div>
                      {datePreset === 'TODAY' && (
                        <button
                          type="button"
                          onClick={() => applyDatePreset('ALL')}
                          className="mt-2 text-xs text-primary hover:underline font-semibold cursor-pointer block mx-auto"
                        >
                          View All Time Requests
                        </button>
                      )}
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
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {req.requestNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                          {new Date(req.requestDate || req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200">{req.user?.fullName}</p>
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              req.company.name === 'Somtel' ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                            }`}>
                              {req.company.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {req.receiverName ? (
                            <div>
                              <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">{req.receiverName}</p>
                              {req.receiverPhone && (
                                <p className="text-[11px] text-slate-400 font-mono">{req.receiverPhone}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                          {req.region?.name ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                              {req.region.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 hidden lg:table-cell text-xs">
                          {req.budgetHead ? `${req.budgetHead.code} – ${req.budgetHead.name}` : (req.requestType || '—')}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {req.currency} {Number(req.requestedAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 hidden xl:table-cell">
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
