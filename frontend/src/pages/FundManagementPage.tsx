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
import { Table, TableBody, TableRow, TableCell } from '../components/ui/table';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Select,
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
      setSuccessMsg('Fund initialized successfully');
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
        month: selectedMonth,
        year: selectedYear,
        openingBalance: fund?.openingBalance || 0,
        additionalFunding: (fund?.additionalFunding || 0) + amount,
      });
      setSuccessMsg(`Top-up of $${fmt(amount)} added successfully`);
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
      setSuccessMsg(`${MONTHS[selectedMonth - 1]} ${selectedYear} has been closed. Rollover applied.`);
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
  const isFundOpen = fund && fund.status === 'OPEN';

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Monthly Fund Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage allocations, carry-forwards, and month-end reconciliations
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Company Picker */}
          {companies.length > 1 && (
            <div className="w-36">
              <Select
                value={selectedCompanyId}
                onChange={e => setSelectedCompanyId(e.target.value)}
                className="text-xs h-8 font-semibold"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
          )}

          {/* Month Picker */}
          <div className="w-32">
            <Select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="text-xs h-8 font-semibold"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </Select>
          </div>

          {/* Year Picker */}
          <div className="w-24">
            <Select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="text-xs h-8 font-semibold"
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>

          {/* Export Monthly Book Button */}
          {canExportBook && fund && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportMonthlyBook}
              disabled={exportingBook}
              className="gap-1.5 h-8"
              title="Download official Monthly Petty Cash Book Excel with logos"
            >
              {exportingBook ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="hidden md:inline">Download</span> Monthly Book
            </Button>
          )}

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={fetchFund}
            title="Refresh"
            aria-label="Refresh fund"
          >
            <RefreshCw className={`h-4 w-4 ${loadingFund ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <Alert variant="success" className="py-2.5">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {loadingFund && (
        <div className="flex items-center justify-center h-48 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Loading fund summary...</span>
        </div>
      )}

      {/* Fund Error */}
      {!loadingFund && fundError && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{fundError}</AlertDescription>
        </Alert>
      )}

      {/* Case 1: No Fund - Initialize Form */}
      {!loadingFund && !fundError && !fund && selectedCompanyId && (
        <Card className="max-w-md mx-auto shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Initialize Fund</CardTitle>
                <CardDescription className="text-xs">{selectedCompany?.name} · {MONTHS[selectedMonth - 1]} {selectedYear}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {prevFund && Number(prevFund.remainingBalance || 0) > 0 && (
              <Alert variant="warning" className="py-2.5 text-xs">
                <ArrowUpRight className="h-4 w-4" />
                <div>
                  <p className="font-bold">Previous Month Rollover Detected</p>
                  <p className="mt-0.5 text-[11px]">
                    {MONTHS[prevMonth - 1]} {prevYear} has a remaining balance of <strong className="font-mono font-bold">${fmt(Number(prevFund.remainingBalance))}</strong>. It is prefilled below as your Opening Balance (Carry-Forward).
                  </p>
                </div>
              </Alert>
            )}

            <form onSubmit={handleInitFund} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Opening Balance / Carry-Forward ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Monthly Allocation ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={additionalFunding}
                  onChange={e => setAdditionalFunding(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-[11px] text-muted-foreground">New fund allocation assigned for this month</p>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border flex justify-between items-center text-xs">
                <span className="font-medium text-muted-foreground">Total Starting Available:</span>
                <span className="font-mono font-bold text-sm text-primary">
                  ${fmt((parseFloat(openingBalance) || 0) + (parseFloat(additionalFunding) || 0))}
                </span>
              </div>

              <Button
                type="submit"
                variant="gold"
                size="sm"
                isLoading={submitting}
                disabled={submitting || (!openingBalance && !additionalFunding)}
                className="w-full gap-2 shadow-sm"
              >
                <PlusCircle className="h-4 w-4" />
                Initialize Fund
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Case 2: Fund Exists */}
      {!loadingFund && !fundError && fund && (
        <div className="space-y-6">
          {/* 4 Compact Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Opening Balance', value: fund.openingBalance, icon: DollarSign },
              { label: 'Total Available', value: fund.totalAvailable, icon: TrendingUp },
              { label: 'Total Paid Out', value: fund.approvedAmount, icon: ArrowUpRight },
              { label: 'Remaining Balance', value: fund.remainingBalance, icon: Wallet },
            ].map(stat => (
              <Card key={stat.label} className="shadow-xs border border-border/80 bg-card">
                <CardContent className="p-4 flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-muted/60 dark:bg-muted/40 border border-border/50 flex items-center justify-center flex-shrink-0">
                    <stat.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-lg font-bold text-foreground leading-tight tracking-tight mt-0.5">${fmt(Number(stat.value))}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Top-Up Action Bar (only if open) */}
          {isFundOpen && (
            <Card className="shadow-xs border border-border/80 bg-card">
              <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <form onSubmit={handleTopUp} className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <Label>Top-Up Amount ($)</Label>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={topUpAmount}
                      onChange={e => setTopUpAmount(e.target.value)}
                      required
                      placeholder="Enter amount"
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    disabled={submitting || !topUpAmount}
                    isLoading={submitting}
                    className="sm:self-end h-8 gap-1.5 shadow-sm"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Add Funds
                  </Button>
                </form>

                {/* Close Month Button */}
                <div className="border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4 flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCloseModal(true)}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8"
                  >
                    Close Month
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Close Month Confirmation Dialog */}
          <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
            <DialogContent onClose={() => setShowCloseModal(false)} className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Close Month: {MONTHS[selectedMonth - 1]} {selectedYear}?</DialogTitle>
                <DialogDescription>
                  Closing this fund will lock {MONTHS[selectedMonth - 1]} {selectedYear}. The remaining balance of <strong className="font-bold">${fmt(Number(fund.remainingBalance))}</strong> will automatically roll over as the Opening Balance for the next month.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
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

          {/* Fund Breakdown Table */}
          <Card className="overflow-hidden shadow-xs">
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Fund Summary
              </CardTitle>
              <Badge variant={isFundOpen ? 'success' : 'secondary'} size="sm">
                {fund.status}
              </Badge>
            </CardHeader>
            <Table>
              <TableBody>
                {[
                  { label: 'Opening Balance (Carry-Forward)', value: fund.openingBalance, type: 'credit' },
                  { label: 'Monthly Allocation / Top-Up', value: fund.additionalFunding, type: 'credit' },
                  { label: 'Total Available', value: fund.totalAvailable, type: 'total' },
                  { label: 'Approved Requests', value: fund.approvedAmount, type: 'debit' },
                  { label: 'Payments Made', value: fund.paidAmount, type: 'debit' },
                  { label: 'Remaining Balance', value: fund.remainingBalance, type: 'balance' },
                ].map((row) => (
                  <TableRow key={row.label} className={row.type === 'total' || row.type === 'balance' ? 'bg-muted/40 font-bold' : ''}>
                    <TableCell className="px-4 py-2.5 text-xs text-muted-foreground">{row.label}</TableCell>
                    <TableCell className={`px-4 py-2.5 text-right font-mono font-semibold text-xs ${
                      row.type === 'debit' ? 'text-destructive' :
                      row.type === 'balance' ? 'text-primary font-bold' :
                      row.type === 'total' ? 'text-primary' :
                      'text-foreground'
                    }`}>
                      {row.type === 'debit' ? '-' : ''}${fmt(Number(row.value))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FundManagementPage;
