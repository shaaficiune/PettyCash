import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
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
        <p className="text-xs text-slate-500">Recorded disbursements and transaction logs</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
          <div className="p-4 flex gap-3 items-end">
            <div>
              <label className="text-[10px] text-slate-500">From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="ml-2 px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="ml-2 px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Paid By (ID)</label>
              <input placeholder="User ID" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="ml-2 px-2 py-1 border rounded" />
            </div>
            <div>
              <button onClick={() => loadPayments(1)} className="px-3 py-1 bg-primary text-white rounded">Filter</button>
            </div>
            <div className="ml-auto">
              <button onClick={() => exportCsv()} className="px-3 py-1 bg-slate-700 text-white rounded">Export CSV</button>
            </div>
          </div>
          {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <span className="text-xs text-slate-400">Fetching payments...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No payments recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-xs bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3.5 px-6">Request #</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4">Paid By</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-6">Ref / Txn</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-800 dark:text-slate-200">
                      <Link to={`/requests/${p.request?.id}`} className="hover:underline text-primary">{p.request?.requestNumber}</Link>
                    </td>
                    <td className="py-3.5 px-4 font-bold">{p.amountPaid}</td>
                    <td className="py-3.5 px-4">{p.paymentMethod}</td>
                    <td className="py-3.5 px-4">{p.paidBy?.fullName || p.paidBy?.username}</td>
                    <td className="py-3.5 px-4">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-6 text-xs">{p.referenceNumber || p.transactionId || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {meta && (
              <div className="p-4 flex justify-between items-center text-xs">
                <div>Showing page {meta.page} of {Math.ceil(meta.total / meta.pageSize)}</div>
                <div className="flex gap-2">
                  <button disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)} className="px-3 py-1 bg-slate-100 rounded">Prev</button>
                  <button disabled={meta.page >= Math.ceil(meta.total / meta.pageSize)} onClick={() => setPage(meta.page + 1)} className="px-3 py-1 bg-slate-100 rounded">Next</button>
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
  const csv = ['Request,Amount,Method,PaidBy,Date,Ref', ...data.map(r => r.map(c => '"'+c.replace(/"/g,'""')+'"').join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'payments.csv'; a.click();
  URL.revokeObjectURL(url);
}
