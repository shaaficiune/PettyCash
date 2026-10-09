import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Download, ShieldCheck, XCircle, Coins, CheckSquare,
  RefreshCw, User, Building2, MapPin, Tag, Calendar, FileText,
  Paperclip, CheckCircle2, AlertCircle, CircleDollarSign,
  Banknote, Edit3, Send, ReceiptText, ClipboardCheck, Loader2,
} from 'lucide-react';

// ─── Status helpers ────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
  DRAFT: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', darkBg: 'dark:bg-slate-800', darkText: 'dark:text-slate-300', darkBorder: 'dark:border-slate-700' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', darkBg: 'dark:bg-amber-950/40', darkText: 'dark:text-amber-300', darkBorder: 'dark:border-amber-800/40' },
  ACCOUNTANT_REVIEW: { label: 'Accountant Review', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200', darkBg: 'dark:bg-sky-950/40', darkText: 'dark:text-sky-300', darkBorder: 'dark:border-sky-800/40' },
  CORRECTION_REQUIRED: { label: 'Correction Required', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', darkBg: 'dark:bg-orange-950/40', darkText: 'dark:text-orange-300', darkBorder: 'dark:border-orange-800/40' },
  REJECTED: { label: 'Rejected', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', darkBg: 'dark:bg-rose-950/40', darkText: 'dark:text-rose-300', darkBorder: 'dark:border-rose-800/40' },
  APPROVED: { label: 'Approved', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', darkBg: 'dark:bg-teal-950/40', darkText: 'dark:text-teal-300', darkBorder: 'dark:border-teal-800/40' },
  PAID: { label: 'Paid', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', darkBg: 'dark:bg-blue-950/40', darkText: 'dark:text-blue-300', darkBorder: 'dark:border-blue-800/40' },
  COMPLETED: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', darkBg: 'dark:bg-emerald-950/40', darkText: 'dark:text-emerald-300', darkBorder: 'dark:border-emerald-800/40' },
};

const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const m = STATUS_META[status] || STATUS_META.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border
      ${size === 'md' ? 'text-xs px-3 py-1' : 'text-[10px] px-2 py-0.5'}
      ${m.bg} ${m.color} ${m.border} ${m.darkBg} ${m.darkText} ${m.darkBorder}`}>
      {m.label}
    </span>
  );
};

// ─── Timeline ────────────────────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: 'DRAFT', label: 'Draft', icon: Edit3 },
  { key: 'PENDING_APPROVAL', label: 'Submitted', icon: Send },
  { key: 'ACCOUNTANT_REVIEW', label: 'Accountant Review', icon: ClipboardCheck },
  { key: 'APPROVED', label: 'Approved', icon: ShieldCheck },
  { key: 'PAID', label: 'Paid', icon: Banknote },
  { key: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
];

const STEP_ORDER: Record<string, number> = {
  DRAFT: 0, PENDING_APPROVAL: 1, ACCOUNTANT_REVIEW: 2,
  APPROVED: 3, PAID: 4, COMPLETED: 5,
  CORRECTION_REQUIRED: 1.5, REJECTED: 1.5,
};

const RequestTimeline: React.FC<{ status: string }> = ({ status }) => {
  const currentIdx = STEP_ORDER[status] ?? 0;
  const isRejected = status === 'REJECTED';
  const isCorrection = status === 'CORRECTION_REQUIRED';

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex items-center min-w-[520px]">
        {TIMELINE_STEPS.map((step, i) => {
          const stepIdx = STEP_ORDER[step.key];
          const isDone = currentIdx > stepIdx;
          const isCurrent = Math.floor(currentIdx) === stepIdx || (isCorrection && i === 1) || (isRejected && i === 1);
          const isLast = i === TIMELINE_STEPS.length - 1;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all
                  ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                    isCurrent && isRejected ? 'bg-rose-500 border-rose-500 text-white' :
                      isCurrent && isCorrection ? 'bg-orange-500 border-orange-500 text-white' :
                        isCurrent ? 'bg-primary border-primary text-white shadow-md shadow-primary/30' :
                          'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wide whitespace-nowrap
                  ${isDone ? 'text-emerald-600 dark:text-emerald-400' :
                    isCurrent && isRejected ? 'text-rose-600' :
                      isCurrent && isCorrection ? 'text-orange-600' :
                        isCurrent ? 'text-primary' : 'text-slate-400'}`}>
                  {isCurrent && isRejected ? 'Rejected' : isCurrent && isCorrection ? 'Correction' : step.label}
                </span>
              </div>
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full ${isDone ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ─── Info Field ────────────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; icon?: React.ElementType; children: React.ReactNode; fullWidth?: boolean }> = ({
  label, icon: Icon, children, fullWidth,
}) => (
  <div className={fullWidth ? 'col-span-2' : ''}>
    <div className="flex items-center gap-1.5 mb-1">
      {Icon && <Icon className="h-3 w-3 text-slate-400" />}
      <span className="text-[10px] uppercase font-bold tracking-wide text-slate-400">{label}</span>
    </div>
    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{children}</div>
  </div>
);

// ─── Amount Pill ───────────────────────────────────────────────────────────────
const AmountPill: React.FC<{ label: string; amount: number | null; currency: string; variant?: 'default' | 'green' | 'amber' }> = ({
  label, amount, currency, variant = 'default',
}) => {
  const cls = variant === 'green'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/40 dark:text-emerald-300'
    : variant === 'amber'
      ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800/40 dark:text-amber-300'
      : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300';
  return (
    <div className={`rounded-xl border px-4 py-3 ${cls}`}>
      <p className="text-[10px] uppercase font-bold opacity-70 mb-0.5">{label}</p>
      <p className="text-xl font-bold tracking-tight">
        {amount !== null && amount !== undefined
          ? `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : <span className="text-sm font-medium opacity-60">Pending</span>}
      </p>
    </div>
  );
};

// ─── Section Card ─────────────────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm transition-colors ${className}`}>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export const RequestDetailPage: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Action states
  const [actionComments, setActionComments] = useState('');
  const [approvedAmountOverride, setApprovedAmountOverride] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EDAHAB');
  const [transactionId, setTransactionId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [actualSpent, setActualSpent] = useState('');
  const [remainingBalance, setRemainingBalance] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');

  const openAttachment = async (event: React.MouseEvent<HTMLAnchorElement>, attachment: any) => {
    event.preventDefault();
    const previewWindow = window.open('about:blank', '_blank');
    if (!previewWindow) { alert('Please allow popups to view this attachment.'); return; }
    try {
      const response = await api.get(`/attachments/${attachment.id}/file`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      previewWindow.location.href = url;
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch {
      previewWindow.close();
      alert('The attachment could not be opened.');
    }
  };

  const loadRequestDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/requests/${id}`);
      setRequest(res.data);
      setApprovedAmountOverride((res.data.approvedAmount || res.data.requestedAmount).toString());
      const spent = parseFloat(actualSpent || '0');
      const diff = Number(res.data.approvedAmount || res.data.requestedAmount) - spent;
      setRemainingBalance(diff.toFixed(2));
    } catch {
      setError('Request details could not be found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequestDetails(); }, [id]);

  useEffect(() => {
    if (request) {
      const approved = Number(request.approvedAmount || request.requestedAmount);
      const spent = parseFloat(actualSpent || '0');
      setRemainingBalance((approved - spent).toFixed(2));
    }
  }, [actualSpent, request]);

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );

  if (error || !request) return (
    <div className="p-8 text-center space-y-3">
      <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
      <p className="text-sm font-semibold text-rose-500">{error || 'An error occurred'}</p>
      <Link to="/requests" className="text-primary hover:underline text-xs font-semibold">← Back to Requests</Link>
    </div>
  );

  const isEmployee = user?.role === 'EMPLOYEE';
  const isAccountant = user?.role === 'ACCOUNTANT' || user?.role === 'SUPER_ADMIN';
  // True when an Accountant is viewing a request they personally submitted.
  // They cannot approve their own request — only a SUPER_ADMIN (CFO) can.
  const isOwnRequest = user?.role === 'ACCOUNTANT' && request?.userId === user?.id;
  const canEdit = (isEmployee || isOwnRequest) && (request.status === 'DRAFT' || request.status === 'CORRECTION_REQUIRED');


  const withLoading = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    setError(null);
    try { await fn(); } catch (err: any) {
      setError(err.response?.data?.message || 'Action failed');
    } finally { setActionLoading(false); }
  };

  const handleReview = (status: 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUIRED' | 'ACCOUNTANT_REVIEW') =>
    withLoading(async () => {
      if (status === 'APPROVED' || status === 'ACCOUNTANT_REVIEW') {
        const parsed = parseFloat(approvedAmountOverride);
        if (isNaN(parsed) || parsed <= 0) { setError('Approved amount must be greater than zero'); return; }
        if (parsed > 50) { setError('Approved amount cannot exceed the maximum petty cash limit of $50.'); return; }
      }
      await api.post(`/requests/${request?.id || id}/review`, {
        status, comments: actionComments,
        approvedAmount: (status === 'APPROVED' || status === 'ACCOUNTANT_REVIEW') ? parseFloat(approvedAmountOverride) : undefined,
      });
      setActionComments('');
      await loadRequestDetails();
    });

  const handleRecordPayment = () =>
    withLoading(async () => {
      await api.post('/payments', {
        requestId: request.id,
        amountPaid: Number(request.approvedAmount || request.requestedAmount),
        paymentMethod,
        transactionId: transactionId || undefined,
        referenceNumber: referenceNumber || undefined,
        notes: paymentNotes,
      });
      await loadRequestDetails();
    });

  const handleSubmitSettlement = () =>
    withLoading(async () => {
      if (!actualSpent) { setError('Actual spent amount is required'); return; }
      await api.post('/settlements', {
        requestId: request.id,
        actualExpenseAmount: parseFloat(actualSpent),
        remainingBalance: parseFloat(remainingBalance),
        notes: settlementNotes,
      });
      await loadRequestDetails();
    });

  const handleSettlementReview = (settlementId: string, status: 'APPROVED' | 'REJECTED') =>
    withLoading(async () => {
      await api.post(`/settlements/${settlementId}/review`, { status });
      await loadRequestDetails();
    });

  return (
    <div className="max-w-5xl mx-auto space-y-5 font-sans pb-10">

      {/* ── Top Nav ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Requests
        </button>
        {canEdit && (
          <Link
            to={`/requests/edit/${request.requestNumber || request.id}`}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm shadow-amber-500/20 transition-all"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit Request
          </Link>
        )}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 rounded-xl text-xs text-rose-700 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Hero Header Card ── */}
      <Card>
        {/* Colored top stripe based on status */}
        <div className={`h-1 rounded-t-2xl ${request.status === 'COMPLETED' ? 'bg-emerald-500' :
          request.status === 'PAID' ? 'bg-blue-500' :
            request.status === 'APPROVED' ? 'bg-teal-500' :
              request.status === 'REJECTED' ? 'bg-rose-500' :
                request.status === 'CORRECTION_REQUIRED' ? 'bg-orange-500' :
                  request.status === 'ACCOUNTANT_REVIEW' ? 'bg-sky-500' :
                    request.status === 'PENDING_APPROVAL' ? 'bg-amber-500' :
                      'bg-slate-400'
          }`} />

        <div className="p-6 space-y-5">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Request #{request.requestNumber}
                </h1>
                <StatusBadge status={request.status} />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                Submitted {new Date(request.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Amount pills */}
            <div className="flex gap-3 flex-wrap">
              <AmountPill
                label="Requested"
                amount={request.requestedAmount}
                currency={request.currency}
                variant="amber"
              />
              <AmountPill
                label="Approved"
                amount={request.approvedAmount}
                currency={request.currency}
                variant="green"
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="pt-1">
            <RequestTimeline status={request.status} />
          </div>
        </div>
      </Card>

      {/* ── Main Info Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left column: Request Info */}
        <Card className="p-5 space-y-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            Request Information
          </h3>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Employee" icon={User}>
              <p className="font-bold">{request.user?.fullName}</p>
              <p className="text-xs text-slate-400 font-normal mt-0.5">
                Emp #{request.user?.employeeNumber}
              </p>
            </Field>

            <Field label="Company" icon={Building2}>
              <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${request.company?.name === 'Somtel'
                ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                }`}>
                {request.company?.name}
              </span>
            </Field>

            <Field label="Region" icon={MapPin}>
              {request.region
                ? <span className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{request.region.name}</span>
                : <span className="text-slate-400 text-xs">—</span>}
            </Field>

            <Field label="Budget Head" icon={Tag}>
              {request.budgetHead
                ? <span className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">{request.budgetHead.code} – {request.budgetHead.name}</span>
                : <span className="text-slate-400 text-xs">—</span>}
            </Field>

            <Field label="Required Date" icon={Calendar}>
              <span className="text-sm">{new Date(request.requiredDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </Field>

            <Field label="Cost Center" icon={CircleDollarSign}>
              <span className="text-sm">{request.costCenter || request.region?.name || <span className="text-slate-400">—</span>}</span>
            </Field>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
            <Field label="Purpose" icon={ClipboardCheck} fullWidth>
              <p className="font-semibold">{request.purpose}</p>
            </Field>
            {request.description && (
              <Field label="Detailed Description" icon={FileText} fullWidth>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line font-normal">{request.description}</p>
              </Field>
            )}
          </div>

          {/* Correction notes */}
          {request.correctionNotes && (
            <div className="flex items-start gap-3 p-3.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/40 rounded-xl text-xs">
              <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-orange-700 dark:text-orange-400 block mb-0.5">Correction Notes</span>
                <p className="text-slate-600 dark:text-slate-300">{request.correctionNotes}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Right column: Recipient + Attachments */}
        <div className="space-y-5">

          {/* Recipient Card */}
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Recipient Details
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Full Name</p>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {request.receiverName || <span className="text-slate-400 font-normal text-xs">Not specified</span>}
                </p>
              </div>
              {request.receiverPhone && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Phone / Account</p>
                  <p className="font-bold font-mono text-slate-800 dark:text-slate-100 text-sm">{request.receiverPhone}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Attachments Card */}
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5" />
              Attachments
              {request.attachments?.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {request.attachments.length}
                </span>
              )}
            </h3>
            {!request.attachments?.length ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Paperclip className="h-8 w-8 text-slate-200 dark:text-slate-700 mb-2" />
                <p className="text-xs text-slate-400">No attachments uploaded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {request.attachments.map((att: any) => (
                  <a
                    key={att.id}
                    href="#"
                    onClick={(e) => void openAttachment(e, att)}
                    className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-primary/5 dark:hover:bg-primary/10 border border-slate-200 dark:border-slate-700 hover:border-primary/30 rounded-xl text-xs transition-all group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span className="flex-1 truncate font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                      {att.fileName}
                    </span>
                    <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary flex-shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── APPROVAL DRAWER ── */}
      {isAccountant && !isOwnRequest && (request.status === 'PENDING_APPROVAL' || request.status === 'ACCOUNTANT_REVIEW') && (
        <Card className="overflow-hidden">
          <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between
            ${request.status === 'PENDING_APPROVAL' ? 'bg-amber-50/60 dark:bg-amber-950/10' : 'bg-sky-50/60 dark:bg-sky-950/10'}`}>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {request.status === 'PENDING_APPROVAL' ? '📋 Stage 1: Accountant Review' : '🏦 Stage 2: CFO Final Approval'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {request.status === 'PENDING_APPROVAL' ? 'Review and forward to Finance / CFO for final approval' : 'Issue final approval to release funds for disbursement'}
              </p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${request.status === 'PENDING_APPROVAL'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
              }`}>
              {request.status === 'PENDING_APPROVAL' ? 'Awaiting Accountant' : 'Awaiting CFO'}
            </span>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-500">Approved Amount</label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    Max: $50.00
                  </span>
                </div>
                <input
                  type="number" step="0.01" min="0.01" max="50"
                  value={approvedAmountOverride}
                  onChange={(e) => setApprovedAmountOverride(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${parseFloat(approvedAmountOverride) > 50
                    ? 'border-rose-400 ring-1 ring-rose-400 text-rose-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white'
                    }`}
                />
                {parseFloat(approvedAmountOverride) > 50 && (
                  <p className="text-[11px] text-rose-600 mt-1">Amount cannot exceed the $50.00 limit.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Review Comments</label>
                <input
                  type="text"
                  placeholder="Notes or justification..."
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleReview('CORRECTION_REQUIRED')}
                disabled={actionLoading}
                className="px-4 py-2 border border-orange-200 dark:border-orange-900/50 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Request Correction
              </button>
              <button
                onClick={() => handleReview('REJECTED')}
                disabled={actionLoading}
                className="px-4 py-2 border border-rose-200 dark:border-rose-900/50 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
              <button
                onClick={() => handleReview(request.status === 'PENDING_APPROVAL' ? 'ACCOUNTANT_REVIEW' : 'APPROVED')}
                disabled={actionLoading}
                className="px-5 py-2 bg-[#E8A020] hover:bg-[#D4911A] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-60"
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {request.status === 'PENDING_APPROVAL' ? 'Approve → Forward to CFO' : 'Final Approve (Ready for Payment)'}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Self-submitted notice for Accountant */}
      {isOwnRequest && (request.status === 'PENDING_APPROVAL' || request.status === 'ACCOUNTANT_REVIEW') && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 bg-sky-50/60 dark:bg-sky-950/10 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-sky-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Awaiting CFO Approval</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                You submitted this request. To prevent a conflict of interest, you cannot approve your own request.
                A CFO must review and approve it. You will be notified once a decision is made.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── RECORD PAYMENT DRAWER ── */}
      {isAccountant && request.status === 'APPROVED' && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-600" /> Record Disbursement
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Disburse approved funds to the recipient</p>
            </div>
            <span className="text-sm font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-1.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
              {request.currency} {Number(request.approvedAmount || request.requestedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-6 space-y-5">
            {/* Recipient info */}
            <div className="p-4 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block mb-0.5">Recipient Name</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{request.receiverName || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block mb-0.5">Account / Phone</span>
                <p className="font-bold font-mono text-slate-900 dark:text-white text-sm">{request.receiverPhone || 'Not specified'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  <option value="EDAHAB">eDahab</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Transaction ID</label>
                <input type="text" placeholder="TXN-998822" value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Invoice Number</label>
                <input type="text" placeholder="INV-0012" value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Disbursement Notes</label>
              <input type="text" placeholder="Payment voucher or disbursement note" value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleRecordPayment}
                disabled={actionLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-500/15 transition-all cursor-pointer disabled:opacity-60"
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Coins className="h-3.5 w-3.5" />}
                Record Payment
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── SETTLEMENT DRAWER ── */}
      {isEmployee && request.status === 'PAID' && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-blue-50/60 dark:bg-blue-950/10">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-blue-600" /> Expense Settlement
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Reconcile actual expenses against the disbursed funds</p>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Actual Spent Amount</label>
                <input type="number" placeholder="0.00" step="0.01" value={actualSpent}
                  onChange={(e) => setActualSpent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Remaining Balance</label>
                <input type="text" disabled value={`${request.currency} ${remainingBalance}`}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl text-sm" />
              </div>
              <div className="pb-2">
                <span className={`text-xs font-semibold ${parseFloat(remainingBalance) > 0 ? 'text-amber-600' :
                  parseFloat(remainingBalance) < 0 ? 'text-rose-500' : 'text-emerald-600'
                  }`}>
                  {parseFloat(remainingBalance) > 0 ? '↩ Refund due to company' :
                    parseFloat(remainingBalance) < 0 ? '↗ Reimbursement requested' :
                      '✓ Fully reconciled'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Settlement Notes</label>
              <input type="text" placeholder="Justification for any difference..." value={settlementNotes}
                onChange={(e) => setSettlementNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleSubmitSettlement}
                disabled={actionLoading}
                className="px-5 py-2 bg-[#E8A020] hover:bg-[#D4911A] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckSquare className="h-3.5 w-3.5" />}
                Submit Settlement
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── PAYMENT HISTORY ── */}
      {request.payments?.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-500" /> Payment History
            </h3>
            <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200/60">
              {request.payments.length} record{request.payments.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="p-5 space-y-3">
            {request.payments.map((pm: any) => (
              <div key={pm.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 font-bold rounded-lg bg-primary/10 text-primary text-[11px]">
                      {pm.paymentMethod}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(pm.paymentDate || pm.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Amount Paid</p>
                    <p className="font-black text-lg text-emerald-600 dark:text-emerald-400 leading-tight">
                      {request.currency} {Number(pm.amountPaid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-400">by {pm.paidBy?.fullName || 'Finance'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/50 dark:border-slate-700/40">
                  <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Recipient</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-xs mt-0.5">{request.receiverName || '—'}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Account / Phone</span>
                    <p className="font-semibold font-mono text-slate-800 dark:text-slate-100 text-xs mt-0.5">{request.receiverPhone || '—'}</p>
                  </div>
                </div>
                {(pm.transactionId || pm.referenceNumber || pm.notes) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1 border-t border-slate-200/40 dark:border-slate-800">
                    {pm.transactionId && <span>Txn: <strong className="text-slate-700 dark:text-slate-300 font-mono">{pm.transactionId}</strong></span>}
                    {pm.referenceNumber && <span>Invoice #: <strong className="text-slate-700 dark:text-slate-300 font-mono">{pm.referenceNumber}</strong></span>}
                    {pm.notes && <span className="italic text-slate-400">"{pm.notes}"</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── SETTLEMENT HISTORY ── */}
      {request.settlements?.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-blue-500" /> Expense Settlement & Audit
            </h3>
          </div>
          <div className="p-5 space-y-3">
            {request.settlements.map((st: any) => (
              <div key={st.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Actual Spent</p>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100">
                      {request.currency} {Number(st.actualExpenseAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Remaining: {request.currency} {Number(st.remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${st.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40' :
                    st.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40' :
                      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40'
                    }`}>
                    {st.status}
                  </span>
                </div>
                {st.notes && (
                  <div className="p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 text-xs text-slate-500 leading-snug">
                    <span className="font-bold text-slate-600 dark:text-slate-400 block mb-0.5">Employee Notes</span>
                    "{st.notes}"
                  </div>
                )}
                {isAccountant && st.status === 'PENDING' && (
                  <div className="flex gap-2 justify-end pt-2 border-t border-slate-200/50 dark:border-slate-800/40">
                    <button
                      onClick={() => handleSettlementReview(st.id, 'REJECTED')}
                      disabled={actionLoading}
                      className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl cursor-pointer transition-colors disabled:opacity-60"
                    >
                      Reject Settlement
                    </button>
                    <button
                      onClick={() => handleSettlementReview(st.id, 'APPROVED')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
                    >
                      {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Approve & Close
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
