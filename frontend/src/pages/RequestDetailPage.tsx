import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Download, ShieldCheck, XCircle, Coins, CheckSquare, RefreshCw
} from 'lucide-react';

export const RequestDetailPage: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog / Action UI states
  const [actionComments, setActionComments] = useState('');
  const [approvedAmountOverride, setApprovedAmountOverride] = useState('');
  
  // Payment recording fields
  const [paymentMethod, setPaymentMethod] = useState('EDAHAB');
  const [transactionId, setTransactionId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  
  // Settlement fields
  const [actualSpent, setActualSpent] = useState('');
  const [remainingBalance, setRemainingBalance] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');

  const loadRequestDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/requests/${id}`);
      setRequest(res.data);
      setApprovedAmountOverride(res.data.requestedAmount.toString());
      
      // Auto compute balance based on amount
      const spent = parseFloat(actualSpent || '0');
      const diff = Number(res.data.approvedAmount || res.data.requestedAmount) - spent;
      setRemainingBalance(diff.toFixed(2));
    } catch (e) {
      console.error('Failed to load request details', e);
      setError('Request details could not be found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequestDetails();
  }, [id]);

  // Recalculate balance when actual spent changes
  useEffect(() => {
    if (request) {
      const approved = Number(request.approvedAmount || request.requestedAmount);
      const spent = parseFloat(actualSpent || '0');
      setRemainingBalance((approved - spent).toFixed(2));
    }
  }, [actualSpent, request]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="p-6 text-center text-rose-500 font-sans">
        <p>{error || 'An error occurred'}</p>
        <Link to="/requests" className="text-primary hover:underline text-xs font-semibold mt-4 block">Back to Requests</Link>
      </div>
    );
  }

  // Submit Accountant Review
  const handleReview = async (status: 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUIRED') => {
    try {
      setError(null);
      if (status === 'APPROVED') {
        const parsedAmount = parseFloat(approvedAmountOverride);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          setError('Approved amount must be greater than zero');
          return;
        }
        if (parsedAmount > 50) {
          setError('Approved amount cannot exceed the maximum petty cash limit of $50.');
          return;
        }
      }
      await api.post(`/requests/${id}/review`, {
        status,
        comments: actionComments,
        approvedAmount: status === 'APPROVED' ? parseFloat(approvedAmountOverride) : undefined
      });
      setActionComments('');
      loadRequestDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Review action failed');
    }
  };

  // Record payment details
  const handleRecordPayment = async () => {
    try {
      setError(null);
      await api.post('/payments', {
        requestId: request.id,
        amountPaid: Number(request.approvedAmount || request.requestedAmount),
        paymentMethod,
        transactionId: transactionId || undefined,
        referenceNumber: referenceNumber || undefined,
        notes: paymentNotes
      });
      loadRequestDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record payment');
    }
  };

  // Submit expense settlement
  const handleSubmitSettlement = async () => {
    if (!actualSpent) {
      setError('Actual spent amount is required');
      return;
    }
    try {
      setError(null);
      await api.post('/settlements', {
        requestId: request.id,
        actualExpenseAmount: parseFloat(actualSpent),
        remainingBalance: parseFloat(remainingBalance),
        notes: settlementNotes
      });
      loadRequestDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Settlement submission failed');
    }
  };

  // Submit Settlement Review
  const handleSettlementReview = async (settlementId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setError(null);
      await api.post(`/settlements/${settlementId}/review`, { status });
      loadRequestDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process settlement review');
    }
  };

  const isEmployee = user?.role === 'EMPLOYEE';
  const isAccountant = user?.role === 'ACCOUNTANT' || user?.role === 'SUPER_ADMIN';

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      
      {/* Header and Back Link */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-semibold cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Petty Cash Requests
        </button>

        {isEmployee && (request.status === 'DRAFT' || request.status === 'CORRECTION_REQUIRED') && (
          <Link
            to={`/requests/edit/${request.id}`}
            className="px-4 py-1.5 bg-[#E8A020] hover:bg-[#D4911A] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            Edit Draft Request
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Main Request Information Card */}
      <div className="p-4 sm:p-6 lg:p-8 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-md space-y-6 transition-colors">
        
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Request #{request.requestNumber}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                request.status === 'APPROVED' ? 'bg-teal-50 text-teal-700 border border-teal-200/60 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40' :
                request.status === 'PAID' ? 'bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40' :
                request.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40' :
                request.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40' :
                request.status === 'CORRECTION_REQUIRED' ? 'bg-orange-50 text-orange-700 border border-orange-200/60 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40' :
                request.status === 'PENDING_APPROVAL' ? 'bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40' :
                'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}>
                {request.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Content grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Employee Details</span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">{request.user.fullName}</p>
              <p className="text-xs text-slate-500 mt-0.5">Emp #: {request.user.employeeNumber} | {request.company.name}</p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Purpose</span>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">{request.purpose}</p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Detailed Description</span>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed whitespace-pre-line">
                {request.description || 'No detailed description provided.'}
              </p>
            </div>

            {request.correctionNotes && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/30 rounded-lg text-xs">
                <span className="font-bold text-orange-700 dark:text-orange-400 block mb-0.5">Correction / Reject Notes:</span>
                <p className="text-slate-600 dark:text-slate-300">{request.correctionNotes}</p>
              </div>
            )}
          </div>

          <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800/60 pt-6 md:pt-0 pl-0 md:pl-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Requested Amount</span>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{request.currency} {Number(request.requestedAmount).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Approved Amount</span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {request.approvedAmount ? `${request.currency} ${Number(request.approvedAmount).toLocaleString()}` : 'Pending'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Request Date</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                  {new Date(request.requiredDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cost Center</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{request.costCenter || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Region</span>
                {request.region ? (
                  <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60">
                    {request.region.name}
                  </span>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">—</p>
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Budget Head</span>
                {request.budgetHead ? (
                  <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40">
                    {request.budgetHead.code} – {request.budgetHead.name}
                  </span>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">—</p>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Attachments</span>
              <div className="mt-2 space-y-1.5">
                {request.attachments?.length === 0 ? (
                  <p className="text-xs text-slate-400">No attachments uploaded</p>
                ) : (
                  request.attachments.map((att: any) => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 text-xs transition-colors"
                    >
                      <span className="truncate max-w-[200px] font-medium">{att.fileName}</span>
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACCOUNTANT APPROVAL DRAWER */}
      {isAccountant && request.status === 'PENDING_APPROVAL' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-md space-y-4 transition-colors">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Review &amp; Approval</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-500">Approved Amount</label>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                  Max: $50.00
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="50"
                value={approvedAmountOverride}
                onChange={(e) => setApprovedAmountOverride(e.target.value)}
                className={`w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border ${parseFloat(approvedAmountOverride) > 50 ? 'border-rose-500 ring-1 ring-rose-500 text-rose-600' : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white'} rounded-lg text-xs focus:outline-none`}
              />
              {parseFloat(approvedAmountOverride) > 50 && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
                  Approved amount cannot exceed the $50.00 maximum limit.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Comments / Review Notes</label>
              <input
                type="text"
                placeholder="Notes or justification for this action..."
                value={actionComments}
                onChange={(e) => setActionComments(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <button
              onClick={() => handleReview('CORRECTION_REQUIRED')}
              className="px-4 py-2 border border-orange-200 dark:border-orange-900/50 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Request Correction
            </button>
            <button
              onClick={() => handleReview('REJECTED')}
              className="px-4 py-2 border border-rose-200 dark:border-rose-900/50 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <XCircle className="h-4 w-4" />
              Reject Request
            </button>
            <button
              onClick={() => handleReview('APPROVED')}
              className="px-4 py-2 bg-[#E8A020] hover:bg-[#D4911A] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              Approve Request
            </button>
          </div>
        </div>
      )}

      {/* ACCOUNTANT RECORD PAYMENT DRAWER */}
      {isAccountant && request.status === 'APPROVED' && (
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-md space-y-4 transition-colors">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Record Disbursement</h3>
          <p className="text-xs text-slate-400">Record payment method and transaction reference</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer"
              >
                <option value="EDAHAB">eDahab</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Transaction ID</label>
              <input
                type="text"
                placeholder="TXN-998822"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Reference Number</label>
              <input
                type="text"
                placeholder="REF-0012"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Disbursement Notes</label>
            <input
              type="text"
              placeholder="Payment voucher or disbursement note"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleRecordPayment}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              <Coins className="h-4 w-4" />
              Record Payment
            </button>
          </div>
        </div>
      )}

      {/* EMPLOYEE SUBMIT SETTLEMENT DRAWER */}
      {isEmployee && request.status === 'PAID' && (
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-md space-y-4 transition-colors">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Expense Settlement</h3>
          <p className="text-xs text-slate-400">Reconcile actual expenses and receipts against disbursed funds</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Actual Spent Amount</label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={actualSpent}
                onChange={(e) => setActualSpent(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Remaining Balance</label>
              <input
                type="text"
                disabled
                value={`${request.currency} ${remainingBalance}`}
                className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-end">
              <span className="text-[10px] text-slate-400 mb-2 block leading-snug">
                {parseFloat(remainingBalance) > 0 ? 'Refund due to company' : parseFloat(remainingBalance) < 0 ? 'Reimbursement requested' : 'Fully reconciled'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Settlement Notes</label>
            <input
              type="text"
              placeholder="Justification details for difference..."
              value={settlementNotes}
              onChange={(e) => setSettlementNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg text-xs focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmitSettlement}
              className="px-4 py-2 bg-[#E8A020] hover:bg-[#D4911A] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <CheckSquare className="h-4 w-4" />
              Submit Settlement
            </button>
          </div>
        </div>
      )}

      {/* DISBURSED PAYMENT RECORDS DISPLAY */}
      {request.payments?.length > 0 && (
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm transition-colors">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Payment Details</h3>
          <div className="space-y-3">
            {request.payments.map((pm: any) => (
              <div key={pm.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl flex items-center justify-between text-xs transition-colors">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Disbursed via {pm.paymentMethod}</p>
                  <p className="text-slate-500 mt-0.5">Txn ID: {pm.transactionId || 'None'} | Ref: {pm.referenceNumber || 'None'}</p>
                  {pm.notes && <p className="text-[11px] italic text-slate-400 mt-1">"{pm.notes}"</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{request.currency} {Number(pm.amountPaid).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Paid by {pm.paidBy.fullName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXPENSE SETTLEMENTS DISPLAY */}
      {request.settlements?.length > 0 && (
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm transition-colors">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Expense Settlement & Receipts Auditing</h3>
          <div className="space-y-4">
            {request.settlements.map((st: any) => (
              <div key={st.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Reconciled Actual spent</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {request.currency} {Number(st.actualExpenseAmount).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Remaining balance: {request.currency} {Number(st.remainingBalance).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      st.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      st.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {st.status}
                    </span>
                  </div>
                </div>

                {st.notes && (
                  <p className="text-[11px] text-slate-500 bg-white dark:bg-slate-900/50 p-2.5 rounded border border-slate-100 dark:border-slate-800 leading-snug">
                    <span className="font-semibold block mb-0.5">Employee Notes:</span>
                    "{st.notes}"
                  </p>
                )}

                {/* Accountant actions on settlement */}
                {isAccountant && st.status === 'PENDING' && (
                  <div className="flex gap-2 justify-end pt-2 border-t border-slate-200/50 dark:border-slate-800/40">
                    <button
                      onClick={() => handleSettlementReview(st.id, 'REJECTED')}
                      className="px-3.5 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded cursor-pointer"
                    >
                      Reject Settlement
                    </button>
                    <button
                      onClick={() => handleSettlementReview(st.id, 'APPROVED')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded cursor-pointer"
                    >
                      Approve & Close Request
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
