import React from 'react';
import { Printer, X } from 'lucide-react';
import { amountInWords } from '../utils/format';

interface PaymentVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  payment?: any;
}

export const PaymentVoucherModal: React.FC<PaymentVoucherModalProps> = ({
  isOpen,
  onClose,
  request,
  payment,
}) => {
  if (!isOpen || !request) return null;

  const isSomtel = request.company?.name?.toLowerCase().includes('somtel');

  // Extract payment details
  const activePayment = payment || (request.payments && request.payments.length > 0 ? request.payments[0] : null);
  const paymentDate = activePayment?.paymentDate || activePayment?.createdAt || request.updatedAt || request.createdAt;

  const dateObj = new Date(paymentDate);
  const formattedDay = String(dateObj.getDate()).padStart(2, '0');
  const formattedMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
  const formattedYear = String(dateObj.getFullYear());

  const payeeName = request.receiverName || request.user?.fullName || '—';
  const payeePhone = request.receiverPhone || request.user?.phone || '—';

  // Amount
  const rawAmount = activePayment?.amountPaid ?? request.approvedAmount ?? request.requestedAmount ?? 0;
  const numAmount = Number(rawAmount);
  const formattedAmount = numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const amountWords = amountInWords(numAmount, request.currency || 'USD');

  // Voucher Number: Each company starts at 1 (Somtel starts 1, Bluekom starts 1)
  const displayVoucherNo = request.voucherNumber != null
    ? String(request.voucherNumber)
    : (activePayment?.voucherNumber != null
      ? String(activePayment.voucherNumber)
      : '1');

  // Serialized PV Number (PV-BK-YYYY-XXXX or PV-ST-YYYY-XXXX) per planupdate.md
  const compCode = isSomtel ? 'ST' : 'BK';
  const voucherYear = formattedYear || new Date().getFullYear().toString();
  const seqStr = String(displayVoucherNo).padStart(4, '0');
  const serializedVoucherNo = `PV-${compCode}-${voucherYear}-${seqStr}`;

  const handlePrint = () => {
    const printContent = document.getElementById('printable-payment-voucher');
    if (!printContent) return;

    // Create an isolated hidden iframe — NO site stylesheets copied (they cause 14-page overflow)
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }

    // Self-contained print CSS only — no Tailwind, no site styles
    const printCSS = `
      @page {
        size: A5 portrait;
        margin: 6mm 7mm;
      }
      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        width: 134mm;
        height: auto;
        overflow: hidden;
        background: #ffffff;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 10px;
        color: #0f172a;
        margin: 0;
        padding: 0;
      }
      /* ── Layout helpers ── */
      .flex { display: flex; }
      .flex-col { flex-direction: column; }
      .flex-1 { flex: 1 1 0%; min-width: 0; }
      .flex-shrink-0 { flex-shrink: 0; }
      .items-start { align-items: flex-start; }
      .items-center { align-items: center; }
      .items-baseline { align-items: baseline; }
      .items-end { align-items: flex-end; }
      .justify-between { justify-content: space-between; }
      .justify-end { justify-content: flex-end; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-left { text-align: left; }
      .inline-block { display: inline-block; }
      .inline-flex { display: inline-flex; }
      .w-full { width: 100%; }
      .min-w-0 { min-width: 0; }
      .overflow-hidden { overflow: hidden; }
      .relative { position: relative; }
      .absolute { position: absolute; }
      .grid { display: grid; }
      .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      /* ── Table Styling (fills A5 ruled height) ── */
      table { border-collapse: collapse; width: 100%; }
      table th {
        height: 26px;
        background-color: #f0f4fa !important;
        color: #17375e !important;
        font-weight: 800;
        border: 1px solid #2d588f;
        padding: 2px 4px;
        font-size: 11px;
      }
      table td {
        border: 1px solid #2d588f;
        padding: 2px 6px;
        vertical-align: middle;
        font-size: 11px;
      }
      table tbody tr {
        height: 28px !important;
      }
      table tbody tr td {
        height: 28px !important;
      }
      table tr.grand-total-row td {
        height: 28px !important;
        background-color: #f0f4fa !important;
        font-weight: 800;
        font-size: 12px;
      }
      img { display: block; max-width: 100%; height: auto; object-fit: contain; }
      /* ── Borders ── */
      .border-b { border-bottom: 1px solid; }
      .border-t { border-top: 1px solid; }
      .border-r { border-right: 1px solid; }
      .border-l { border-left: 1px solid; }
      .border { border: 1px solid; }
      /* ── Typography ── */
      .font-black { font-weight: 900; }
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      .font-medium { font-weight: 500; }
      .uppercase { text-transform: uppercase; }
      .italic { font-style: italic; }
      .whitespace-nowrap { white-space: nowrap; }
      .text-ellipsis { text-overflow: ellipsis; }
      .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .leading-none { line-height: 1; }
      .leading-tight { line-height: 1.25; }
      .leading-snug { line-height: 1.375; }
      .tracking-tight { letter-spacing: -0.025em; }
      .tracking-wide { letter-spacing: 0.025em; }
      .tracking-wider { letter-spacing: 0.05em; }
      .tracking-widest { letter-spacing: 0.1em; }
      /* ── Font sizes ── */
      .text-\\[15px\\] { font-size: 15px; }
      .text-\\[13px\\] { font-size: 13px; }
      .text-\\[12px\\] { font-size: 12px; }
      .text-\\[11px\\] { font-size: 11px; }
      .text-\\[10px\\] { font-size: 10px; }
      .text-\\[9px\\] { font-size: 9px; }
      .text-\\[8px\\] { font-size: 8px; }
      .text-\\[7\\.5px\\] { font-size: 7.5px; }
      .text-xs { font-size: 11px; }
      .text-sm { font-size: 12px; }
      /* ── Spacing ── */
      .gap-1 { gap: 2px; }
      .gap-1\\.5 { gap: 6px; }
      .gap-2 { gap: 4px; }
      .gap-8 { gap: 16px; }
      .mt-0\\.5 { margin-top: 1px; }
      .mt-1 { margin-top: 2px; }
      .mt-2 { margin-top: 4px; }
      .mt-2\\.5 { margin-top: 5px; }
      .mt-3 { margin-top: 6px; }
      .mt-4 { margin-top: 8px; }
      .mb-1 { margin-bottom: 2px; }
      .pb-0\\.5 { padding-bottom: 1px; }
      .pb-1 { padding-bottom: 2px; }
      .pb-2 { padding-bottom: 4px; }
      .pt-0\\.5 { padding-top: 1px; }
      .pt-1 { padding-top: 2px; }
      .pt-2\\.5 { padding-top: 5px; }
      .pt-3 { padding-top: 6px; }
      .px-1 { padding-left: 2px; padding-right: 2px; }
      .px-1\\.5 { padding-left: 3px; padding-right: 3px; }
      .px-2 { padding-left: 4px; padding-right: 4px; }
      .px-2\\.5 { padding-left: 5px; padding-right: 5px; }
      .py-0 { padding-top: 0; padding-bottom: 0; }
      .py-0\\.5 { padding-top: 1px; padding-bottom: 1px; }
      .py-1 { padding-top: 2px; padding-bottom: 2px; }
      .p-4 { padding: 8px; }
      /* ── Colors ── */
      .bg-white { background-color: #ffffff; }
      .text-white { color: #ffffff; }
      .bg-\\[\\#1b4382\\] { background-color: #1b4382 !important; }
      .bg-\\[\\#f0f4fa\\] { background-color: #f0f4fa !important; }
      .bg-\\[\\#F8FAFC\\] { background-color: #F8FAFC !important; }
      .text-\\[\\#17375e\\] { color: #17375e !important; }
      .text-\\[\\#1b4382\\] { color: #1b4382 !important; }
      .text-\\[\\#d63031\\] { color: #d63031 !important; }
      .text-slate-900 { color: #0f172a !important; }
      .text-slate-800 { color: #1e293b !important; }
      .text-slate-700 { color: #334155 !important; }
      .text-slate-600 { color: #475569 !important; }
      .text-slate-500 { color: #64748b !important; }
      .text-slate-400 { color: #94a3b8 !important; }
      /* ── Widths & Heights ── */
      .w-16 { width: 40px; }
      .w-28 { width: 70px; }
      .w-10 { width: 24px; }
      .w-20 { width: 48px; }
      .w-24 { width: 60px; }
      .min-h-\\[22px\\] { min-height: 22px; }
      .min-h-\\[42px\\] { min-height: 42px; }
      .min-w-\\[55px\\] { min-width: 55px; }
      .min-w-\\[115px\\] { min-width: 115px; }
      .h-9 { height: 36px; }
      /* ── Borders colors ── */
      .border-slate-700 { border-color: #334155; }
      .border-slate-300 { border-color: #cbd5e1; }
      .border-slate-200 { border-color: #e2e8f0; }
      .border-\\[\\#2d588f\\] { border-color: #2d588f; }
      .border-\\[\\#17375e\\] { border-color: #17375e; }
      /* ── Print watermark ── */
      .print-watermark {
        position: absolute; right: 1px; top: 50%;
        font-size: 6px; letter-spacing: 3px; color: #94a3b8;
        writing-mode: vertical-rl; transform: rotate(180deg) translateY(50%);
        pointer-events: none; user-select: none;
      }
      /* ── Misc ── */
      .rounded-sm { border-radius: 2px; }
      .shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
      .font-mono { font-family: ui-monospace, monospace; }
      .font-financial { font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; }
      .select-none { user-select: none; }
      .space-y-1\\.5 > * + * { margin-top: 3px; }
    `;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>${isSomtel ? 'Somtel' : 'Bluekom'} Payment Voucher #${request.requestNumber || displayVoucherNo}</title>
    <style>${printCSS}</style>
  </head>
  <body>
    <div style="width:134mm;max-width:134mm;padding:2mm 1mm;margin:0 auto;page-break-inside:avoid;box-sizing:border-box;">
      ${printContent.innerHTML}
    </div>
  </body>
</html>`);
    doc.close();

    const triggerPrint = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch {}
      }, 3000);
    };

    // Wait for images before printing
    const images = Array.from(doc.images);
    if (images.length === 0) {
      setTimeout(triggerPrint, 300);
    } else {
      let loaded = 0;
      const onDone = () => { if (++loaded >= images.length) setTimeout(triggerPrint, 200); };
      images.forEach((img) => {
        if (img.complete) onDone();
        else { img.onload = onDone; img.onerror = onDone; }
      });
      setTimeout(triggerPrint, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-black/70 backdrop-blur-sm voucher-modal-overlay">
      {/* Container Card */}
      <div className="relative w-full max-w-[540px] bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden my-2 sm:my-4 voucher-modal-container">
        
        {/* Modal Toolbar - Hidden during print */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-900 text-white voucher-no-print border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-white/50" />
            <span className="text-xs sm:text-sm font-bold tracking-wide">
              {isSomtel ? 'Somtel Puntland' : 'Bluekom Puntland'} — Payment Voucher
            </span>
            <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
              #{request.requestNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F5B700] hover:bg-[#D9A300] text-[#1A1400] text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Select Paper size: A5 in print dialog"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print A5</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* PRINTABLE VOUCHER AREA — EXACT CLONE OF HISTORICAL VOUCHER PADS       */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div 
          id="printable-payment-voucher"
          className="p-5 sm:p-7 bg-white text-slate-900 font-sans select-text relative"
        >
          {/* Right margin vertical watermark text */}
          <div 
            className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[8px] tracking-widest text-slate-400 font-sans select-none pointer-events-none"
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg) translateY(50%)',
            }}
          >
            {isSomtel ? 'Printing By Risaala Printing 4571111' : 'Printing By Ilbaabs Printing 4571111'}
          </div>

          {/* ── TOP HEADER SECTION ── */}
          <div className="flex items-start justify-between gap-1 pb-2">
            {/* Left: Brand Logo — compact for A5 */}
            <div className="w-16 flex-shrink-0 pt-0.5">
              {isSomtel ? (
                <img
                  src="/logos/somtel-logo.png"
                  alt="Somtel Logo"
                  className="h-9 w-auto object-contain"
                  onError={(e: any) => { e.target.src = '/logos/somtel-banner.png'; }}
                />
              ) : (
                <img
                  src="/logos/bluekom-logo.jpg"
                  alt="Bluekom Logo"
                  className="h-9 w-auto object-contain"
                  onError={(e: any) => { e.target.src = '/logos/bluekom-logo.jpeg'; }}
                />
              )}
            </div>

            {/* Center: Company Name + subtitles + badge — tightened for A5 */}
            <div className="flex-1 text-center px-1 min-w-0">
              {isSomtel ? (
                <>
                  <h1 className="text-[15px] font-black tracking-tight text-[#17375e] uppercase leading-none whitespace-nowrap">
                    SOMTEL PUNTLAND LTD
                  </h1>
                  <div className="text-[7.5px] font-bold text-[#1b4382] tracking-wide uppercase mt-0.5 leading-tight whitespace-nowrap">
                    SERVICE-OPENNESS-MODERNIZATION · TRUST-EFFICIENCY-SOMALIA
                  </div>
                  <div className="text-[7.5px] font-bold text-[#17375e] tracking-wide uppercase leading-tight whitespace-nowrap">
                    HQ PUNTLAND GAROWE-SOMALIA
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-[15px] font-black tracking-tight text-[#17375e] uppercase leading-none whitespace-nowrap">
                    BLUEKOM PUNTLAND
                  </h1>
                  <div className="text-[7.5px] font-bold text-[#1b4382] italic mt-0.5 leading-tight whitespace-nowrap">
                    Get More, Go Faster
                  </div>
                  <div className="text-[7.5px] font-bold text-slate-800 leading-tight whitespace-nowrap">
                    CF5M+9FG, Dahabshiil Tower, Garowe · Tel: 252-660000066
                  </div>
                </>
              )}

              {/* Title Badge — single line, compact */}
              <div className="mt-1 inline-block">
                <div className="px-2 py-0.5 bg-[#1b4382] text-white font-black text-[9px] tracking-widest uppercase rounded-sm shadow-sm border border-[#17375e] whitespace-nowrap">
                  PETTY CASH PAYMENT VOUCHER
                </div>
              </div>
            </div>

            {/* Right: Voucher Number — single line */}
            <div className="w-28 flex-shrink-0 text-right pt-0.5">
              <div className="text-[9px] font-bold text-slate-600 leading-none">No.</div>
              <div
                className={`text-[11px] font-black font-mono tracking-tight leading-snug whitespace-nowrap ${
                  isSomtel ? 'text-[#d63031]' : 'text-[#17375e]'
                }`}
              >
                {serializedVoucherNo}
              </div>
              <div className="text-[8px] text-slate-400 font-mono">
                Pad #{displayVoucherNo}
              </div>
            </div>
          </div>

          {/* ── METADATA ROWS (Date, Mr/Ms, Tell) with Continuous Underlines ── */}
          <div className="mt-2.5 space-y-1.5 text-xs sm:text-[13px] text-slate-900 font-medium">
            {/* Date line */}
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#17375e] min-w-[55px]">Date:</span>
              <div className="inline-flex items-center gap-1.5 border-b border-slate-700 px-1 font-mono font-bold">
                <span>{formattedDay}</span>
                <span className="text-slate-400">/</span>
                <span>{formattedMonth}</span>
                <span className="text-slate-400">/</span>
                <span>{formattedYear}</span>
              </div>
            </div>

            {/* Mr / Ms line — single row, no wrap */}
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#17375e] whitespace-nowrap min-w-[55px]">Mr / Ms:</span>
              <div className="flex-1 border-b border-slate-700 pb-0.5 px-1 font-bold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                {payeeName}
              </div>
            </div>

            {/* Tell line — single row, no wrap */}
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#17375e] whitespace-nowrap min-w-[55px]">Tell:</span>
              <div className="flex-1 border-b border-slate-700 pb-0.5 px-1 font-bold text-slate-900 font-mono whitespace-nowrap overflow-hidden text-ellipsis">
                {payeePhone}
              </div>
            </div>
          </div>

          {/* ── ITEMS GRID (13 RULED ROWS WITH CLASSIC BLUE BORDERS) ── */}
          <div className="mt-3 border border-[#2d588f] rounded-none overflow-hidden">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#f0f4fa] text-[#17375e] font-black border-b border-[#2d588f]">
                  <th className="py-1 px-1.5 text-center w-10 border-r border-[#2d588f]">No</th>
                  <th className="py-1 px-2.5 text-center border-r border-[#2d588f]">Description</th>
                  <th className="py-1 px-2 text-center w-20 sm:w-24 border-r border-[#2d588f]">Price</th>
                  <th className="py-1 px-2.5 text-center w-24 sm:w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {/* 13 Ruled Rows — fills A5 page height */}
                {Array.from({ length: 13 }).map((_, index) => {
                  const rowNumber = index + 1;
                  const isFirstRow = index === 0;

                  return (
                    <tr 
                      key={rowNumber} 
                      style={{ height: '28px' }}
                      className="h-[28px] text-slate-900 font-medium border-b border-[#2d588f] hover:bg-slate-50/50 print:hover:bg-transparent"
                    >
                      <td style={{ height: '28px' }} className="text-center font-bold text-[#17375e] border-r border-[#2d588f] py-0 px-1 text-[11px]">
                        {rowNumber}
                      </td>
                      <td style={{ height: '28px' }} className="border-r border-[#2d588f] px-2.5 py-0 text-slate-900 leading-tight">
                        {isFirstRow ? (
                          <span className="font-bold">{request.purpose}</span>
                        ) : null}
                      </td>
                      <td style={{ height: '28px' }} className="border-r border-[#2d588f] px-2 py-0 text-right font-financial text-slate-800 text-[11px]">
                        {isFirstRow ? `$ ${formattedAmount}` : ''}
                      </td>
                      <td style={{ height: '28px' }} className="px-2.5 py-0 text-right font-financial font-bold text-slate-900 text-[11px]">
                        {isFirstRow ? `$ ${formattedAmount}` : ''}
                      </td>
                    </tr>
                  );
                })}

                {/* Grand Total Row */}
                <tr style={{ height: '28px' }} className="bg-[#f0f4fa] font-black text-[#17375e] grand-total-row">
                  <td style={{ height: '28px' }} colSpan={2} className="py-1 px-2.5 text-left border-r border-[#2d588f] text-xs sm:text-[13px] tracking-wide">
                    Grand Total
                  </td>
                  <td style={{ height: '28px' }} className="border-r border-[#2d588f] px-2 py-1 text-right font-financial">
                    {/* Empty cell per original scanned voucher */}
                  </td>
                  <td style={{ height: '28px' }} className="px-2.5 py-1 text-right font-financial text-xs sm:text-[13px] font-black text-[#17375e]">
                    $ {formattedAmount}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── AMOUNT IN WORDS ── */}
          <div className="mt-2.5 flex items-baseline gap-2 text-xs text-slate-900">
            <span className="font-bold text-[#17375e] whitespace-nowrap min-w-[115px]">Amount in Words:</span>
            <div className="flex-1 border-b border-slate-700 pb-0.5 px-1 font-semibold text-slate-800 leading-tight">
              {amountWords}
            </div>
          </div>

          {/* ── FORMAL DUAL-SIGNATURE FOOTER (INITIATED BY, APPROVED BY) ── */}
          <div className="mt-4 pt-3 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs sm:text-[12px]">
            {/* 1. Initiated By: Abshir Qasim */}
            <div className="flex flex-col justify-end">
              <span className="font-bold text-[#17375e] text-[11px] uppercase tracking-wider mb-1">
                Initiated By:
              </span>
              <div 
                style={{ minHeight: '44px' }}
                className="border-b border-slate-700 pb-1 text-slate-900 font-bold px-1 min-h-[44px] flex items-end text-[11px]"
              >
                <span>Abshir Qasim</span>
              </div>
            </div>

            {/* 2. Approved By: Mohamud Abdullahi */}
            <div className="flex flex-col justify-end">
              <span className="font-bold text-[#17375e] text-[11px] uppercase tracking-wider mb-1 text-right">
                Approved By:
              </span>
              <div 
                style={{ minHeight: '44px' }}
                className="border-b border-slate-700 pb-1 text-slate-900 font-bold px-1 min-h-[44px] flex items-end justify-end text-right text-[11px]"
              >
                <span>Mohamud Abdullahi</span>
              </div>
            </div>
          </div>

          {/* Bottom audit trace - print only */}
          <div className="mt-3 pt-1 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 print:flex">
            <span>Ref: {request.requestNumber}</span>
            <span>Generated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Modal Footer (Action buttons) - Hidden during print */}
        <div className="px-5 py-2.5 bg-muted/50 border-t border-border voucher-no-print space-y-1.5">
          {/* A5 Print Instructions */}
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <span className="text-amber-600 dark:text-amber-400 text-sm font-black shrink-0 mt-0.5">⚠</span>
            <div className="text-[10.5px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong className="font-bold">Select A5 in print dialog:</strong>{' '}
              <span className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">More settings</span>
              {' → '}
              <span className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">Paper size</span>
              {' → '}
              <span className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded font-bold">A5</span>
              {'. Browser defaults to A4.'}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              To save as PDF: <strong>Save as PDF</strong> → Paper size: <strong>A5</strong>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#F5B700] hover:bg-[#D9A300] text-[#1A1400] text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print A5 Voucher</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Global Print Styles injected for isolated print */}
      <style>{`
        @media print {
          html, body {
            height: auto !important;
            max-height: 280mm !important;
            overflow: hidden !important;
            visibility: hidden !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .voucher-modal-overlay {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            inset: auto !important;
          }
          .voucher-modal-container {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .voucher-no-print {
            display: none !important;
          }
          #printable-payment-voucher,
          #printable-payment-voucher * {
            visibility: visible !important;
          }
          #printable-payment-voucher {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 134mm !important;
            margin: 0 auto !important;
            padding: 3mm 5mm !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A5 portrait;
            margin: 4mm;
          }
        }
      `}</style>
    </div>
  );
};
