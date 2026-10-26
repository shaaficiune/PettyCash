import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Save, FileUp, X, ArrowLeft, AlertTriangle, AlertCircle, FileText,
} from 'lucide-react';
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Select,
  Label,
  Alert,
  AlertTitle,
  AlertDescription,
  Separator,
} from '../components/ui';
import { amountInWords } from '../utils/format';



// ─── Budget Head type detection ───────────────────────────────────────────────
type BHType = 'VEHICLES' | 'GENERATORS' | 'TRANSPORTATIONS' | 'BUILDINGS' | 'OTHER';

function getBHType(name: string): BHType {
  const n = (name || '').toLowerCase();
  if (n.includes('vehicle'))    return 'VEHICLES';
  if (n.includes('generator'))  return 'GENERATORS';
  if (n.includes('transport'))  return 'TRANSPORTATIONS';
  if (n.includes('building'))   return 'BUILDINGS';
  return 'OTHER';
}

const DETAILS_HINT: Record<BHType, string> = {
  VEHICLES:       'Choose the vehicle registered for your company & region.',
  GENERATORS:     'Enter generator site name (max 30 characters).',
  TRANSPORTATIONS:'Specify what was transported, From, and To (max 30 chars each).',
  BUILDINGS:      'Enter building or location (max 30 characters).',
  OTHER:          'Enter concise description (max 30 characters).',
};

// ─── Component ────────────────────────────────────────────────────────────────
export const RequestFormPage: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const isEmployee = (user as any)?.role === 'EMPLOYEE';
  const navigate = useNavigate();

  // Core fields
  const [amount, setAmount]             = useState('');
  const [currency, setCurrency]         = useState('USD');
  const [requiredDate, setRequiredDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [budgetHeadId, setBudgetHeadId] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [hasReceipt, setHasReceipt]     = useState(true);

  // Conditional sub-fields (concise & unified, max 20 chars)
  const [vehiclePlate, setVehiclePlate]       = useState('');
  const [generatorSite, setGeneratorSite]     = useState('');
  const [whatTransported, setWhatTransported] = useState('');
  const [transportFrom, setTransportFrom]     = useState('');
  const [transportTo, setTransportTo]         = useState('');
  const [buildingLocation, setBuildingLocation] = useState('');
  const [freeDescription, setFreeDescription] = useState('');

  // UI state
  const [attachments, setAttachments]   = useState<any[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [budgetHeads, setBudgetHeads]   = useState<any[]>([]);
  const [vehicles, setVehicles]         = useState<{ plate: string; model: string }[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [fundAvailability, setFundAvailability] = useState<{ available: boolean; message: string } | null>(null);

  // Derived user context
  const companyName = (user as any)?.company?.name || '';
  const regionName  = (user as any)?.region?.name  || '';
  const companyId   = (user as any)?.companyId     || (user as any)?.company?.id || '';
  const isSomtel    = companyName.toLowerCase().includes('somtel');

  // Resolve selected BH
  const selectedBH = budgetHeads.find(b => b.id === budgetHeadId);
  const bhType: BHType = selectedBH ? getBHType(selectedBH.name) : 'OTHER';



  // Auto-build description from sub-fields
  const autoDescription = useMemo(() => {
    switch (bhType) {
      case 'VEHICLES': {
        const v = vehicles.find(x => x.plate === vehiclePlate);
        return v ? `${v.model} (${v.plate})` : (vehiclePlate ? `Vehicle: ${vehiclePlate}` : '');
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
  }, [bhType, vehiclePlate, vehicles, generatorSite, whatTransported, transportFrom, transportTo, buildingLocation, freeDescription]);

  // Auto-build short purpose (used as request title in lists)
  const autoPurpose = useMemo(() => {
    const bhName = selectedBH?.name || 'Petty Cash Request';
    switch (bhType) {
      case 'VEHICLES': {
        const v = vehicles.find(x => x.plate === vehiclePlate);
        return v ? `${bhName} — ${v.model} (${v.plate})` : bhName;
      }
      case 'GENERATORS':     return generatorSite.trim()   ? `${bhName} — ${generatorSite.trim()}`     : bhName;
      case 'TRANSPORTATIONS': {
        const item = whatTransported.trim();
        const from = transportFrom.trim();
        const to = transportTo.trim();
        if (item && from && to) return `${bhName} — ${item} (${from} to ${to})`;
        if (from && to) return `${bhName} — ${from} to ${to}`;
        if (item) return `${bhName} — ${item}`;
        return bhName;
      }
      case 'BUILDINGS':      return buildingLocation.trim()? `${bhName} — ${buildingLocation.trim()}`  : bhName;
      default:               return freeDescription.trim() ? `${bhName} — ${freeDescription.trim()}`   : bhName;
    }
  }, [bhType, selectedBH, vehiclePlate, vehicles, generatorSite, whatTransported, transportFrom, transportTo, buildingLocation, freeDescription]);

  // ─── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (companyId) {
      api.get(`/companies/budget-heads?companyId=${companyId}`)
        .then(res => setBudgetHeads(res.data || []))
        .catch(() => {});

      api.get('/funds/availability')
        .then(res => setFundAvailability(res.data))
        .catch(() => {});
    }

    if (id) {
      api.get(`/requests/${id}`)
        .then(res => {
          const req = res.data;
          if (req.status !== 'DRAFT' && req.status !== 'CORRECTION_REQUIRED') {
            navigate('/requests');
            return;
          }
          setAmount(req.requestedAmount?.toString() || '');
          setCurrency(req.currency || 'USD');
          setRequiredDate(req.requiredDate ? req.requiredDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
          setBudgetHeadId(req.budgetHeadId || '');
          setReceiverName(req.receiverName || '');
          setReceiverPhone(req.receiverPhone || '');
          setInvoiceNumber(req.invoiceNumber || '');
          setAttachments(req.attachments || []);
          // Restore description as free text (conditional fields won't restore perfectly — that's OK for drafts)
          setFreeDescription(req.description || req.purpose || '');
        })
        .catch(() => navigate('/requests'));
    }
  }, [id, companyId, navigate]);

  // Load vehicles from backend API when vehicle budget head is selected
  useEffect(() => {
    if (bhType === 'VEHICLES') {
      setVehiclesLoading(true);
      const params = new URLSearchParams();
      if (companyName) params.append('companyName', companyName);
      if (regionName) params.append('regionName', regionName);

      api.get(`/companies/vehicles?${params.toString()}`)
        .then(res => setVehicles(res.data || []))
        .catch(() => setVehicles([]))
        .finally(() => setVehiclesLoading(false));
    }
  }, [bhType, companyName, regionName]);

  // Reset conditional sub-fields when budget head changes
  useEffect(() => {
    setVehiclePlate(''); setGeneratorSite(''); setWhatTransported('');
    setTransportFrom(''); setTransportTo('');
    setBuildingLocation(''); setFreeDescription('');
  }, [budgetHeadId]);

  // ─── Actions ────────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    if (attachments.length >= 10) { setError('Maximum 10 attachments allowed'); return; }
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    setError(null); setUploading(true);
    try {
      const res = await api.post('/attachments/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments(prev => [...prev, res.data]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'File upload failed. Max size is 20MB.');
    } finally { setUploading(false); }
  };

  const handleClear = () => {
    setBudgetHeadId(''); setAmount(''); setReceiverName(''); setReceiverPhone('');
    setInvoiceNumber(''); setHasReceipt(true); setAttachments([]);
    setVehiclePlate(''); setGeneratorSite(''); setWhatTransported('');
    setTransportFrom(''); setTransportTo('');
    setBuildingLocation(''); setFreeDescription('');
    setError(null);
    setRequiredDate(new Date().toISOString().substring(0, 10));
  };

  const getConditionalError = (): string | null => {
    switch (bhType) {
      case 'VEHICLES':
        if (!vehiclePlate) return 'Please choose a vehicle';
        return null;
      case 'GENERATORS':
        if (!generatorSite.trim()) return 'Please enter the generator site (max 30 chars)';
        if (generatorSite.trim().length > 30) return 'Generator site cannot exceed 30 characters';
        return null;
      case 'TRANSPORTATIONS':
        if (!whatTransported.trim()) return 'Please enter what was transported (max 30 chars)';
        if (whatTransported.trim().length > 30) return 'What was transported cannot exceed 30 characters';
        if (!transportFrom.trim()) return 'Please enter origin (From)';
        if (transportFrom.trim().length > 30) return 'Origin (From) cannot exceed 30 characters';
        if (!transportTo.trim()) return 'Please enter destination (To)';
        if (transportTo.trim().length > 30) return 'Destination (To) cannot exceed 30 characters';
        return null;
      case 'BUILDINGS':
        if (!buildingLocation.trim()) return 'Please enter the building / location (max 30 chars)';
        if (buildingLocation.trim().length > 30) return 'Building / location cannot exceed 30 characters';
        return null;
      default:
        if (!freeDescription.trim()) return 'Please enter a description (max 30 chars)';
        if (freeDescription.trim().length > 30) return 'Description cannot exceed 30 characters';
        return null;
    }
  };

  const handleSubmit = async (submitStatus: 'DRAFT' | 'PENDING_APPROVAL') => {
    if (!budgetHeadId) { setError('Please select a Budget Head first'); return; }
    if (!amount)        { setError('Amount is required'); return; }
    if (!requiredDate)  { setError('Request date is required'); return; }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) { setError('Amount must be greater than zero'); return; }
    if (numAmount > 50) {
      setError('Petty Cash requests cannot exceed $50.00. For larger amounts, please use the formal procurement process.');
      return;
    }

    if (submitStatus === 'PENDING_APPROVAL') {
      const condErr = getConditionalError();
      if (condErr) { setError(condErr); return; }

      if (!receiverName.trim() || !receiverPhone.trim()) {
        setError('Recipient name and phone are required to submit for approval.');
        return;
      }

      if (isEmployee && fundAvailability && !fundAvailability.available) {
        setError(fundAvailability.message);
        return;
      }
    }

    setError(null);
    setSubmitting(true);

    const userRegionId = (user as any)?.region?.id || (user as any)?.regionId || undefined;

    const payload = {
      regionId:        userRegionId,
      budgetHeadId,
      receiverName:    receiverName.trim()    || undefined,
      receiverPhone:   receiverPhone.trim()   || undefined,
      invoiceNumber:   invoiceNumber.trim()   || undefined,
      purpose:         autoPurpose,
      description:     autoDescription        || undefined,
      requestedAmount: numAmount,
      currency,
      priority:        'NORMAL',
      requiredDate,
      attachments,
      status:          submitStatus,
    };

    try {
      if (id) { await api.put(`/requests/${id}`, payload); }
      else    { await api.post('/requests', payload); }
      navigate('/requests');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const numAmount = parseFloat(amount || '0');
  const canSubmit = (
    !submitting &&
    numAmount <= 50 &&
    !!budgetHeadId &&
    !!amount &&
    !!receiverName.trim() &&
    !!receiverPhone.trim() &&
    !(isEmployee && fundAvailability !== null && !fundAvailability?.available)
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-4 font-sans">

      {/* Back nav */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card className="border-border shadow-xs">
        <CardContent className="pt-5 space-y-5">

          {/* Form subtitle */}
          <p className="text-xs text-muted-foreground border-b border-border pb-4">
            Fields marked <span className="text-destructive font-bold">*</span> are required.{' '}
            <span className="font-medium text-foreground">
              Approval One is notified when you submit.
            </span>
          </p>

          {/* Fund unavailability alert */}
          {isEmployee && fundAvailability && !fundAvailability.available && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <div>
                <AlertTitle className="text-xs font-bold">Fund Unavailable</AlertTitle>
                <AlertDescription className="text-xs mt-1">
                  {fundAvailability.message}
                  <span className="block mt-1 font-semibold">
                    You can save this request as a draft and submit once the fund is active.
                  </span>
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Error alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
            </Alert>
          )}

          {/* ── 1. BUDGET HEAD PILL CHIPS ─────────────────────────────────── */}
          <div className="space-y-2.5">
            <Label required className="text-xs font-semibold">
              1. Budget head{' '}
              <span className="text-muted-foreground font-normal">· choose this first</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {budgetHeads.map(bh => (
                <button
                  key={bh.id}
                  type="button"
                  onClick={() => { setBudgetHeadId(bh.id); setError(null); }}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer select-none ${
                    budgetHeadId === bh.id
                      ? 'bg-[#F5B700] border-[#F5B700] text-black shadow-sm'
                      : 'bg-transparent border-border text-foreground hover:border-[#F5B700]/70 hover:text-[#F5B700]'
                  }`}
                >
                  {bh.name}
                </button>
              ))}
            </div>
          </div>

          {/* ── COMPANY (read-only badge) ──────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label required className="text-xs font-semibold">Company</Label>
            <div>
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${
                  isSomtel
                    ? 'bg-[#C2571A] text-white'
                    : 'bg-[#F5B700] text-black'
                }`}
              >
                {companyName || 'N/A'}
              </span>
            </div>
          </div>

          {/* ── REGION (locked from user profile) ─────────────────────────── */}
          <div className="space-y-1.5">
            <Label required className="text-xs font-semibold">Region</Label>
            <div className="flex h-10 w-full items-center rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground select-none cursor-not-allowed">
              {regionName || 'Not assigned'}
            </div>
            <p className="text-[10px] text-muted-foreground">Set by your user profile</p>
          </div>

          {/* ── REQUEST DATE ───────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label required className="text-xs font-semibold">Request date</Label>
            <Input
              type="date"
              value={requiredDate}
              onChange={e => setRequiredDate(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* ── AMOUNT ────────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label required className="text-xs font-semibold">Amount (USD)</Label>
            <Input
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0.01"
              max="50"
              value={amount}
              error={numAmount > 50}
              onChange={e => setAmount(e.target.value)}
              className="font-mono text-sm font-bold"
            />
            <p className="text-[10px] text-muted-foreground">Single-request limit: $50.00</p>
            {numAmount > 50 && (
              <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Amount exceeds the $50.00 petty cash limit.
              </p>
            )}
            {numAmount > 0 && numAmount <= 50 && (
              <p className="text-[11px] text-muted-foreground italic flex items-center gap-1 pt-0.5">
                <FileText className="h-3 w-3 text-primary shrink-0" />
                <span>"{amountInWords(numAmount, currency)}"</span>
              </p>
            )}
          </div>

          {/* ── CONDITIONAL DETAILS SECTION (shown after budget head chosen) ── */}
          {budgetHeadId && (
            <div className="space-y-4">
              {/* Details section header */}
              <div className="space-y-0.5">
                <Label required className="text-xs font-semibold">Details</Label>
                <p className="text-[11px] text-muted-foreground">{DETAILS_HINT[bhType]}</p>
              </div>

              {/* ──── REPAIR OF VEHICLES ──────────────────────────────────── */}
              {bhType === 'VEHICLES' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label required className="text-xs font-semibold">Vehicle plate & model</Label>
                    <Select
                      value={vehiclePlate}
                      onChange={e => setVehiclePlate(e.target.value)}
                      className="text-xs"
                    >
                      <option value="">{vehiclesLoading ? 'Loading vehicles...' : 'Choose the vehicle'}</option>
                      {vehicles.map(v => (
                        <option key={v.plate} value={v.plate}>
                          {v.model} ({v.plate})
                        </option>
                      ))}
                    </Select>
                    {companyName && regionName && (
                      <p className="text-[10px] text-muted-foreground">
                        {companyName} vehicles in {regionName}
                      </p>
                    )}
                    {!vehiclesLoading && vehicles.length === 0 && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                        No vehicles registered for your region. Contact your admin.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ──── REPAIR OF GENERATORS ───────────────────────────────── */}
              {bhType === 'GENERATORS' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label required className="text-xs font-semibold">Generator site</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{generatorSite.length}/30</span>
                    </div>
                    <Input
                      placeholder="e.g. Carmo site"
                      maxLength={30}
                      value={generatorSite}
                      onChange={e => setGeneratorSite(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {/* ──── TRANSPORTATIONS ────────────────────────────────────── */}
              {bhType === 'TRANSPORTATIONS' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label required className="text-xs font-semibold">What was transported?</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{whatTransported.length}/30</span>
                    </div>
                    <Input
                      placeholder="e.g. Simcards, Fiber cables"
                      maxLength={30}
                      value={whatTransported}
                      onChange={e => setWhatTransported(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label required className="text-xs font-semibold">From</Label>
                        <span className="text-[10px] text-muted-foreground font-mono">{transportFrom.length}/30</span>
                      </div>
                      <Input
                        placeholder="e.g. Garowe"
                        maxLength={30}
                        value={transportFrom}
                        onChange={e => setTransportFrom(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label required className="text-xs font-semibold">To</Label>
                        <span className="text-[10px] text-muted-foreground font-mono">{transportTo.length}/30</span>
                      </div>
                      <Input
                        placeholder="e.g. Burtinle"
                        maxLength={30}
                        value={transportTo}
                        onChange={e => setTransportTo(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ──── REPAIR OF BUILDINGS ────────────────────────────────── */}
              {bhType === 'BUILDINGS' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label required className="text-xs font-semibold">Building / location</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{buildingLocation.length}/30</span>
                    </div>
                    <Input
                      placeholder="e.g. Garowe HQ1 branch"
                      maxLength={30}
                      value={buildingLocation}
                      onChange={e => setBuildingLocation(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {/* ──── OTHER (Refreshments / Misc / Tasliix / General) ─────── */}
              {bhType === 'OTHER' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label required className="text-xs font-semibold">Description</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">{freeDescription.length}/30</span>
                  </div>
                  <Input
                    placeholder="e.g. Staff tea and water"
                    maxLength={30}
                    value={freeDescription}
                    onChange={e => setFreeDescription(e.target.value)}
                    className="text-xs"
                  />
                </div>
              )}

              {/* ──── DESCRIPTION PREVIEW BOX ─────────────────────────────── */}
              <div
                className={`rounded-lg border p-3.5 transition-all duration-200 ${
                  autoDescription
                    ? 'border-[#F5B700]/40 bg-[#F5B700]/10 dark:bg-[#F5B700]/8'
                    : 'border-border/50 bg-muted/30'
                }`}
              >
                <p
                  className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${
                    autoDescription
                      ? 'text-[#B8860B] dark:text-[#F5B700]/80'
                      : 'text-muted-foreground'
                  }`}
                >
                  Description that will be saved
                </p>
                <p className={`text-xs leading-relaxed ${autoDescription ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {autoDescription || 'Fill in the questions above.'}
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* ── RECIPIENT ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required className="text-xs font-semibold">Recipient name</Label>
              <Input
                type="text"
                placeholder="Name of recipient"
                value={receiverName}
                onChange={e => setReceiverName(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label required className="text-xs font-semibold">Recipient phone</Label>
              <Input
                type="text"
                placeholder="+252 90 xxx xxxx"
                value={receiverPhone}
                onChange={e => setReceiverPhone(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          {/* ── RECEIPT TOGGLE ────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label required className="text-xs font-semibold">Receipt</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHasReceipt(true)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                  hasReceipt
                    ? 'bg-[#F5B700] border-[#F5B700] text-black shadow-sm'
                    : 'bg-transparent border-border text-foreground hover:border-[#F5B700]/60'
                }`}
              >
                Receipt
              </button>
              <button
                type="button"
                onClick={() => setHasReceipt(false)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                  !hasReceipt
                    ? 'bg-[#F5B700] border-[#F5B700] text-black shadow-sm'
                    : 'bg-transparent border-border text-foreground hover:border-[#F5B700]/60'
                }`}
              >
                No receipt
              </button>
            </div>
          </div>

          {/* ── RECEIPT / INVOICE NUMBER (only if has receipt) ────────────── */}
          {hasReceipt && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Receipt / invoice number</Label>
              <Input
                placeholder="Optional"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          )}

          {/* ── ATTACHMENTS ───────────────────────────────────────────────── */}
          <div className="space-y-2 pt-1">
            <Separator />
            <Label className="pt-2 text-xs font-semibold">
              Attachments (Invoices, Receipts, Quotations)
            </Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border border-border text-xs"
                >
                  <span className="truncate max-w-[150px] font-medium text-foreground">
                    {att.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                    className="p-0.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {attachments.length < 10 && (
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-background hover:bg-accent text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs">
                  <FileUp className="h-3.5 w-3.5" />
                  {uploading ? 'Uploading...' : 'Upload File'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              PDF, DOCX, XLSX, PNG, JPG (Max 20MB per file, max 10 files)
            </p>
          </div>

          {/* ── ACTION BUTTONS ────────────────────────────────────────────── */}
          <div className="pt-3 flex flex-row items-center justify-between gap-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={handleClear}
              className="cursor-pointer"
            >
              Clear
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => handleSubmit('DRAFT')}
                className="gap-1.5 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </Button>

              <Button
                type="button"
                variant="gold"
                size="sm"
                isLoading={submitting}
                disabled={!canSubmit}
                onClick={() => handleSubmit('PENDING_APPROVAL')}
                className="gap-1.5 shadow-sm font-bold cursor-pointer"
              >
                Submit for approval
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default RequestFormPage;
