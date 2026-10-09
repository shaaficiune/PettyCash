import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  FileDown,
} from 'lucide-react';

interface FundSummary {
  id: string;
  companyId: string;
  month: number;
  year: number;
  openingBalance: number;
  additionalFunding: number;
  totalAvailable: number;
  approvedAmount: number;
  paidAmount: number;
  remainingBalance: number;
  closingBalance: number;
  status: string;
}

interface Company {
  id: string;
  name: string;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const FundManagementPage: React.FC = () => {
  const { user } = useAuth();
  const now = new Date();
  const canExportBook = user?.role === 'SUPER_ADMIN' || user?.role === 'ACCOUNTANT';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const [fund, setFund] = useState<FundSummary | null>(null);
  const [loadingFund, setLoadingFund] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);

  // Form state
  const [openingBalance, setOpeningBalance] = useState('');
  const [additionalFunding, setAdditionalFunding] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [prevFund, setPrevFund] = useState<FundSummary | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [closingMonth, setClosingMonth] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exportingBook, setExportingBook] = useState(false);

  // Load companies
  useEffect(() => {
    api.get('/companies')
      .then(res => {
        setCompanies(res.data);
        if (res.data.length > 0) {
          const myCompany = res.data.find((c: Company) => c.id === user?.company?.id);
          setSelectedCompanyId(myCompany ? myCompany.id : res.data[0].id);
        }
      })
      .catch(() => {});
  }, [user]);

  // Load fund when company/month/year changes
  useEffect(() => {
    if (!selectedCompanyId) return;
    fetchFund();
  }, [selectedCompanyId, selectedMonth, selectedYear]);

  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

  const fetchFund = async () => {
    setLoadingFund(true);
    setFundError(null);
    setFund(null);
    setPrevFund(null);
    try {
      const res = await api.get('/funds/summary', {
        params: { month: selectedMonth, year: selectedYear, companyId: selectedCompanyId },
      });
      setFund(res.data);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 400) {
        setFund(null);
        // Fetch previous month to check for carry-forward balance
        try {
          const prevRes = await api.get('/funds/summary', {
            params: { month: prevMonth, year: prevYear, companyId: selectedCompanyId },
          });
          if (prevRes.data) {
            setPrevFund(prevRes.data);
            const prevRem = Number(prevRes.data.remainingBalance || 0);
            if (prevRem > 0) {
              setOpeningBalance(String(prevRem));
            } else {
              setOpeningBalance('');
            }
          }
        } catch {
          setPrevFund(null);
          setOpeningBalance('');
        }
      } else {
        setFundError(err?.response?.data?.message || 'Could not load fund data.');
      }
    } finally {
      setLoadingFund(false);
    }
  };

  const clearMessages = () => {
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleInitFund = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setSubmitting(true);
    try {
      await api.post('/funds/init', {
        companyId: selectedCompanyId,
        month: selectedMonth,
        year: selectedYear,
        openingBalance: parseFloat(openingBalance) || 0,
        additionalFunding: parseFloat(additionalFunding) || 0,
      });
      setSuccessMsg(`Fund initialized successfully.`);
      setOpeningBalance('');
      setAdditionalFunding('');
      fetchFund();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to initialize fund.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseMonth = async () => {
    if (!fund) return;
    clearMessages();
    setClosingMonth(true);
    try {
      await api.post('/funds/close', {
        companyId: selectedCompanyId,
        month: selectedMonth,
        year: selectedYear,
      });
      setSuccessMsg(`Month ${MONTHS[selectedMonth - 1]} ${selectedYear} has been closed. Remaining balance rolled over to next month.`);
      setShowCloseModal(false);
      fetchFund();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to close month.');
    } finally {
      setClosingMonth(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setSubmitting(true);
    try {
      await api.post('/funds/init', {
        companyId: selectedCompanyId,
        month: selectedMonth,
        year: selectedYear,
        openingBalance: 0,
        additionalFunding: parseFloat(topUpAmount) || 0,
      });
      setSuccessMsg(`Added $${fmt(parseFloat(topUpAmount) || 0)} to fund.`);
      setTopUpAmount('');
      fetchFund();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to top up fund.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const isFundOpen = fund && fund.status === 'OPEN';

  const yearOptions = [];
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) {
    yearOptions.push(y);
  }

  const handleExportMonthlyBook = async () => {
    setExportingBook(true);
    try {
      const params: Record<string, string> = {
        month: String(selectedMonth),
        year: String(selectedYear),
      };
      if (selectedCompanyId) params.companyId = selectedCompanyId;
      const res = await api.get('/funds/export/monthly-book', {
        params,
        responseType: 'blob',
      });
      const contentDisposition = res.headers['content-disposition'] || '';
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `Petty_Cash_Book_${MONTHS[selectedMonth - 1]}_${selectedYear}.xlsx`;
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Monthly book export failed', err);
    } finally {
      setExportingBook(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Fund Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage petty cash allocations and top-ups
          </p>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Company Select */}
          <div className="relative">
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-sm"
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Month Select */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-sm"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Year Select */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-sm"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={fetchFund}
            className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Export Monthly Book — Accountant / Super Admin only */}
          {canExportBook && (
            <button
              id="btn-export-monthly-book"
              onClick={handleExportMonthlyBook}
              disabled={exportingBook}
              title="Export Monthly Petty Cash Book (.xlsx)"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              {exportingBook ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Export Book</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-medium">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading State */}
      {loadingFund && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Fund Error */}
      {!loadingFund && fundError && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-medium">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{fundError}</span>
        </div>
      )}

      {/* Case 1: No Fund - Initialize Form */}
      {!loadingFund && !fundError && !fund && selectedCompanyId && (
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Initialize Fund</h2>
              <p className="text-xs text-slate-500">{selectedCompany?.name} · {MONTHS[selectedMonth - 1]} {selectedYear}</p>
            </div>
          </div>

          {prevFund && Number(prevFund.remainingBalance || 0) > 0 && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-start gap-2.5 mb-4 text-xs text-amber-800 dark:text-amber-300">
              <ArrowUpRight className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-bold">Previous Month Rollover Detected</p>
                <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                  {MONTHS[prevMonth - 1]} {prevYear} has a remaining balance of <strong className="font-mono font-bold">${fmt(Number(prevFund.remainingBalance))}</strong>. It is prefilled below as your Opening Balance (Carry-Forward).
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleInitFund} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Opening Balance / Carry-Forward ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Monthly Allocation ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={additionalFunding}
                onChange={e => setAdditionalFunding(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="0.00"
              />
              <p className="text-[11px] text-slate-400 mt-1">New fund allocation assigned for this month</p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-400">Total Starting Available:</span>
              <span className="font-mono font-bold text-sm text-primary">
                ${fmt((parseFloat(openingBalance) || 0) + (parseFloat(additionalFunding) || 0))}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || (!openingBalance && !additionalFunding)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              Initialize Fund
            </button>
          </form>
        </div>
      )}

      {/* Case 2: Fund Exists */}
      {!loadingFund && !fundError && fund && (
        <div className="space-y-6">
          {/* 4 Compact Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Opening Balance', value: fund.openingBalance, icon: DollarSign, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
              { label: 'Total Available', value: fund.totalAvailable, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Total Paid Out', value: fund.approvedAmount, icon: ArrowUpRight, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
              { label: 'Remaining Balance', value: fund.remainingBalance, icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            ].map(stat => (
              <div key={stat.label} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-3.5 shadow-sm flex items-center gap-3.5">
                <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color} leading-tight tracking-tight mt-0.5`}>${fmt(Number(stat.value))}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top-Up Action Bar (only if open) */}
          {isFundOpen && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <form onSubmit={handleTopUp} className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Top-Up Amount ($)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={topUpAmount}
                    onChange={e => setTopUpAmount(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter amount"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !topUpAmount}
                  className="sm:self-end flex items-center justify-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer whitespace-nowrap"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                  Add Funds
                </button>
              </form>

              {/* Close Month Button */}
              <div className="border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-3 md:pt-0 md:pl-4 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(true)}
                  className="w-full md:w-auto px-4 py-2 border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
                >
                  Close Month
                </button>
              </div>
            </div>
          )}

          {/* Close Month Confirmation Modal */}
          {showCloseModal && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Close Month: {MONTHS[selectedMonth - 1]} {selectedYear}?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Closing this fund will lock {MONTHS[selectedMonth - 1]} {selectedYear}. The remaining balance of <strong className="text-emerald-600 font-bold">${fmt(Number(fund.remainingBalance))}</strong> will automatically roll over as the Opening Balance for the next month.
                </p>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    disabled={closingMonth}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseMonth}
                    disabled={closingMonth}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {closingMonth ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Confirm & Close Month
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fund Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Fund Summary</h3>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                isFundOpen ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-600'
              }`}>
                {fund.status}
              </span>
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { label: 'Opening Balance (Carry-Forward)', value: fund.openingBalance, type: 'credit' },
                  { label: 'Monthly Allocation / Top-Up', value: fund.additionalFunding, type: 'credit' },
                  { label: 'Total Available', value: fund.totalAvailable, type: 'total' },
                  { label: 'Approved Requests', value: fund.approvedAmount, type: 'debit' },
                  { label: 'Payments Made', value: fund.paidAmount, type: 'debit' },
                  { label: 'Remaining Balance', value: fund.remainingBalance, type: 'balance' },
                ].map((row) => (
                  <tr key={row.label} className={row.type === 'total' || row.type === 'balance' ? 'bg-slate-50/60 dark:bg-slate-800/40 font-bold' : ''}>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{row.label}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${
                      row.type === 'debit' ? 'text-rose-600 dark:text-rose-400' :
                      row.type === 'balance' ? 'text-emerald-600 dark:text-emerald-400' :
                      row.type === 'total' ? 'text-primary' :
                      'text-slate-800 dark:text-slate-200'
                    }`}>
                      {row.type === 'debit' ? '-' : ''}${fmt(Number(row.value))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
