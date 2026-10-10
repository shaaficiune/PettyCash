import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Save, Send, FileUp, X, ArrowLeft, Building2, AlertTriangle, AlertCircle } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Textarea,
  Select,
  Label,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription,
  Separator,
} from '../components/ui';

export const RequestFormPage: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const isEmployee = (user as any)?.role === 'EMPLOYEE';
  const navigate = useNavigate();

  // Form Fields
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [priority, setPriority] = useState('NORMAL');
  const [requiredDate, setRequiredDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [projectId, setProjectId] = useState('');
  const [budgetHeadId, setBudgetHeadId] = useState('');
  
  // Attachments & UI states
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [budgetHeads, setBudgetHeads] = useState<any[]>([]);
  const [budgetStats, setBudgetStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [fundAvailability, setFundAvailability] = useState<{ available: boolean; message: string } | null>(null);

  // Load projects & drafts details
  useEffect(() => {
    const compId = user?.companyId || user?.company?.id;

    if (compId) {
      api.get(`/companies/projects?companyId=${compId}`)
        .then(res => setProjects(res.data))
        .catch(() => console.error('Failed to load projects list'));

      api.get(`/companies/budget-heads?companyId=${compId}`)
        .then(res => setBudgetHeads(res.data))
        .catch(() => console.error('Failed to load budget heads'));

      api.get('/funds/availability')
        .then(res => setFundAvailability(res.data))
        .catch(() => console.error('Failed to check fund availability'));
    }

    const regionId = (user as any)?.region?.id || (user as any)?.regionId;
    if (regionId) {
      api.get(`/companies/regions/${regionId}/budget-stats`)
        .then(res => setBudgetStats(res.data))
        .catch(() => console.error('Failed to load region budget stats'));
    }

    if (id) {
      api.get(`/requests/${id}`)
        .then(res => {
          const req = res.data;
          if (req.status !== 'DRAFT' && req.status !== 'CORRECTION_REQUIRED') {
            navigate('/requests');
            return;
          }
          setPurpose(req.purpose);
          setDescription(req.description || '');
          setAmount(req.requestedAmount.toString());
          setCurrency(req.currency);
          setPriority(req.priority);
          setRequiredDate(req.requiredDate.substring(0, 10));
          setProjectId(req.projectId || '');
          setBudgetHeadId(req.budgetHeadId || '');
          setReceiverName(req.receiverName || '');
          setReceiverPhone(req.receiverPhone || '');
          setAttachments(req.attachments || []);
        })
        .catch(err => {
          console.error(err);
          navigate('/requests');
        });
    }
  }, [id, user, navigate]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    if (attachments.length >= 10) {
      setError('Maximum 10 attachments allowed');
      return;
    }

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    setError(null);
    setUploading(true);

    try {
      const res = await api.post('/attachments/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments([...attachments, res.data]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'File upload failed. Max size is 20MB.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (submitStatus: 'DRAFT' | 'PENDING_APPROVAL') => {
    if (!purpose || !amount || !requiredDate || !budgetHeadId) {
      setError('Purpose, Amount, Request Date, and Budget Head are mandatory fields');
      return;
    }

    if (submitStatus === 'PENDING_APPROVAL' && (!receiverName.trim() || !receiverPhone.trim())) {
      setError('Receiver / Beneficiary Name and Account / Phone Number are required to submit for approval.');
      return;
    }

    const requestedNum = parseFloat(amount);

    if (isNaN(requestedNum) || requestedNum <= 0) {
      setError('Requested amount must be greater than zero');
      return;
    }

    if (requestedNum > 50) {
      setError('Petty Cash requests cannot exceed $50. For larger amounts, please use the formal procurement process.');
      return;
    }

    if (submitStatus === 'PENDING_APPROVAL' && budgetStats && budgetStats.monthlyBudget > 0) {
      if ((budgetStats.totalUsed + requestedNum) > budgetStats.monthlyBudget) {
        setError(`Cannot submit request: Request amount ($${requestedNum.toLocaleString()}) exceeds the remaining region budget ($${budgetStats.remainingBudget.toLocaleString()} USD).`);
        return;
      }
    }

    if (isEmployee && submitStatus === 'PENDING_APPROVAL' && fundAvailability && !fundAvailability.available) {
      setError(fundAvailability.message);
      return;
    }

    setError(null);
    setSubmitting(true);

    const userRegionId = (user as any)?.region?.id || (user as any)?.regionId || undefined;

    const payload = {
      projectId: projectId || undefined,
      regionId: userRegionId,
      budgetHeadId: budgetHeadId || undefined,
      receiverName: receiverName.trim() || undefined,
      receiverPhone: receiverPhone.trim() || undefined,
      purpose,
      description,
      requestedAmount: requestedNum,
      currency,
      priority,
      requiredDate,
      attachments,
      status: submitStatus,
    };

    try {
      if (id) {
        await api.put(`/requests/${id}`, payload);
      } else {
        await api.post('/requests', payload);
      }
      navigate('/requests');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const numAmount = parseFloat(amount || '0');
  const isOverBudget = budgetStats && budgetStats.monthlyBudget > 0 && (budgetStats.totalUsed + numAmount) > budgetStats.monthlyBudget;

  return (
    <div className="max-w-3xl mx-auto space-y-4 font-sans">
      
      {/* Navigation back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Main Layout Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">
            {id ? 'Edit Request' : 'New Petty Cash Request'}
          </CardTitle>
          <CardDescription className="text-xs">
            {id ? 'Update draft request details' : 'Create an expense request within your regional budget'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Fund Unavailability Banner */}
          {isEmployee && fundAvailability && !fundAvailability.available && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <div>
                <AlertTitle>Fund Unavailable</AlertTitle>
                <AlertDescription className="mt-1">
                  {fundAvailability.message}
                  <span className="block mt-1 font-semibold">You can save this request as a draft and submit once fund allocation is complete.</span>
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Region Monthly Budget Card */}
          {budgetStats && budgetStats.monthlyBudget > 0 && (
            <Card className="bg-muted/40 border-border/80">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-primary" />
                    Region Monthly Limit ({budgetStats.regionName})
                  </span>
                  <span className="font-medium text-muted-foreground">
                    ${budgetStats.totalUsed.toLocaleString()} / ${budgetStats.monthlyBudget.toLocaleString()} USD
                  </span>
                </div>
                
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/40">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      budgetStats.usagePercentage > 90 
                        ? 'bg-rose-500' 
                        : budgetStats.usagePercentage > 75 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, budgetStats.usagePercentage)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                  <span>Remaining Budget: <strong className={budgetStats.remainingBudget === 0 ? 'text-rose-500 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>${budgetStats.remainingBudget.toLocaleString()}</strong></span>
                  <span>{budgetStats.usagePercentage}% Used</span>
                </div>

                {isOverBudget && (
                  <Alert variant="destructive" className="mt-2 py-2 text-xs">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Budget limit exceeded: Requested amount (${numAmount.toLocaleString()}) exceeds the remaining regional budget by ${(budgetStats.totalUsed + numAmount - budgetStats.monthlyBudget).toLocaleString()} USD.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-5">
            {/* Main info row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1.5">
                <Label required>Purpose</Label>
                <Input
                  type="text"
                  placeholder="Expense purpose (e.g., Office Supplies, Fuel)"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label required>Requested Amount</Label>
                  <Badge variant="warning" size="sm">
                    Max: $50.00
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max="50"
                    value={amount}
                    error={numAmount > 50}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1"
                  />
                  <div className="w-28 shrink-0">
                    <Select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="SOS">SOS</option>
                      <option value="SLS">SLS</option>
                    </Select>
                  </div>
                </div>
                {numAmount > 50 && (
                  <p className="text-[11px] text-destructive font-medium mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 inline shrink-0" />
                    Amount exceeds the $50.00 petty cash limit.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Additional details and justification (optional)..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label required>Request Date</Label>
                <Input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Project</Label>
                <Select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">None (General)</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1.5">
                <Label required>Beneficiary Name</Label>
                <Input
                  type="text"
                  placeholder="Beneficiary or vendor name"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label required>Account / Phone Number</Label>
                <Input
                  type="text"
                  placeholder="Account or mobile money number"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1.5">
                <Label required>Budget Head</Label>
                <Select
                  value={budgetHeadId}
                  error={!budgetHeadId}
                  onChange={(e) => setBudgetHeadId(e.target.value)}
                >
                  <option value="">Select spending category...</option>
                  {budgetHeads.map((bh) => (
                    <option key={bh.id} value={bh.id}>{bh.code} – {bh.name}</option>
                  ))}
                </Select>
                {!budgetHeadId && (
                  <p className="text-[10px] text-destructive font-medium">Required to submit for approval</p>
                )}
              </div>

              {(user as any)?.region?.name && (
                <div className="space-y-1.5">
                  <Label>Region</Label>
                  <div className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground select-none cursor-not-allowed">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      {(user as any).region.name}
                    </span>
                    <span className="text-[10px] opacity-70">Auto-assigned</span>
                  </div>
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div className="space-y-2 pt-2">
              <Separator />
              <Label className="pt-2">Attachments (Invoices, Receipts, Quotations)</Label>
              
              <div className="flex flex-wrap gap-2.5 pt-1">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border border-border text-xs">
                    <span className="truncate max-w-[150px] font-medium text-foreground">{att.fileName}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
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
              <p className="text-[10px] text-muted-foreground">Allowed formats: PDF, DOCX, XLSX, PNG, JPG, JPEG (Max 20MB per file, max 10 files)</p>
            </div>

            {/* Action buttons */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => handleSubmit('DRAFT')}
                className="gap-1.5"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </Button>

              <Button
                type="button"
                variant="gold"
                size="sm"
                isLoading={submitting}
                disabled={submitting || (isEmployee && fundAvailability !== null && !fundAvailability.available) || numAmount > 50 || (isEmployee && isOverBudget) || !budgetHeadId}
                title={
                  !budgetHeadId
                    ? 'Please select a Budget Head before submitting'
                    : numAmount > 50
                    ? 'Request amount cannot exceed $50.00'
                    : isEmployee && fundAvailability && !fundAvailability.available
                    ? fundAvailability.message
                    : isEmployee && isOverBudget
                    ? 'Request exceeds region monthly budget'
                    : undefined
                }
                onClick={() => handleSubmit('PENDING_APPROVAL')}
                className="gap-1.5 shadow-sm"
              >
                <Send className="h-4 w-4" />
                Submit Request
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestFormPage;
