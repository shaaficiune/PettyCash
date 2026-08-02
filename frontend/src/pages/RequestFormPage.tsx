import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Save, Send, FileUp, X, ArrowLeft, Building2, AlertTriangle } from 'lucide-react';

export const RequestFormPage: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams(); // present if editing
  const navigate = useNavigate();

  // Form Fields
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [priority, setPriority] = useState('NORMAL');
  const [requiredDate, setRequiredDate] = useState(() => new Date().toISOString().substring(0, 10));
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
    }

    // Load region budget stats using the logged-in user's region
    const regionId = (user as any)?.region?.id || (user as any)?.regionId;
    if (regionId) {
      api.get(`/companies/regions/${regionId}/budget-stats`)
        .then(res => setBudgetStats(res.data))
        .catch(() => console.error('Failed to load region budget stats'));
    }

    if (id) {
      // Edit draft mode
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
          setAttachments(req.attachments || []);
        })
        .catch(err => {
          console.error(err);
          navigate('/requests');
        });
    }
  }, [id, user]);

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

    const requestedNum = parseFloat(amount);

    // Hard block submit for approval if it exceeds region monthly budget limit
    if (submitStatus === 'PENDING_APPROVAL' && budgetStats && budgetStats.monthlyBudget > 0) {
      if ((budgetStats.totalUsed + requestedNum) > budgetStats.monthlyBudget) {
        setError(`Cannot submit request: Request amount ($${requestedNum.toLocaleString()}) exceeds the remaining region budget ($${budgetStats.remainingBudget.toLocaleString()} USD).`);
        return;
      }
    }

    setError(null);
    setSubmitting(true);

    // Auto-derive region from logged-in user's profile
    const userRegionId = (user as any)?.region?.id || (user as any)?.regionId || undefined;

    const payload = {
      projectId: projectId || undefined,
      regionId: userRegionId,
      budgetHeadId: budgetHeadId || undefined,
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
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      
      {/* Navigation back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-semibold cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to List
      </button>

      {/* Main Layout Card */}
      <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-md transition-colors">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
          {id ? 'Modify Petty Cash Request' : 'Submit Petty Cash Request'}
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          {id ? `Adjusting details for request draft` : 'Submit expenditure requests for accountant verification and approval'}
        </p>

        {/* Region Monthly Budget Card */}
        {budgetStats && budgetStats.monthlyBudget > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2 mb-6">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" />
                Region Monthly Limit ({budgetStats.regionName})
              </span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                ${budgetStats.totalUsed.toLocaleString()} / ${budgetStats.monthlyBudget.toLocaleString()} USD
              </span>
            </div>
            
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all ${
                  budgetStats.usagePercentage > 90 
                    ? 'bg-rose-500' 
                    : budgetStats.usagePercentage > 75 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, budgetStats.usagePercentage)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>Remaining Budget: <strong className={budgetStats.remainingBudget === 0 ? 'text-rose-500 font-bold' : 'text-emerald-600 font-bold'}>${budgetStats.remainingBudget.toLocaleString()}</strong></span>
              <span>{budgetStats.usagePercentage}% Used</span>
            </div>

            {isOverBudget && (
              <div className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  Budget Limit Exceeded: Requesting ${numAmount.toLocaleString()} exceeds your region&apos;s remaining budget by ${(budgetStats.totalUsed + numAmount - budgetStats.monthlyBudget).toLocaleString()} USD. Submission for approval is disabled.
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-lg text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Main info row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Purpose *</label>
              <input
                type="text"
                placeholder="e.g. Purchase office stationery"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Requested Amount *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer w-24"
                >
                  <option value="USD">USD ($)</option>
                  <option value="SOS">SOS</option>
                  <option value="SLS">SLS</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Detailed Description</label>
            <textarea
              placeholder="Provide breakdown justification..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Request Date *</label>
              <input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Project (Optional)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
              >
                <option value="">None</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Budget Head *</label>
              <select
                value={budgetHeadId}
                onChange={(e) => setBudgetHeadId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
              >
                <option value="">Select Budget Head</option>
                {budgetHeads.map((bh) => (
                  <option key={bh.id} value={bh.id}>{bh.code} – {bh.name}</option>
                ))}
              </select>
            </div>

            {(user as any)?.region?.name && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Region</label>
                <div className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs flex items-center gap-2 cursor-not-allowed">
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span>
                  {(user as any).region.name}
                  <span className="ml-auto text-[10px] text-slate-400">Auto-assigned</span>
                </div>
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Attachments (Invoices, Receipts, Quotations)</label>
            
            <div className="mt-2 flex flex-wrap gap-3">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="truncate max-w-[150px] font-medium">{att.fileName}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {attachments.length < 10 && (
                <label className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-all">
                  <FileUp className="h-4 w-4" />
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
            <p className="text-[10px] text-slate-400 mt-2">Allowed formats: PDF, DOCX, XLSX, PNG, JPG, JPEG (Max 20MB per file, max 10 files)</p>
          </div>

          {/* Action buttons */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('DRAFT')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('PENDING_APPROVAL')}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-primary/10 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
