import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Download, ShieldCheck, XCircle, Coins, CheckSquare,
  RefreshCw, User, Building2, MapPin, Tag, Calendar, FileText,
  Paperclip, CheckCircle2, AlertCircle, CircleDollarSign,
  Banknote, Edit3, Send, ReceiptText, ClipboardCheck, Loader2,
  Printer,
} from 'lucide-react';
import { PaymentVoucherModal } from '../components/PaymentVoucherModal';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Select,
  Label,
  Badge,
  Alert,
  AlertDescription,
  Separator,
  StatusBadge,
} from '../components/ui';

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
                  ${isDone ? 'bg-primary border-primary text-primary-foreground' :
                    isCurrent && isRejected ? 'bg-destructive border-destructive text-destructive-foreground' :
                      isCurrent && isCorrection ? 'bg-amber-500 border-amber-500 text-white' :
                        isCurrent ? 'bg-primary border-primary text-primary-foreground' :
                          'bg-background border-border text-muted-foreground'}`}>
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wide whitespace-nowrap
                  ${isDone ? 'text-primary' :
                    isCurrent && isRejected ? 'text-destructive' :
                      isCurrent && isCorrection ? 'text-amber-600 dark:text-amber-400' :
                        isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                  {isCurrent && isRejected ? 'Rejected' : isCurrent && isCorrection ? 'Correction' : step.label}
                </span>
              </div>
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full ${isDone ? 'bg-primary' : 'bg-muted'}`} />
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
      {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
      <span className="text-[10px] uppercase font-bold tracking-wide text-muted-foreground">{label}</span>
    </div>
    <div className="text-sm font-medium text-foreground">{children}</div>
  </div>
);

const AmountPill: React.FC<{ label: string; amount: number | null; currency: string; variant?: 'default' | 'green' | 'amber' }> = ({
  label, amount, currency,
}) => {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 min-w-[130px]">
      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">{label}</p>
      <p className="text-xl font-bold tracking-tight text-foreground">
        {amount !== null && amount !== undefined
          ? `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : <span className="text-sm font-medium text-muted-foreground">Pending</span>}
      </p>
    </div>
  );
};

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
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [selectedPaymentForVoucher, setSelectedPaymentForVoucher] = useState<any>(null);

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
      <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
      <p className="text-sm font-semibold text-destructive">{error || 'An error occurred'}</p>
      <Link to="/requests" className="text-primary hover:underline text-xs font-semibold">← Back to Requests</Link>
    </div>
  );

  const isEmployee = user?.role === 'EMPLOYEE';
  const isAccountant = user?.role === 'ACCOUNTANT' || user?.role === 'SUPER_ADMIN';
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Requests
        </Button>
        <div className="flex items-center gap-2">
          {(request.status === 'PAID' || request.status === 'COMPLETED') && (
            <Button
              id="btn-print-voucher-top"
              variant="success"
              size="sm"
              onClick={() => {
                setSelectedPaymentForVoucher(null);
                setIsVoucherOpen(true);
              }}
              className="gap-1.5 shadow-sm"
              title="Print Historical Payment Voucher"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Payment Voucher</span>
            </Button>
          )}
          {canEdit && (
            <Link to={`/requests/edit/${request.requestNumber || request.id}`}>
              <Button
                variant="gold"
                size="sm"
                className="gap-1.5 shadow-sm"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Request
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Hero Header Card ── */}
      <Card className="overflow-hidden shadow-xs border border-border/80 bg-card">
        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-foreground tracking-tight">
                  Request #{request.requestNumber}
                </h1>
                <StatusBadge status={request.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
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
          <div className="pt-2">
            <RequestTimeline status={request.status} />
          </div>
        </CardContent>
      </Card>

      {/* ── Main Info Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left column: Request Info */}
        <Card className="p-5 sm:p-6 space-y-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            Request Information
          </h3>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Employee" icon={User}>
              <p className="font-bold">{request.user?.fullName}</p>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Emp #{request.user?.employeeNumber}
              </p>
            </Field>

            <Field label="Company" icon={Building2}>
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {request.company?.name || 'N/A'}
              </span>
            </Field>

            <Field label="Region" icon={MapPin}>
              {request.region
                ? <Badge variant="secondary" size="sm">{request.region.name}</Badge>
                : <span className="text-muted-foreground text-xs">—</span>}
            </Field>

            <Field label="Budget Head" icon={Tag}>
              {request.budgetHead
                ? <Badge variant="outline" size="sm">{request.budgetHead.code} – {request.budgetHead.name}</Badge>
                : <span className="text-muted-foreground text-xs">—</span>}
            </Field>

            <Field label="Required Date" icon={Calendar}>
              <span className="text-sm">{new Date(request.requiredDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </Field>

            <Field label="Cost Center" icon={CircleDollarSign}>
              <span className="text-sm">{request.costCenter || request.region?.name || <span className="text-muted-foreground">—</span>}</span>
            </Field>
          </div>

          <Separator />

          <div className="space-y-3">
            <Field label="Purpose" icon={ClipboardCheck} fullWidth>
              <p className="font-semibold">{request.purpose}</p>
            </Field>
            {request.description && (
              <Field label="Detailed Description" icon={FileText} fullWidth>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line font-normal">{request.description}</p>
              </Field>
            )}
          </div>

          {/* Correction notes */}
          {request.correctionNotes && (
            <Alert variant="warning" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <div>
                <span className="font-bold block mb-0.5">Correction Notes</span>
                <p className="text-xs">{request.correctionNotes}</p>
              </div>
            </Alert>
          )}
        </Card>

        {/* Right column: Recipient + Attachments */}
        <div className="space-y-5">

          {/* Recipient Card */}
          <Card className="p-5 sm:p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Recipient Details
            </h3>
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Full Name</p>
                <p className="font-bold text-foreground text-sm">
                  {request.receiverName || <span className="text-muted-foreground font-normal text-xs">Not specified</span>}
                </p>
              </div>
              {request.receiverPhone && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Phone / Account</p>
                  <p className="font-bold font-mono text-foreground text-sm">{request.receiverPhone}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Attachments Card */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5" />
                Attachments
              </h3>
              {request.attachments?.length > 0 && (
                <Badge variant="secondary" size="sm">
                  {request.attachments.length}
                </Badge>
              )}
            </div>
            {!request.attachments?.length ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Paperclip className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No attachments uploaded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {request.attachments.map((att: any) => (
                  <a
                    key={att.id}
                    href="#"
                    onClick={(e) => void openAttachment(e, att)}
                    className="flex items-center gap-3 p-2.5 bg-muted/30 hover:bg-muted border border-border rounded-xl text-xs transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span className="flex-1 truncate font-medium text-foreground group-hover:text-primary transition-colors">
                      {att.fileName}
                    </span>
                    <Download className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── APPROVAL DRAWER ── */}
      {isAccountant && !isOwnRequest && (request.status === 'PENDING_APPROVAL' || request.status === 'ACCOUNTANT_REVIEW') && (
        <Card className="overflow-hidden border border-border/80">
          <CardHeader className="border-b border-border flex flex-row items-center justify-between bg-muted/30">
            <div>
              <CardTitle className="text-sm font-bold">
                {request.status === 'PENDING_APPROVAL' ? 'Stage 1: Accountant Review' : 'Stage 2: CFO Final Approval'}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {request.status === 'PENDING_APPROVAL' ? 'Review and forward to Finance / CFO for final approval' : 'Issue final approval to release funds for disbursement'}
              </CardDescription>
            </div>
            <Badge variant={request.status === 'PENDING_APPROVAL' ? 'warning' : 'info'} size="default">
              {request.status === 'PENDING_APPROVAL' ? 'Awaiting Accountant' : 'Awaiting CFO'}
            </Badge>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label>Approved Amount</Label>
                  <Badge variant="warning" size="sm">Max: $50.00</Badge>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="50"
                  value={approvedAmountOverride}
                  error={parseFloat(approvedAmountOverride) > 50}
                  onChange={(e) => setApprovedAmountOverride(e.target.value)}
                />
                {parseFloat(approvedAmountOverride) > 50 && (
                  <p className="text-[11px] text-destructive mt-1 font-medium">Amount cannot exceed the $50.00 limit.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Review Comments</Label>
                <Input
                  type="text"
                  placeholder="Notes or justification..."
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReview('CORRECTION_REQUIRED')}
                disabled={actionLoading}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Request Correction
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleReview('REJECTED')}
                disabled={actionLoading}
                className="gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={() => handleReview(request.status === 'PENDING_APPROVAL' ? 'ACCOUNTANT_REVIEW' : 'APPROVED')}
                disabled={actionLoading}
                isLoading={actionLoading}
                className="gap-1.5 shadow-sm"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {request.status === 'PENDING_APPROVAL' ? 'Approve → Forward to CFO' : 'Final Approve (Ready for Payment)'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Self-submitted notice for Accountant */}
      {isOwnRequest && (request.status === 'PENDING_APPROVAL' || request.status === 'ACCOUNTANT_REVIEW') && (
        <Card className="overflow-hidden border border-border/80">
          <CardContent className="p-5 flex items-start gap-3 bg-muted/20">
            <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Awaiting CFO Approval</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You submitted this request. To prevent a conflict of interest, you cannot approve your own request.
                A CFO must review and approve it. You will be notified once a decision is made.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── RECORD PAYMENT DRAWER ── */}
      {isAccountant && request.status === 'APPROVED' && (
        <Card className="overflow-hidden border border-border/80">
          <CardHeader className="border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Banknote className="h-4 w-4 text-primary" /> Record Disbursement
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">Disburse approved funds to the recipient</CardDescription>
            </div>
            <Badge variant="success" size="default">
              {request.currency} {Number(request.approvedAmount || request.requestedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Badge>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="p-4 bg-muted/40 border border-border/80 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Recipient Name</span>
                <p className="font-bold text-foreground text-sm">{request.receiverName || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Account / Phone</span>
                <p className="font-bold font-mono text-foreground text-sm">{request.receiverPhone || 'Not specified'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="EDAHAB">eDahab</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Transaction ID</Label>
                <Input
                  type="text"
                  placeholder="TXN-998822"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Invoice Number</Label>
                <Input
                  type="text"
                  placeholder="INV-0012"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Disbursement Notes</Label>
              <Input
                type="text"
                placeholder="Payment voucher or disbursement note"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button
                variant="success"
                size="sm"
                onClick={handleRecordPayment}
                disabled={actionLoading}
                isLoading={actionLoading}
                className="gap-2 shadow-sm"
              >
                <Coins className="h-3.5 w-3.5" />
                Record Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── SETTLEMENT DRAWER ── */}
      {isEmployee && request.status === 'PAID' && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-primary" /> Expense Settlement
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">Reconcile actual expenses against the disbursed funds</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <Label>Actual Spent Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={actualSpent}
                  onChange={(e) => setActualSpent(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Remaining Balance</Label>
                <Input
                  type="text"
                  disabled
                  value={`${request.currency} ${remainingBalance}`}
                  className="bg-muted text-muted-foreground"
                />
              </div>
              <div className="pb-2">
                <span className={`text-xs font-semibold ${parseFloat(remainingBalance) > 0 ? 'text-amber-600 dark:text-amber-400' :
                  parseFloat(remainingBalance) < 0 ? 'text-destructive' : 'text-primary'
                  }`}>
                  {parseFloat(remainingBalance) > 0 ? '↩ Refund due to company' :
                    parseFloat(remainingBalance) < 0 ? '↗ Reimbursement requested' :
                      '✓ Fully reconciled'}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Settlement Notes</Label>
              <Input
                type="text"
                placeholder="Justification for any difference..."
                value={settlementNotes}
                onChange={(e) => setSettlementNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end pt-3 border-t border-border">
              <Button
                variant="gold"
                size="sm"
                onClick={handleSubmitSettlement}
                disabled={actionLoading}
                isLoading={actionLoading}
                className="gap-2 shadow-sm"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Submit Settlement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── PAYMENT HISTORY ── */}
      {request.payments?.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" /> Payment History
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                id="btn-print-voucher-payment-history"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPaymentForVoucher(request.payments[0]);
                  setIsVoucherOpen(true);
                }}
                className="gap-1.5 text-xs"
                title="Print Payment Voucher"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Voucher</span>
              </Button>
              <Badge variant="success" size="sm">
                {request.payments.length} record{request.payments.length > 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {request.payments.map((pm: any) => (
              <div key={pm.id} className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="default" size="sm">
                      {pm.paymentMethod}
                    </Badge>
                    <span className="text-muted-foreground text-[11px]">
                      {new Date(pm.paymentDate || pm.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setSelectedPaymentForVoucher(pm);
                        setIsVoucherOpen(true);
                      }}
                      className="text-muted-foreground hover:text-foreground gap-1"
                      title="Print Voucher for this Payment"
                    >
                      <Printer className="h-3 w-3" />
                      <span>Voucher</span>
                    </Button>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Amount Paid</p>
                    <p className="font-black text-lg text-foreground leading-tight">
                      {request.currency} {Number(pm.amountPaid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">by {pm.paidBy?.fullName || 'Finance'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div className="bg-card p-2.5 rounded-lg border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Recipient</span>
                    <p className="font-semibold text-foreground text-xs mt-0.5">{request.receiverName || '—'}</p>
                  </div>
                  <div className="bg-card p-2.5 rounded-lg border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Account / Phone</span>
                    <p className="font-semibold font-mono text-foreground text-xs mt-0.5">{request.receiverPhone || '—'}</p>
                  </div>
                </div>
                {(pm.transactionId || pm.referenceNumber || pm.notes) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1 border-t border-border">
                    {pm.transactionId && <span>Txn: <strong className="text-foreground font-mono">{pm.transactionId}</strong></span>}
                    {pm.referenceNumber && <span>Invoice #: <strong className="text-foreground font-mono">{pm.referenceNumber}</strong></span>}
                    {pm.notes && <span className="italic text-muted-foreground">"{pm.notes}"</span>}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── SETTLEMENT HISTORY ── */}
      {request.settlements?.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-primary" /> Expense Settlement & Audit
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {request.settlements.map((st: any) => (
              <div key={st.id} className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Actual Spent</p>
                    <p className="text-lg font-black text-foreground">
                      {request.currency} {Number(st.actualExpenseAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Remaining: {request.currency} {Number(st.remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Badge
                    variant={st.status === 'APPROVED' ? 'success' : st.status === 'REJECTED' ? 'destructive' : 'warning'}
                    size="sm"
                  >
                    {st.status}
                  </Badge>
                </div>
                {st.notes && (
                  <div className="p-3 bg-card rounded-lg border border-border text-xs text-muted-foreground leading-snug">
                    <span className="font-bold text-foreground block mb-0.5">Employee Notes</span>
                    "{st.notes}"
                  </div>
                )}
                {isAccountant && st.status === 'PENDING' && (
                  <div className="flex gap-2 justify-end pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSettlementReview(st.id, 'REJECTED')}
                      disabled={actionLoading}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      Reject Settlement
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleSettlementReview(st.id, 'APPROVED')}
                      disabled={actionLoading}
                      isLoading={actionLoading}
                      className="gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve & Close
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Payment Voucher Printable Modal ── */}
      <PaymentVoucherModal
        isOpen={isVoucherOpen}
        onClose={() => setIsVoucherOpen(false)}
        request={request}
        payment={selectedPaymentForVoucher}
      />
    </div>
  );
};

export default RequestDetailPage;
