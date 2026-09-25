import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [paidBy, setPaidBy] = useState<string>('');

  const loadPayments = async (p = 1) => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const companyQuery = companyFilter !== 'ALL' ? `&companyId=${companyFilter}` : '';
      const dateQuery = (fromDate ? `&from=${fromDate}` : '') + (toDate ? `&to=${toDate}` : '');
      const paidByQuery = paidBy ? `&paidById=${paidBy}` : '';
      const res = await api.get(`/payments?page=${p}&pageSize=20${companyQuery}${dateQuery}${paidByQuery}`);
      setPayments(res.data.items || res.data);
      setMeta(res.data.meta || null);
    } catch (e) {
      console.error('Failed to load payments', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments(page);
  }, [page]);

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Payments</h2>
        <p className="text-xs text-slate-500">Disbursements and payment records</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
          <div className="p-4 flex flex-wrap gap-3 items-end border-b border-slate-100 dark:border-slate-800">
            <div className="w-full sm:w-auto flex-1 min-w-[130px]">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="w-full sm:w-auto flex-1 min-w-[130px]">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="w-full sm:w-auto flex-1 min-w-[120px]">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Paid By (ID)</label>
              <input placeholder="User ID" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
              <button onClick={() => loadPayments(1)} className="px-4 py-1.5 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-all flex-1 sm:flex-initial text-center" style={{ backgroundColor: '#E8A020' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor='#D4911A')} onMouseLeave={e => (e.currentTarget.style.backgroundColor='#E8A020')}>Filter</button>
              <button onClick={() => exportCsv()} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-all flex-1 sm:flex-initial text-center">Export CSV</button>
            </div>
          </div>
          {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <span className="text-xs text-slate-400">Loading payments...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No payments recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#0a2e2e] text-white font-bold text-[11px] uppercase tracking-wider border-l-4 border-l-transparent">
                  <th className="py-3.5 px-6">Request #</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Company</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Method</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Paid By</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Date</th>
                  <th className="py-3.5 px-6">Ref / Txn</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const isSomtel = p.request?.company?.name === 'Somtel';
                  const isBluekom = p.request?.company?.name === 'Bluekom';
                  const rowClass = isSomtel
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 border-l-4 border-l-orange-500'
                    : isBluekom
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 border-l-4 border-l-blue-600'
                    : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-l-4 border-l-transparent';
                  return (
                    <tr key={p.id} className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${rowClass}`}>
                      <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                        <Link to={`/requests/${p.request?.id}`} className="hover:underline text-primary">{p.request?.requestNumber}</Link>
                      </td>
                      <td className="py-4 px-4 hidden sm:table-cell">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          isSomtel ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20' : isBluekom ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {p.request?.company?.name || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-100">{p.amountPaid}</td>
                      <td className="py-4 px-4 hidden md:table-cell text-slate-600 dark:text-slate-400">{p.paymentMethod}</td>
                      <td className="py-4 px-4 hidden lg:table-cell text-slate-600 dark:text-slate-400">{p.paidBy?.fullName || p.paidBy?.username}</td>
                      <td className="py-4 px-4 hidden md:table-cell text-slate-500 dark:text-slate-400">{new Date(p.paymentDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="py-4 px-6 text-sm text-slate-700 dark:text-slate-300">{p.referenceNumber || p.transactionId || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {meta && (
              <div className="p-4 flex justify-between items-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
                <div>Showing page {meta.page} of {Math.ceil(meta.total / meta.pageSize)}</div>
                <div className="flex gap-2">
                  <button disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 cursor-pointer disabled:opacity-50">Prev</button>
                  <button disabled={meta.page >= Math.ceil(meta.total / meta.pageSize)} onClick={() => setPage(meta.page + 1)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 cursor-pointer disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;

function exportCsv() {
  // Build CSV from table rows on page
  const rows = Array.from(document.querySelectorAll('table tbody tr'));
  const data = rows.map(r => Array.from(r.querySelectorAll('td')).map(td => td.textContent?.trim().replace(/\s+/g,' ') || ''));
  const csv = ['Request,Company,Amount,Method,PaidBy,Date,Ref', ...data.map(r => r.map(c => '"'+c.replace(/"/g,'""')+'"').join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'payments.csv'; a.click();
  URL.revokeObjectURL(url);
}
