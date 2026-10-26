import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileDown,
  Lock,
  Building2,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  Sparkles,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui';

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
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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

  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

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
        setFundError(err?.response?.data?.message || 'Failed to load fund summary');
      }
    } finally {
      setLoadingFund(false);
    }
  };

  const handleInitFund = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post('/funds/init', {
        companyId: selectedCompanyId,
        month: selectedMonth,
        year: selectedYear,
        openingBalance: parseFloat(openingBalance) || 0,
        additionalFunding: parseFloat(additionalFunding) || 0,
      });
      setSuccessMsg(`Fund initialized successfully for ${MONTHS[selectedMonth - 1]} ${selectedYear}`);
      setOpeningBalance('');
      setAdditionalFunding('');
      await fetchFund();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to initialize fund');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post('/funds/init', {
        companyId: selectedCompanyId,
        month: Number(selectedMonth),
        year: Number(selectedYear),
        openingBalance: Number(fund?.openingBalance || 0),
        additionalFunding: Number(fund?.additionalFunding || 0) + amount,
      });
      setSuccessMsg(`Top-up of $${fmt(amount)} successfully credited to float`);
      setTopUpAmount('');
      await fetchFund();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to top-up fund');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseMonth = async () => {
    setClosingMonth(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post('/funds/close', {
        companyId: selectedCompanyId,
        month: selectedMonth,
        year: selectedYear,
      });
      setShowCloseModal(false);
      setSuccessMsg(`${MONTHS[selectedMonth - 1]} ${selectedYear} has been closed. Rollover of $${fmt(Number(fund?.remainingBalance))} carried forward.`);
      await fetchFund();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to close month');
    } finally {
      setClosingMonth(false);
    }
  };

  const handleExportMonthlyBook = async () => {
    if (!selectedCompanyId) return;
    setExportingBook(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/funds/export/monthly-book', {
        params: { companyId: selectedCompanyId, month: selectedMonth, year: selectedYear },
        responseType: 'blob',
      });
      const compName = selectedCompany?.name || 'Company';
      const monthName = MONTHS[selectedMonth - 1];
      const filename = `Petty_Cash_Book_${compName}_${monthName}_${selectedYear}.xlsx`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg('Failed to export Monthly Petty Cash Book. Please try again.');
    } finally {
      setExportingBook(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const isSomtel = (selectedCompany?.name || '').toLowerCase().includes('somtel');
  const isFundOpen = fund && fund.status === 'OPEN';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      {/* ─────────────────────────────────────────────────────────────
          1. EXECUTIVE HEADER & CONTROLS
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <Wallet className="h-5 w-5 text-[#F5B700]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground tracking-tight font-display">
                  Cash Fund Management
                </h1>
                {fund && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      isFundOpen
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isFundOpen ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                    {fund.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Petty cash reserve, capital replenishments, and period rollover reconciliations
              </p>
            </div>
          </div>
        </div>

        {/* Global Control Bar */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Company Segmented Switcher */}
          {companies.length > 1 && (
            <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border shadow-2xs">
              {companies.map(c => {
                const isSelected = c.id === selectedCompanyId;
                const isCompSomtel = c.name.toLowerCase().includes('somtel');
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCompanyId(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? isCompSomtel
                          ? 'bg-[#D97706] text-white shadow-xs'
                          : 'bg-[#1F5FBF] text-white shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Period Navigator */}
          <div className="inline-flex items-center bg-card border border-border rounded-xl p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 px-3">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-bold font-display text-foreground whitespace-nowrap">
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </span>
            </div>
            <button
              type="button"
              onClick={goToNextMonth}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Download Monthly Book */}
          {canExportBook && fund && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMonthlyBook}
              disabled={exportingBook}
              className="gap-1.5 h-8.5 text-xs font-semibold shadow-2xs"
              title="Download official Monthly Petty Cash Book Excel with company header"
            >
              {exportingBook ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="hidden sm:inline">Download</span> Monthly Book
            </Button>
          )}

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={fetchFund}
            title="Refresh Fund Data"
            className="h-8.5 w-8.5 rounded-lg border border-border/60 hover:bg-muted"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingFund ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <Alert variant="success" className="py-2.5 rounded-xl border border-emerald-500/30">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertDescription className="text-xs font-medium">{successMsg}</AlertDescription>
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="destructive" className="py-2.5 rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs font-medium">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {loadingFund && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-card rounded-2xl border border-border/80">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Loading treasury reserve & ledger...</p>
        </div>
      )}

      {/* Fund Error */}
      {!loadingFund && fundError && (
        <Alert variant="warning" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{fundError}</AlertDescription>
        </Alert>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. ZERO STATE: INITIALIZE FUND ONBOARDING CARD
          ───────────────────────────────────────────────────────────── */}
      {!loadingFund && !fundError && !fund && selectedCompanyId && (
        <Card className="max-w-xl mx-auto shadow-sm border border-border/80 bg-card rounded-2xl overflow-hidden">
          <div className={`h-1.5 w-full ${isSomtel ? 'bg-[#D97706]' : 'bg-[#1F5FBF]'}`} />
          <CardHeader className="p-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <PlusCircle className="h-5 w-5 text-[#F5B700]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground font-display">
                  Initialize Fund Period
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {selectedCompany?.name} · {MONTHS[selectedMonth - 1]} {selectedYear}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 pt-0 space-y-4">
            {prevFund && Number(prevFund.remainingBalance || 0) > 0 && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <Sparkles className="h-4 w-4" />
                  <span>Previous Month Rollover Detected</span>
                </div>
                <p className="text-muted-foreground leading-relaxed text-[11.5px]">
                  {MONTHS[prevMonth - 1]} {prevYear} closed with <strong className="font-mono font-bold text-foreground">${fmt(Number(prevFund.remainingBalance))}</strong> in remaining balance. It is automatically prefilled below as Opening Balance.
                </p>
              </div>
            )}

            <form onSubmit={handleInitFund} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Opening Balance (Rollover Carry-Forward)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={openingBalance}
                    onChange={e => setOpeningBalance(e.target.value)}
                    placeholder="0.00"
                    className="pl-7 h-9 text-xs font-mono font-medium"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Unspent funds transferred from preceding active month</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Monthly Inflow Allocation</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={additionalFunding}
                    onChange={e => setAdditionalFunding(e.target.value)}
                    placeholder="0.00"
                    className="pl-7 h-9 text-xs font-mono font-medium"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Fresh capital injection allocated for this month</p>
              </div>

              <div className="p-3.5 bg-muted/40 rounded-xl border border-border flex justify-between items-center text-xs">
                <span className="font-medium text-muted-foreground">Total Starting Pool:</span>
                <span className="font-mono font-bold text-base text-primary">
                  ${fmt((parseFloat(openingBalance) || 0) + (parseFloat(additionalFunding) || 0))}
                </span>
              </div>

              <Button
                type="submit"
                variant="gold"
                size="sm"
                isLoading={submitting}
                disabled={submitting || (!openingBalance && !additionalFunding)}
                className="w-full gap-2 font-bold h-9.5 shadow-sm"
              >
                <PlusCircle className="h-4 w-4" />
                Initialize Monthly Fund
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. ACTIVE FUND WORKSPACE (FINANCIAL COCKPIT)
          ───────────────────────────────────────────────────────────── */}
      {!loadingFund && !fundError && fund && (() => {
        const totalAvailable = Number(fund.totalAvailable || 0);
        const remainingBalance = Number(fund.remainingBalance || 0);
        const spentAmount = Number(fund.approvedAmount || fund.paidAmount || 0);
        const opening = Number(fund.openingBalance || 0);
        const topups = Number(fund.additionalFunding || 0);

        const spentPct = totalAvailable > 0 ? Math.min(100, Math.round((spentAmount / totalAvailable) * 100)) : 0;
        const remPct = totalAvailable > 0 ? Math.max(0, 100 - spentPct) : 0;
        const isLowFloat = remainingBalance < 300;

        return (
          <div className="space-y-6">
            {/* ── TOP BENTO METRIC STRIP ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Metric 1: Net Available Cash Float */}
              <Card className="relative overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className={`h-1 w-full ${isLowFloat ? 'bg-amber-500' : 'bg-[#059669]'}`} />
                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Net Available Float</span>
                    {isLowFloat ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                        <AlertTriangle className="h-3 w-3" />
                        &lt; $300 Alert
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck className="h-3 w-3" />
                        Healthy
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-2xl sm:text-3xl font-bold font-mono font-financial text-foreground tracking-tight tabular-nums">
                      ${fmt(remainingBalance)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                      {remPct}% liquidity remaining
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                      <div
                        className={`h-full ${isLowFloat ? 'bg-amber-500' : 'bg-[#059669]'}`}
                        style={{ width: `${remPct}%` }}
                      />
                      <div className="h-full bg-rose-500/80" style={{ width: `${spentPct}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metric 2: Opening Rollover */}
              <Card className="relative overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="h-1 w-full bg-[#1F5FBF]" />
                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Opening Balance</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-[#1F5FBF] dark:text-[#60A5FA]">
                      Rollover
                    </span>
                  </div>

                  <div>
                    <p className="text-2xl sm:text-3xl font-bold font-mono font-financial text-foreground tracking-tight tabular-nums">
                      ${fmt(opening)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium truncate">
                      From {MONTHS[prevMonth - 1]} {prevYear}
                    </p>
                  </div>

                  <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    Brought forward from prior month
                  </div>
                </CardContent>
              </Card>

              {/* Metric 3: Inflows / Top-Ups */}
              <Card className="relative overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="h-1 w-full bg-[#059669]" />
                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Allocations & Top-Ups</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      + Inflows
                    </span>
                  </div>

                  <div>
                    <p className="text-2xl sm:text-3xl font-bold font-mono font-financial text-[#059669] dark:text-[#34D399] tracking-tight tabular-nums">
                      ${fmt(topups)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                      Total pool: ${fmt(totalAvailable)}
                    </p>
                  </div>

                  <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    Fresh capital injected this period
                  </div>
                </CardContent>
              </Card>

              {/* Metric 4: Outflow / Disbursed */}
              <Card className="relative overflow-hidden border border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="h-1 w-full bg-[#DC2626]" />
                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Total Disbursed</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400">
                      - Outflow
                    </span>
                  </div>

                  <div>
                    <p className="text-2xl sm:text-3xl font-bold font-mono font-financial text-[#DC2626] dark:text-[#F87171] tracking-tight tabular-nums">
                      ${fmt(spentAmount)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                      {spentPct}% of monthly available pool
                    </p>
                  </div>

                  <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    Vouchers executed & settled
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── 2-COLUMN FINANCIAL WORKSPACE ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Formal Cash Flow Statement */}
              <Card className="lg:col-span-7 border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                  <CardHeader className="p-5 pb-3 border-b border-border/70 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground font-display flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        Monthly Cash Flow Statement
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Formal audit reconciliation for {selectedCompany?.name} · {MONTHS[selectedMonth - 1]} {selectedYear}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="divide-y divide-border/60 text-xs">
                      {/* 1. Opening Rollover */}
                      <div className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground">Opening Balance (Rollover)</p>
                          <p className="text-[11px] text-muted-foreground">Unspent carry-forward from {MONTHS[prevMonth - 1]} {prevYear}</p>
                        </div>
                        <span className="font-mono font-bold text-foreground text-sm tabular-nums">
                          ${fmt(opening)}
                        </span>
                      </div>

                      {/* 2. Additional Inflows */}
                      <div className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground">(+) New Allocations & Top-Ups</p>
                          <p className="text-[11px] text-muted-foreground">Capital deposits added during this month</p>
                        </div>
                        <span className="font-mono font-bold text-[#059669] dark:text-[#34D399] text-sm tabular-nums">
                          +${fmt(topups)}
                        </span>
                      </div>

                      {/* Subtotal: Total Available Pool */}
                      <div className="px-5 py-3 bg-muted/40 flex items-center justify-between border-y border-border">
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground">(=) Total Available Petty Cash Pool</p>
                          <p className="text-[11px] text-muted-foreground">Maximum liquid threshold for this period</p>
                        </div>
                        <span className="font-mono font-bold text-primary text-sm tabular-nums">
                          ${fmt(totalAvailable)}
                        </span>
                      </div>

                      {/* 3. Disbursed Vouchers */}
                      <div className="px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground">(-) Disbursed Payments</p>
                          <p className="text-[11px] text-muted-foreground">Approved vouchers paid out to employees</p>
                        </div>
                        <span className="font-mono font-bold text-[#DC2626] dark:text-[#F87171] text-sm tabular-nums">
                          -${fmt(spentAmount)}
                        </span>
                      </div>

                      {/* Final Total: Remaining Balance */}
                      <div className="px-5 py-4 bg-primary/5 dark:bg-primary/10 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground text-sm">(=) Net Remaining Cash Float</p>
                          <p className="text-[11px] text-muted-foreground">Current verified vault balance ready for disbursement</p>
                        </div>
                        <span className="font-mono font-bold text-lg text-primary tabular-nums">
                          ${fmt(remainingBalance)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 bg-muted/20 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Reconciliation Status: <strong>{fund.status}</strong></span>
                  <span className="font-mono">Vault Cap: ${fmt(totalAvailable)}</span>
                </div>
              </Card>

              {/* Right Column (5 cols): Replenishment & Month Close Actions */}
              <div className="lg:col-span-5 space-y-4">
                {/* Action Card 1: Top-Up Cash Float */}
                {isFundOpen ? (
                  <Card className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden">
                    <CardHeader className="p-4 pb-2 border-b border-border/70">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <PlusCircle className="h-3.5 w-3.5 text-primary" />
                          Top-Up Cash Reserve
                        </CardTitle>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Immediate Credit
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3.5">
                      <form onSubmit={handleTopUp} className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Deposit Amount ($)</Label>
                            {/* Preset quick chips */}
                            <div className="flex items-center gap-1">
                              {[100, 250, 500, 1000].map(amt => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setTopUpAmount(String(amt))}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-muted hover:bg-primary hover:text-white transition-colors cursor-pointer"
                                >
                                  +${amt}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">$</span>
                            <Input
                              type="number"
                              min="1"
                              step="0.01"
                              value={topUpAmount}
                              onChange={e => setTopUpAmount(e.target.value)}
                              required
                              placeholder="0.00"
                              className="pl-7 h-9 text-xs font-mono font-medium"
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          variant="gold"
                          size="sm"
                          disabled={submitting || !topUpAmount}
                          isLoading={submitting}
                          className="w-full gap-1.5 font-bold h-9 shadow-xs"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Credit Cash Float
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-border/80 bg-muted/30 rounded-2xl p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      This month is closed. Switch to an open month to add top-up funds.
                    </p>
                  </Card>
                )}

                {/* Action Card 2: Period Close & Reconciliation */}
                <Card className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden">
                  <CardHeader className="p-4 pb-2 border-b border-border/70">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      Month-End Closing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isFundOpen
                        ? `Closing ${MONTHS[selectedMonth - 1]} locks all ledger entries. The remaining $${fmt(remainingBalance)} float will automatically transfer to next month as the Opening Balance.`
                        : `This period is locked. All records are finalized and unspent float has rolled over.`}
                    </p>

                    {isFundOpen && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCloseModal(true)}
                        className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 h-9 font-semibold text-xs gap-1.5"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Close & Reconcile {MONTHS[selectedMonth - 1]}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ── CLOSE MONTH MODAL ── */}
            <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
              <DialogContent onClose={() => setShowCloseModal(false)} className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-destructive" />
                    Close Month: {MONTHS[selectedMonth - 1]} {selectedYear}?
                  </DialogTitle>
                  <DialogDescription className="text-xs leading-relaxed pt-1">
                    Closing this fund will lock <strong className="text-foreground">{MONTHS[selectedMonth - 1]} {selectedYear}</strong>. The remaining balance of <strong className="font-mono font-bold text-foreground">${fmt(remainingBalance)}</strong> will be verified and transferred as the Opening Balance (Carry-Forward) for next month.
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCloseModal(false)}
                    disabled={closingMonth}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCloseMonth}
                    disabled={closingMonth}
                    isLoading={closingMonth}
                  >
                    Confirm & Close Month
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );
      })()}
    </div>
  );
};

export default FundManagementPage;
