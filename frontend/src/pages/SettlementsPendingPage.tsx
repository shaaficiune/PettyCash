import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { Eye, CheckCircle, HelpCircle, FileSpreadsheet } from 'lucide-react';

export const SettlementsPendingPage: React.FC = () => {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSettlements = async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const companyQuery = companyFilter !== 'ALL' ? `?companyId=${companyFilter}` : '';
      const res = await api.get(`/settlements/pending${companyQuery}`);
      setSettlements(res.data);
    } catch (e) {
      console.error('Failed to load pending settlements list', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettlements();
    window.addEventListener('companyFilterChanged', loadSettlements);
    return () => {
      window.removeEventListener('companyFilterChanged', loadSettlements);
    };
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Settlement Audits Queue</h2>
        <p className="text-xs text-slate-500">Review employee actual expenses, receipts, and refund claims</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <span className="text-xs text-slate-400">Fetching settlements queue...</span>
          </div>
        ) : settlements.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No pending settlements requiring audit.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-xs bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3.5 px-6">Request #</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Company</th>
                  <th className="py-3.5 px-4">Actual spent</th>
                  <th className="py-3.5 px-4">Remaining Balance</th>
                  <th className="py-3.5 px-4">Submitted Date</th>
                  <th className="py-3.5 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((st) => (
                  <tr
                    key={st.id}
                    className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors"
                  >
                    <td className="py-3.5 px-6 font-semibold text-slate-800 dark:text-slate-200">
                      {st.request?.requestNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold">{st.request?.user?.fullName}</p>
                        <p className="text-[10px] text-slate-400">Emp #: {st.request?.user?.employeeNumber}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        st.request?.company?.name === 'Somtel' ? 'bg-orange-50 text-somtel-600' : 'bg-blue-50 text-bluekom-600'
                      }`}>
                        {st.request?.company?.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold">
                      {st.request?.currency} {Number(st.actualExpenseAmount).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      <span className={Number(st.remainingBalance) > 0 ? 'text-amber-600' : Number(st.remainingBalance) < 0 ? 'text-rose-600' : 'text-slate-600'}>
                        {st.request?.currency} {Number(st.remainingBalance).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {new Date(st.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <Link
                        to={`/requests/${st.request?.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary text-white hover:bg-primary/95 rounded text-xs font-semibold transition-all shadow-md shadow-primary/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Audit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
