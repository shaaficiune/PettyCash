import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Download, ShieldCheck, XCircle, Coins, CheckSquare,
  RefreshCw, User, Building2, MapPin, Tag, Calendar, FileText,
  Paperclip, CheckCircle2, AlertCircle, CircleDollarSign,
  Banknote, Edit3, Send, ReceiptText, ClipboardCheck, Loader2,
  Printer, Trash2, Lock, Save, Sparkles, Receipt, Copy, Check,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui';

// ─── Budget Head type detection for Edit Modal ──────────────────────────────
type BHType = 'VEHICLES' | 'GENERATORS' | 'TRANSPORTATIONS' | 'BUILDINGS' | 'OTHER';

function getBHType(name: string): BHType {
  const n = (name || '').toLowerCase();
  if (n.includes('vehicle')) return 'VEHICLES';
  if (n.includes('generator')) return 'GENERATORS';
  if (n.includes('transport')) return 'TRANSPORTATIONS';
  if (n.includes('building')) return 'BUILDINGS';
  return 'OTHER';
}

const DETAILS_HINT: Record<BHType, string> = {
  VEHICLES: 'Choose the vehicle registered for company & region, then describe the work needed.',
  GENERATORS: 'Enter generator site name (max 50 characters).',
  TRANSPORTATIONS: 'Specify what was transported, From, and To (max 50 chars each).',
  BUILDINGS: 'Enter building or location (max 50 characters).',
  OTHER: 'Enter concise description (max 50 characters).',
};

function parseCategoryDetails(bhType: BHType, description: string, purpose: string) {
  const desc = (description || '').trim();
  const purp = (purpose || '').trim();
  const text = desc || purp;

  const result = {
    vehiclePlate: '',
    vehicleDescription: '',
    generatorSite: '',
    whatTransported: '',
    transportFrom: '',
    transportTo: '',
    buildingLocation: '',
    freeDescription: desc || purp,
  };

  if (!text) return result;

  if (bhType === 'TRANSPORTATIONS') {
    const m1 = text.match(/(?:Transport:\s*|Transportation\s*—\s*)(.*?)\s*\((.*?)\s+to\s+(.*?)\)/i)
      || text.match(/^(.*?)\s*\((.*?)\s+to\s+(.*?)\)$/i);
    if (m1) {
      result.whatTransported = m1[1].replace(/^Transport:\s*/i, '').trim();
      result.transportFrom = m1[2].trim();
      result.transportTo = m1[3].trim();
      return result;
    }
    const m2 = text.match(/(?:Transport:\s*|Transportation\s*—\s*)(.*?)\s+to\s+(.*)/i)
      || text.match(/^(.*?)\s+to\s+(.*)/i);
    if (m2) {
      result.transportFrom = m2[1].replace(/^Transport:\s*/i, '').trim();
      result.transportTo = m2[2].trim();
      return result;
    }
    const m3 = text.match(/Transport:\s*(.*)/i);
    if (m3) {
      result.whatTransported = m3[1].trim();
      return result;
    }
  } else if (bhType === 'GENERATORS') {
    const m = text.match(/(?:Site:\s*|Generators?\s*—\s*)(.*)/i);
    if (m) {
      result.generatorSite = m[1].trim();
      return result;
    }
    result.generatorSite = text;
    return result;
  } else if (bhType === 'BUILDINGS') {
    const m = text.match(/(?:Location:\s*|Buildings?\s*—\s*)(.*)/i);
    if (m) {
      result.buildingLocation = m[1].trim();
      return result;
    }
    result.buildingLocation = text;
    return result;
  } else if (bhType === 'VEHICLES') {
    const parts = text.split('—').map(s => s.trim());
    if (parts.length >= 2) {
      const plateSection = parts[parts.length - 2];
      const descSection = parts[parts.length - 1];
      const plateInParens = plateSection.match(/\(([^)]+)\)/);
      result.vehiclePlate = plateInParens ? plateInParens[1].trim() : plateSection;
      result.vehicleDescription = descSection;
      return result;
    }
    const plateMatch = text.match(/\(([^)]+)\)/);
    if (plateMatch) {
      result.vehiclePlate = plateMatch[1].trim();
    } else {
      result.vehicleDescription = text;
    }
    return result;
  }

  return result;
}

const TIMELINE_STEPS = [
  { key: 'DRAFT', label: 'Draft', icon: Edit3 },
  { key: 'PENDING_APPROVAL', label: 'Submitted (Stage 1)', icon: Send },
  { key: 'ACCOUNTANT_REVIEW', label: 'Review (Stage 2)', icon: ClipboardCheck },
  { key: 'APPROVED', label: 'Approved (Ready for PV)', icon: ShieldCheck },
  { key: 'PAID', label: 'Paid (PV Issued)', icon: Banknote },
  { key: 'COMPLETED', label: 'Settled & Closed', icon: CheckCircle2 },
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
  label, amount, currency, variant = 'default',
}) => {
  const themes = {
    amber: {
      border: 'border-[#F5B700]/50 dark:border-[#F5B700]/30',
      bg: 'bg-[#FFFBEB] dark:bg-[#F5B700]/10',
      stripe: 'bg-[#F5B700]',
      label: 'text-[#92400E] dark:text-[#FBBF24]',
      value: 'text-[#B45309] dark:text-[#FBBF24]',
    },
    green: {
      border: 'border-[#059669]/50 dark:border-[#059669]/30',
      bg: 'bg-[#ECFDF5] dark:bg-[#059669]/10',
      stripe: 'bg-[#059669]',
      label: 'text-[#065F46] dark:text-[#34D399]',
      value: 'text-[#059669] dark:text-[#34D399]',
    },
    default: {
      border: 'border-border/80',
      bg: 'bg-muted/30',
      stripe: 'bg-primary',
      label: 'text-muted-foreground',
      value: 'text-foreground',
    },
  };
  const t = themes[variant];
  return (
    <div className={`relative overflow-hidden rounded-xl border ${t.border} ${t.bg} px-4 py-3 min-w-[140px]`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${t.stripe}`} />
      <p className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${t.label}`}>{label}</p>
      <p className={`text-xl font-bold tracking-tight font-financial ${t.value}`}>
        {amount !== null && amount !== undefined
          ? `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : <span className="text-sm font-medium text-muted-foreground">Pending</span>}
      </p>
    </div>
  );
};

export interface RequestDetailPageProps {
  requestId?: string;
  isInline?: boolean;
  onClose?: () => void;
  onActionCompleted?: () => void;
}

// MAIN PAGE
export const RequestDetailPage: React.FC<RequestDetailPageProps> = ({
  requestId,
  isInline = false,
  onClose,
  onActionCompleted,
}) => {
  const { user } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const id = requestId || params.id;

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [selectedPaymentForVoucher, setSelectedPaymentForVoucher] = useState<any>(null);
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  const handleCopyVoucher = (voucherNo: string) => {
    if (!voucherNo) return;
    navigator.clipboard.writeText(voucherNo);
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2000);
  };

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

  // Delete modal state — must be here (before any early returns) to satisfy React Rules of Hooks
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit Details Modal state (for Accountant / Admin adjusting metadata)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editReceiverName, setEditReceiverName] = useState('');
  const [editReceiverPhone, setEditReceiverPhone] = useState('');
  const [editBudgetHeadId, setEditBudgetHeadId] = useState('');
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [companyBudgetHeads, setCompanyBudgetHeads] = useState<any[]>([]);

  // Conditional dynamic sub-fields for edit modal (mirroring RequestFormPage)
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleDescription, setVehicleDescription] = useState('');
  const [generatorSite, setGeneratorSite] = useState('');
  const [whatTransported, setWhatTransported] = useState('');
  const [transportFrom, setTransportFrom] = useState('');
  const [transportTo, setTransportTo] = useState('');
  const [buildingLocation, setBuildingLocation] = useState('');
  const [freeDescription, setFreeDescription] = useState('');
  const [vehicles, setVehicles] = useState<{ plate: string; model: string }[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  const selectedBH = companyBudgetHeads.find(b => b.id === editBudgetHeadId) ||
    (request?.budgetHead?.id === editBudgetHeadId || request?.budgetHeadId === editBudgetHeadId ? request.budgetHead : null);
  const bhType: BHType = selectedBH ? getBHType(selectedBH.name) : 'OTHER';

  // Auto-build description from conditional sub-fields
  const autoDescription = useMemo(() => {
    switch (bhType) {
      case 'VEHICLES': {
        const v = vehicles.find(x => x.plate === vehiclePlate);
        const plateStr = v ? `${v.model} (${v.plate})` : (vehiclePlate || '');
        const descStr = vehicleDescription.trim();
        if (plateStr && descStr) return `${plateStr} — ${descStr}`;
        return plateStr || descStr;
      }
      case 'GENERATORS':
        return generatorSite.trim() ? `Site: ${generatorSite.trim()}` : '';
      case 'TRANSPORTATIONS': {
        const item = whatTransported.trim();
        const from = transportFrom.trim();
        const to = transportTo.trim();
        if (item && from && to) return `Transport: ${item} (${from} to ${to})`;
        if (from && to) return `Transport: ${from} to ${to}`;
        if (item) return `Transport: ${item}`;
        return '';
      }
      case 'BUILDINGS':
        return buildingLocation.trim() ? `Location: ${buildingLocation.trim()}` : '';
      default:
        return freeDescription.trim();
    }
  }, [bhType, vehiclePlate, vehicleDescription, vehicles, generatorSite, whatTransported, transportFrom, transportTo, buildingLocation, freeDescription]);

  // Auto-build short purpose (used as request title in lists)
  const autoPurpose = useMemo(() => {
    const bhName = selectedBH?.name || request?.budgetHead?.name || 'Petty Cash Request';
    switch (bhType) {
      case 'VEHICLES': {
        const v = vehicles.find(x => x.plate === vehiclePlate);
        const plateStr = v ? `${v.model} (${v.plate})` : (vehiclePlate || '');
        const descStr = vehicleDescription.trim();
        if (plateStr && descStr) return `${bhName} — ${plateStr} — ${descStr}`;
        if (plateStr) return `${bhName} — ${plateStr}`;
        return bhName;
      }
      case 'GENERATORS': return generatorSite.trim() ? `${bhName} — ${generatorSite.trim()}` : bhName;
      case 'TRANSPORTATIONS': {
        const item = whatTransported.trim();
        const from = transportFrom.trim();
        const to = transportTo.trim();
        if (item && from && to) return `${bhName} — ${item} (${from} to ${to})`;
        if (from && to) return `${bhName} — ${from} to ${to}`;
        if (item) return `${bhName} — ${item}`;
        return bhName;
      }
      case 'BUILDINGS': return buildingLocation.trim() ? `${bhName} — ${buildingLocation.trim()}` : bhName;
      default: return freeDescription.trim() ? `${bhName} — ${freeDescription.trim()}` : bhName;
    }
  }, [bhType, selectedBH, request, vehiclePlate, vehicleDescription, vehicles, generatorSite, whatTransported, transportFrom, transportTo, buildingLocation, freeDescription]);

  // Load vehicles when vehicle budget head is selected in the modal
  useEffect(() => {
    if (isEditModalOpen && bhType === 'VEHICLES') {
      const cName = request?.company?.name || '';
      const rName = request?.region?.name || '';
      if (cName) {
        setVehiclesLoading(true);
        const params = new URLSearchParams();
        params.append('companyName', cName);
        if (rName) params.append('regionName', rName);
        api.get(`/companies/vehicles?${params.toString()}`)
          .then(res => setVehicles(res.data || []))
          .catch(() => setVehicles([]))
          .finally(() => setVehiclesLoading(false));
      }
    }
  }, [isEditModalOpen, bhType, request]);

  const handleBudgetHeadChange = (newBhId: string) => {
    if (newBhId === editBudgetHeadId) return;
    setEditBudgetHeadId(newBhId);
    // User manually changed category — clear category-specific subfields only
    // Amount, receiverName, receiverPhone, invoiceNumber are preserved
    setVehiclePlate('');
    setVehicleDescription('');
    setGeneratorSite('');
    setWhatTransported('');
    setTransportFrom('');
    setTransportTo('');
    setBuildingLocation('');
    setFreeDescription('');
  };

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

  const openEditModal = async () => {
    if (!request) return;
    setEditReceiverName(request.receiverName || '');
    setEditReceiverPhone(request.receiverPhone || '');
    setEditInvoiceNumber(request.invoiceNumber || '');
    setEditError(null);

    const currentBhId = request.budgetHeadId || request.budgetHead?.id || '';
    setEditBudgetHeadId(currentBhId);

    // Parse and restore category details from saved description/purpose
    const bhName = request.budgetHead?.name || '';
    const type = getBHType(bhName);
    const parsed = parseCategoryDetails(type, request.description || '', request.purpose || '');
    setVehiclePlate(parsed.vehiclePlate);
    setVehicleDescription(parsed.vehicleDescription);
    setGeneratorSite(parsed.generatorSite);
    setWhatTransported(parsed.whatTransported);
    setTransportFrom(parsed.transportFrom);
    setTransportTo(parsed.transportTo);
    setBuildingLocation(parsed.buildingLocation);
    setFreeDescription(parsed.freeDescription);

    setIsEditModalOpen(true);

    const compId = request.companyId || request.company?.id;
    if (compId && companyBudgetHeads.length === 0) {
      try {
        const res = await api.get(`/companies/budget-heads?companyId=${compId}`);
        setCompanyBudgetHeads(res.data || []);
      } catch (err) {
        console.error('Failed to load budget heads', err);
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReceiverName.trim() || !editReceiverPhone.trim()) {
      setEditError('Recipient full name and phone number are required.');
      return;
    }
    if (!editBudgetHeadId) {
      setEditError('Budget Head is required.');
      return;
    }

    if (bhType === 'VEHICLES' && !vehiclePlate) {
      setEditError('Please choose a vehicle plate.');
      return;
    }
    if (bhType === 'VEHICLES' && !vehicleDescription.trim()) {
      setEditError('Please enter description of work for the vehicle (max 50 chars).');
      return;
    }
    if (bhType === 'GENERATORS' && !generatorSite.trim()) {
      setEditError('Please enter generator site name (max 50 chars).');
      return;
    }
    if (bhType === 'TRANSPORTATIONS') {
      if (!whatTransported.trim()) { setEditError('Please enter what was transported.'); return; }
      if (!transportFrom.trim() || !transportTo.trim()) { setEditError('Please enter origin (From) and destination (To).'); return; }
    }
    if (bhType === 'BUILDINGS' && !buildingLocation.trim()) {
      setEditError('Please enter building or location (max 50 chars).');
      return;
    }
    if (bhType === 'OTHER' && !freeDescription.trim()) {
      setEditError('Please enter description.');
      return;
    }

    const finalPurpose = autoPurpose.trim() || request.purpose;
    const finalDescription = autoDescription.trim() || request.description || undefined;

    setSavingEdit(true);
    setEditError(null);
    try {
      await api.put(`/requests/${request.requestNumber || request.id}`, {
        receiverName: editReceiverName.trim(),
        receiverPhone: editReceiverPhone.trim(),
        budgetHeadId: editBudgetHeadId,
        purpose: finalPurpose,
        description: finalDescription,
        invoiceNumber: editInvoiceNumber.trim() || undefined,
      });

      setIsEditModalOpen(false);
      await loadRequestDetails();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update request details');
    } finally {
      setSavingEdit(false);
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
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isApprovalTwo = user?.role === 'APPROVAL_TWO';
  const isAccountantRole = user?.role === 'ACCOUNTANT';
  // isAccountant = can record payment (Accountant/Cashier) — APPROVAL_TWO excluded intentionally
  const isAccountant = isAccountantRole || isSuperAdmin;
  const isOwnRequest = isAccountantRole && request?.userId === user?.id;
  const canEdit = (isEmployee || isOwnRequest) && (request.status === 'DRAFT' || request.status === 'CORRECTION_REQUIRED');
  const canAccountantEdit = isAccountant && (
    request.status === 'PENDING_APPROVAL' ||
    request.status === 'ACCOUNTANT_REVIEW' ||
    request.status === 'DRAFT' ||
    request.status === 'CORRECTION_REQUIRED'
  );

  // Employee can delete their own request before first approval (DRAFT or PENDING_APPROVAL)
  const isOwner = request?.userId === user?.id;
  const canDelete = isOwner && (request.status === 'DRAFT' || request.status === 'PENDING_APPROVAL');

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
      onActionCompleted?.();
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
      onActionCompleted?.();
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
      onActionCompleted?.();
    });

  const handleSettlementReview = (settlementId: string, status: 'APPROVED' | 'REJECTED') =>
    withLoading(async () => {
      await api.post(`/settlements/${settlementId}/review`, { status });
      await loadRequestDetails();
      onActionCompleted?.();
    });

  const handleDeleteRequest = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/requests/${request?.id || id}`);
      setIsDeleteModalOpen(false);
      onActionCompleted?.();
      if (isInline && onClose) {
        onClose();
      } else {
        navigate('/requests');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete request');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 font-sans pb-10">

      {/* ── Top Nav ── */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isInline && onClose) {
              onClose();
            } else {
              navigate('/requests');
            }
          }}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Requests
        </Button>
        <div className="flex items-center gap-2">
          {Boolean(
            request.voucherNumber ||
            ['ACCOUNTANT_REVIEW', 'APPROVED', 'PAYMENT_PROCESSING', 'PAID', 'COMPLETED'].includes(request.status)
          ) && (
            <Button
              id="btn-print-voucher-top"
              variant="success"
              size="sm"
              onClick={() => {
                setSelectedPaymentForVoucher(null);
                setIsVoucherOpen(true);
              }}
              className="gap-1.5 shadow-sm"
              title="Print Payment Voucher"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Payment Voucher</span>
            </Button>
          )}
          {canAccountantEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={openEditModal}
              className="gap-1.5 shadow-sm border-primary/40 text-primary hover:bg-primary/10"
              title="Edit Request Details (Recipient, Budget Head, Notes)"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Details</span>
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
          {canDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="gap-1.5 shadow-sm font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Request
            </Button>
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
                <h1 className="text-2xl font-black text-foreground tracking-tight font-display">
                  Request #{request.requestNumber}
                </h1>
                <StatusBadge status={request.status} />
                {request.voucherNumber && (
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-bold shadow-xs"
                    title="Payment Voucher Number"
                  >
                    <Receipt className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>PV #{request.voucherNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyVoucher(request.voucherNumber)}
                      title="Copy Payment Voucher Number"
                      className="p-1 hover:bg-emerald-500/20 rounded transition-colors text-emerald-700 dark:text-emerald-300 ml-0.5 inline-flex items-center"
                    >
                      {copiedVoucher ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                          <Check className="h-3 w-3" /> Copied
                        </span>
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                )}
                {request.priority && (
                  <Badge
                    variant={
                      request.priority === 'URGENT' || request.priority === 'HIGH'
                        ? 'destructive'
                        : request.priority === 'MEDIUM'
                          ? 'warning'
                          : 'secondary'
                    }
                    size="default"
                    className="font-bold uppercase tracking-wider text-[11px] px-2.5 py-0.5"
                  >
                    {request.priority} Priority
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Submitted {new Date(request.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} at {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Request Information
            </h3>
            {canAccountantEdit && (
              <Button
                variant="ghost"
                size="xs"
                onClick={openEditModal}
                className="gap-1 text-primary hover:text-primary/80 h-7 px-2 font-semibold"
                title="Edit request details"
              >
                <Edit3 className="h-3 w-3" />
                <span>Edit</span>
              </Button>
            )}
          </div>

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
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Recipient Details
              </h3>
              {canAccountantEdit && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={openEditModal}
                  className="gap-1 text-primary hover:text-primary/80 h-7 px-2 font-semibold"
                  title="Edit recipient details"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Edit</span>
                </Button>
              )}
            </div>
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

      {/* ── APPROVAL DRAWER (Stage 1 for Accountant, Stage 2 for Super Admin or Approval Two) ── */}
      {!isOwnRequest && (
        (request.status === 'PENDING_APPROVAL' && isAccountant) ||
        (request.status === 'ACCOUNTANT_REVIEW' && (isSuperAdmin || isApprovalTwo))
      ) && (
          <Card className="overflow-hidden border border-border/80">
            <CardHeader className="border-b border-border flex flex-row items-center justify-between bg-muted/30">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {request.status === 'PENDING_APPROVAL'
                    ? 'Stage 1: Approval One Review'
                    : 'Stage 2: Approval Two (Head of Accounting / Finance)'}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {request.status === 'PENDING_APPROVAL'
                    ? 'Review request details and forward to Stage 2 for final authorization'
                    : 'Issue final approval to authorize fund release and payment disbursement'}
                </CardDescription>
              </div>
              <Badge variant={request.status === 'PENDING_APPROVAL' ? 'warning' : 'info'} size="default">
                {request.status === 'PENDING_APPROVAL' ? 'Awaiting Approval One' : 'Awaiting Approval Two'}
              </Badge>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {canAccountantEdit && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Edit3 className="h-4 w-4 shrink-0" />
                    <span>Need to correct recipient name, phone, or budget category before approving?</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={openEditModal}
                    className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 shrink-0 gap-1 font-semibold"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit Details
                  </Button>
                </div>
              )}

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

                {/* Super Admin reviewing Stage 1 can optionally forward or directly finalize */}
                {isSuperAdmin && request.status === 'PENDING_APPROVAL' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReview('ACCOUNTANT_REVIEW')}
                    disabled={actionLoading}
                    className="gap-1.5"
                  >
                    Forward to Stage 2
                  </Button>
                )}

                {/* Main Approve Button */}
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => handleReview(request.status === 'ACCOUNTANT_REVIEW' || isSuperAdmin ? 'APPROVED' : 'ACCOUNTANT_REVIEW')}
                  disabled={actionLoading}
                  isLoading={actionLoading}
                  className="gap-1.5 shadow-sm font-bold"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {request.status === 'ACCOUNTANT_REVIEW' || isSuperAdmin
                    ? 'Final Approve (Authorize Payment)'
                    : 'Approve → Forward to Stage 2'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Notice for Accountant viewing a Stage 2 request (pending Approval Two authorization) */}
      {!isOwnRequest && isAccountantRole && !isSuperAdmin && !isApprovalTwo && request.status === 'ACCOUNTANT_REVIEW' && (
        <Card className="overflow-hidden border border-border/80">
          <CardContent className="p-5 flex items-start gap-3 bg-muted/20">
            <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Stage 2: Awaiting Head of Accounting Authorization</h3>
              <p className="text-xs text-muted-foreground mt-1">
                This request has been verified in Stage 1 and is currently in Stage 2 awaiting final release authorization from Approval Two (Head of Finance).
              </p>
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
              <h3 className="text-sm font-bold text-foreground">Awaiting Approval Two (Head of Finance Authorization)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You submitted this request as an Accountant. It has been routed directly to Stage 2 (Approval Two) for Head of Finance review and payment authorization. Only 1 approval is required.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notice for Approval Two viewing an approved request — awaiting Accountant disbursement */}
      {(isSuperAdmin || isApprovalTwo) && request.status === 'APPROVED' && (
        <Card className="overflow-hidden border border-border/80">
          <CardContent className="p-5 flex items-start gap-3 bg-muted/20">
            <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Authorized & Awaiting Disbursement</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You have authorized this request as Approval Two. It is now awaiting cash disbursement by the Cashier / Accountant.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── RECORD PAYMENT DRAWER (Accountant / Cashier only — Separation of Duties) ── */}
      {isAccountantRole && !isSuperAdmin && request.status === 'APPROVED' && (
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
              <div className="flex items-center justify-between">
                <Label>Disbursement Notes</Label>
                {request.voucherNumber && (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Assigned Voucher: <strong className="text-foreground">#{request.voucherNumber}</strong>
                  </span>
                )}
              </div>
              <Input
                type="text"
                placeholder={request.voucherNumber ? `Voucher #${request.voucherNumber}` : "Payment voucher or disbursement note"}
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

      {/* ── Edit Request Details Modal (Accountant / Super Admin) ── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" />
              Edit Request Details
            </DialogTitle>
            <DialogDescription>
              Adjust metadata (Recipient, Budget Category, Purpose). The requested amount is locked.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{editError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSaveEdit} className="space-y-4">
            {/* Locked Requested Amount Banner */}
            <div className="p-3 bg-muted/50 border border-border rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Requested Amount (Immutable)
                </span>
                <span className="text-base font-black text-foreground">
                  {request.currency} {Number(request.requestedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <Badge variant="secondary" size="sm" className="gap-1 text-[11px] font-semibold text-muted-foreground">
                <Lock className="h-3 w-3" /> Locked
              </Badge>
            </div>

            {/* Recipient Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label required>Recipient Full Name</Label>
                <Input
                  type="text"
                  placeholder="Receiver name"
                  value={editReceiverName}
                  onChange={(e) => setEditReceiverName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label required>Recipient Phone / Account</Label>
                <Input
                  type="text"
                  placeholder="e.g. 667xxxxxx"
                  value={editReceiverPhone}
                  onChange={(e) => setEditReceiverPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Budget Head Category */}
            <div className="space-y-1.5">
              <Label required>Budget Head (Category)</Label>
              <Select
                value={editBudgetHeadId}
                onChange={(e) => handleBudgetHeadChange(e.target.value)}
              >
                <option value="">Select Budget Head...</option>
                {companyBudgetHeads.map((bh) => (
                  <option key={bh.id} value={bh.id}>
                    {bh.code ? `${bh.code} – ${bh.name}` : bh.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Dynamic Conditional Details Section */}
            {editBudgetHeadId && (
              <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-3.5">
                <div className="space-y-0.5">
                  <Label required className="text-xs font-semibold">Category Details</Label>
                  <p className="text-[11px] text-muted-foreground">{DETAILS_HINT[bhType]}</p>
                </div>

                {/* ──── REPAIR OF VEHICLES ──── */}
                {bhType === 'VEHICLES' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label required className="text-xs font-semibold">Vehicle plate & model</Label>
                      <Select
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value)}
                        className="text-xs"
                      >
                        <option value="">{vehiclesLoading ? 'Loading vehicles...' : 'Choose the vehicle'}</option>
                        {vehicles.map((v) => (
                          <option key={v.plate} value={v.plate}>
                            {v.model} ({v.plate})
                          </option>
                        ))}
                      </Select>
                      {vehicles.length === 0 && !vehiclesLoading && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                          No vehicles registered for this company/region.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label required className="text-xs font-semibold">Description of work</Label>
                        <span className="text-[10px] text-muted-foreground font-mono">{vehicleDescription.length}/50</span>
                      </div>
                      <Input
                        placeholder="e.g. Oil change, front tire repair"
                        maxLength={50}
                        value={vehicleDescription}
                        onChange={(e) => setVehicleDescription(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* ──── REPAIR OF GENERATORS ──── */}
                {bhType === 'GENERATORS' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label required className="text-xs font-semibold">Generator site</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{generatorSite.length}/50</span>
                    </div>
                    <Input
                      placeholder="e.g. Carmo site"
                      maxLength={50}
                      value={generatorSite}
                      onChange={(e) => setGeneratorSite(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                )}

                {/* ──── TRANSPORTATIONS ──── */}
                {bhType === 'TRANSPORTATIONS' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label required className="text-xs font-semibold">What was transported?</Label>
                        <span className="text-[10px] text-muted-foreground font-mono">{whatTransported.length}/50</span>
                      </div>
                      <Input
                        placeholder="e.g. Simcards, Fiber cables"
                        maxLength={50}
                        value={whatTransported}
                        onChange={(e) => setWhatTransported(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label required className="text-xs font-semibold">From</Label>
                          <span className="text-[10px] text-muted-foreground font-mono">{transportFrom.length}/50</span>
                        </div>
                        <Input
                          placeholder="e.g. Garowe"
                          maxLength={50}
                          value={transportFrom}
                          onChange={(e) => setTransportFrom(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label required className="text-xs font-semibold">To</Label>
                          <span className="text-[10px] text-muted-foreground font-mono">{transportTo.length}/50</span>
                        </div>
                        <Input
                          placeholder="e.g. Qardho"
                          maxLength={50}
                          value={transportTo}
                          onChange={(e) => setTransportTo(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ──── BUILDINGS ──── */}
                {bhType === 'BUILDINGS' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label required className="text-xs font-semibold">Building / Location</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{buildingLocation.length}/50</span>
                    </div>
                    <Input
                      placeholder="e.g. HQ 3rd Floor or Branch Office"
                      maxLength={50}
                      value={buildingLocation}
                      onChange={(e) => setBuildingLocation(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                )}

                {/* ──── OTHER ──── */}
                {bhType === 'OTHER' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label required className="text-xs font-semibold">Description</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{freeDescription.length}/50</span>
                    </div>
                    <Input
                      placeholder="e.g. Office stationery, cleaning supplies"
                      maxLength={50}
                      value={freeDescription}
                      onChange={(e) => setFreeDescription(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                )}

                {/* Live Auto-Generated Summary Preview Box */}
                <div className="p-3 bg-card border border-primary/20 rounded-lg space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-primary text-[11px] uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Auto-Generated Summary</span>
                  </div>
                  <div className="space-y-1 text-slate-800 dark:text-slate-200">
                    <p><strong className="text-muted-foreground">Purpose:</strong> {autoPurpose || '—'}</p>
                    {autoDescription && (
                      <p><strong className="text-muted-foreground">Description:</strong> {autoDescription}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Optional Invoice Number */}
            <div className="space-y-1.5">
              <Label>Invoice Number</Label>
              <Input
                type="text"
                placeholder="Optional invoice / ref"
                value={editInvoiceNumber}
                onChange={(e) => setEditInvoiceNumber(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gold"
                size="sm"
                disabled={savingEdit}
                isLoading={savingEdit}
                className="gap-1.5 font-bold shadow-sm"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Changes</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Modal ── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <div className="bg-card border border-border shadow-2xl rounded-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-destructive/10 text-destructive shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Delete Request</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete request <strong className="text-foreground">#{request.requestNumber}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteRequest}
                disabled={deleting}
                className="gap-1.5 font-semibold"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{deleting ? 'Deleting...' : 'Delete Request'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestDetailPage;
