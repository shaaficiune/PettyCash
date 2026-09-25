import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ArrowUpRight, ArrowDownLeft, RefreshCw, Filter, DollarSign, Search 
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const params: any = { page, pageSize };
      if (companyFilter !== 'ALL') params.companyId = companyFilter;
      if (typeFilter) params.transactionType = typeFilter;

      const res = await api.get('/funds/transactions', { params });
      if (res.data && res.data.items) {
        setTransactions(res.data.items);
        setTotal(res.data.total || 0);
      } else {
        setTransactions(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load transaction ledger log', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    window.addEventListener('companyFilterChanged', loadTransactions);
    return () => {
      window.removeEventListener('companyFilterChanged', loadTransactions);
    };
  }, [typeFilter, page]);

  const filtered = transactions.filter(t => {
    if (!search.trim()) return true;
    const s = search.toLowerCase().trim();
    const descMatch = t.description?.toLowerCase().includes(s);
    const refMatch = t.referenceNumber?.toLowerCase().includes(s);
    const reqMatch = t.request?.requestNumber?.toLowerCase().includes(s);
    const compMatch = t.company?.name?.toLowerCase().includes(s);
    const empMatch = t.employee?.fullName?.toLowerCase().includes(s);
    const remarksMatch = t.remarks?.toLowerCase().includes(s);
    return Boolean(descMatch || refMatch || reqMatch || compMatch || empMatch || remarksMatch);
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Transactions Ledger
          </h2>
          <p className="text-xs text-slate-500">
            Petty cash allocations, disbursements, and adjustments
          </p>
        </div>

        <button
          onClick={loadTransactions}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Ledger
        </button>
      </div>

      {/* FILTER HUB */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search description, reference #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer w-full md:w-48"
          >
            <option value="">All Movement Types</option>
            <option value="PAYMENT">Payment / Expense</option>
            <option value="ALLOCATION">Fund Allocation</option>
            <option value="CARRY_FORWARD">Carry Forward</option>
            <option value="ADJUSTMENT">Adjustment</option>
            <option value="REIMBURSEMENT">Reimbursement</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No transactions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0a2e2e] dark:bg-slate-950">
                <tr className="border-l-4 border-l-transparent">
                  <th className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-white whitespace-nowrap">Date</th>
                  <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-white whitespace-nowrap">Company</th>
                  <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-white whitespace-nowrap">Type</th>
                  <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-white hidden md:table-cell">Description</th>
                  <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-white text-right whitespace-nowrap">Debit</th>
                  <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-white text-right whitespace-nowrap">Credit</th>
                  <th className="py-3.5 px-6 text-[11px] font-bold uppercase tracking-wider text-white text-right whitespace-nowrap">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {filtered.map((t) => {
                  const isDebit = Boolean(t.debit);
                  const isSomtel = t.company?.name === 'Somtel';
                  const isBluekom = t.company?.name === 'Bluekom';
                  const rowClass = isSomtel
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 border-l-4 border-l-orange-500'
                    : isBluekom
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 border-l-4 border-l-blue-600'
                    : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40 border-l-4 border-l-transparent';
                  return (
                    <tr key={t.id} className={`transition-colors ${rowClass}`}>
                      <td className="py-4 px-6 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.company?.name === 'Somtel'
                            ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20'
                            : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                        }`}>
                          {t.company?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                          t.transactionType === 'PAYMENT' 
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                            : t.transactionType === 'CARRY_FORWARD'
                            ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {isDebit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                          {t.transactionType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4 max-w-sm hidden md:table-cell">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {(() => {
                            let desc = t.description || '';
                            const match = desc.match(/^Payment for [A-Z0-9\-]+ - (.+)$/);
                            if (match) desc = match[1];
                            if (/^Payment for request [a-f0-9\-]{36}$/.test(desc)) desc = 'Payment';
                            return desc || '—';
                          })()}
                        </div>
                        {t.request?.requestNumber && (
                          <span className="text-xs text-primary font-semibold block mt-0.5">
                            #{t.request.requestNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap">
                        {t.debit ? `-$${Number(t.debit).toLocaleString()}` : '-'}
                      </td>
                      <td className="py-4 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                        {t.credit ? `+$${Number(t.credit).toLocaleString()}` : '-'}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        ${Number(t.balanceAfter).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>Showing page {page} of {totalPages} ({total} entries)</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
