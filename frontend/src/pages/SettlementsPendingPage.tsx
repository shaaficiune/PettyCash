import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';

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
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Settlement Audits</h2>
        <p className="text-xs text-slate-500">Review employee expenses and receipts</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-colors">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <span className="text-xs text-slate-400">Loading settlements...</span>
          </div>
        ) : settlements.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No pending settlements.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#0a2e2e] text-white font-bold text-[11px] uppercase tracking-wider border-l-4 border-l-transparent">
                  <th className="py-3.5 px-6">Request #</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Company</th>
                  <th className="py-3.5 px-4">Actual spent</th>
                  <th className="py-3.5 px-4">Remaining Balance</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Submitted Date</th>
                  <th className="py-3.5 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((st) => {
                  const isSomtel = st.request?.company?.name === 'Somtel';
                  const isBluekom = st.request?.company?.name === 'Bluekom';
                  const rowClass = isSomtel
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 border-l-4 border-l-orange-500'
                    : isBluekom
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 border-l-4 border-l-blue-600'
                    : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-l-4 border-l-transparent';
                  return (
                    <tr
                      key={st.id}
                      className={`border-b border-slate-100 dark:border-slate-800/60 transition-colors ${rowClass}`}
                    >
                    <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                      {st.request?.requestNumber}
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{st.request?.user?.fullName}</p>
                        <p className="text-xs text-slate-400">Emp #: {st.request?.user?.employeeNumber}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        st.request?.company?.name === 'Somtel' 
                          ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400' 
                          : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                      }`}>
                        {st.request?.company?.name}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-100">
                      {st.request?.currency} {Number(st.actualExpenseAmount).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 font-semibold">
                      <span className={Number(st.remainingBalance) > 0 ? 'text-amber-600 dark:text-amber-400' : Number(st.remainingBalance) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}>
                        {st.request?.currency} {Number(st.remainingBalance).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                      {new Date(st.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Link
                        to={`/requests/${st.request?.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E8A020] hover:bg-[#D4911A] text-white rounded text-xs font-semibold transition-all shadow-xs cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Audit
                      </Link>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
