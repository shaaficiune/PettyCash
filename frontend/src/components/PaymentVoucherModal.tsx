import React from 'react';
import { Printer, X } from 'lucide-react';

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
  const isBluekom = request.company?.name?.toLowerCase().includes('bluekom') || !isSomtel;

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

  // Voucher Number: Each company starts at 1 (Somtel starts 1, Bluekom starts 1)
  const displayVoucherNo = request.voucherNumber != null
    ? String(request.voucherNumber)
    : (activePayment?.voucherNumber != null
      ? String(activePayment.voucherNumber)
      : '1');

  // Approver / Accountant
  const approverName = activePayment?.paidBy?.fullName || 'Finance Office';

  const handlePrint = () => {
    const printContent = document.getElementById('printable-payment-voucher');
    if (!printContent) {
      window.print();
      return;
    }

    // Create an isolated hidden iframe for clean 1-page printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Collect stylesheets but exclude the modal's own @media print hiding rules
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .filter((el) => !el.textContent?.includes('voucher-modal-overlay'))
      .map((el) => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isSomtel ? 'Somtel' : 'Bluekom'} Payment Voucher #${request.requestNumber || displayVoucherNo}</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 12mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @media print, all {
              html, body {
                visibility: visible !important;
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                color: #0f172a !important;
              }
              body, body * {
                visibility: visible !important;
                opacity: 1 !important;
              }
            }
            .print-voucher-container {
              width: 100% !important;
              max-width: 180mm !important;
              margin: 0 auto !important;
              padding: 2mm 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          <div class="print-voucher-container">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    const triggerPrint = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 2000);
    };

    // Ensure images (company logos) are loaded before print dialog opens
    const images = Array.from(doc.images);
    if (images.length === 0) {
      setTimeout(triggerPrint, 200);
    } else {
      let loadedCount = 0;
      const onDone = () => {
        loadedCount++;
        if (loadedCount >= images.length) {
          setTimeout(triggerPrint, 150);
        }
      };
      images.forEach((img) => {
        if (img.complete) {
          onDone();
        } else {
          img.onload = onDone;
          img.onerror = onDone;
        }
      });
      // Safety fallback timer
      setTimeout(triggerPrint, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-black/70 backdrop-blur-sm voucher-modal-overlay">
      {/* Container Card */}
      <div className="relative w-full max-w-[680px] bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden my-2 sm:my-4 voucher-modal-container">
        
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Print Voucher or Save as PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
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
          <div className="flex items-start justify-between gap-2 pb-2">
            {/* Left: Brand Logo from D:/Petty Cash App */}
            <div className="w-24 sm:w-28 flex-shrink-0 pt-0.5">
              {isSomtel ? (
                <div className="flex flex-col items-center">
                  <img
                    src="/logos/somtel-logo.png"
                    alt="Somtel Logo"
                    className="h-12 w-auto object-contain"
                    onError={(e: any) => {
                      e.target.src = '/logos/somtel-banner.png';
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <img
                    src="/logos/bluekom-logo.jpg"
                    alt="Bluekom Logo"
                    className="h-12 w-auto object-contain"
                    onError={(e: any) => {
                      e.target.src = '/logos/bluekom-logo.jpeg';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Center: Company Name, Subtitle, Contact, and Voucher Title */}
            <div className="flex-1 text-center px-1">
              {isSomtel ? (
                <>
                  <h1 className="text-xl sm:text-[23px] font-black tracking-tight text-[#17375e] uppercase leading-none">
                    SOMTEL PUNTLAND LTD
                  </h1>
                  <div className="text-[9px] sm:text-[10px] font-bold text-[#1b4382] tracking-wider uppercase mt-1 leading-tight">
                    SERVICE-OPENNESS-MODERNIZATION
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-bold text-[#1b4382] tracking-wide uppercase leading-tight">
                    TRUST-EFFICIENCY-SOMALIA
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-[#17375e] tracking-wide uppercase mt-0.5 leading-tight">
                    HQ PUNTLAND GAROWE-SOMALIA
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-xl sm:text-[23px] font-black tracking-tight text-[#17375e] uppercase leading-none">
                    BLUEKOM PUNTLAND
                  </h1>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#1b4382] italic mt-1 leading-tight">
                    Get More, Go Faster
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-800 mt-0.5 leading-tight">
                    CF5M+9FG, Dahabshiil Tower, Garowe
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-slate-800 leading-tight">
                    Tell:- 252-660000066 / 252660000024
                  </div>
                </>
              )}

              {/* Title Badge: PETTY CASH PAYMENT VOUCHER */}
              <div className="mt-1.5 inline-block">
                <div className="px-3 py-0.5 bg-[#1b4382] text-white font-black text-xs sm:text-[13px] tracking-wider uppercase rounded-sm shadow-sm border border-[#17375e]">
                  PETTY CASH PAYMENT VOUCHER
                </div>
              </div>
            </div>

            {/* Right: Voucher Number */}
            <div className="w-24 sm:w-28 flex-shrink-0 text-right pt-1">
              <span className="text-xs font-bold text-slate-800">No. </span>
              <span 
                className={`text-xl sm:text-2xl font-black font-mono tracking-wider ${
                  isSomtel ? 'text-[#d63031]' : 'text-[#17375e]'
                }`}
              >
                {displayVoucherNo}
              </span>
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

            {/* Mr / Ms line */}
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#17375e] min-w-[55px]">Mr / Ms:</span>
              <div className="flex-1 border-b border-slate-700 pb-0.5 px-1 font-bold text-slate-900">
                {payeeName}
              </div>
            </div>

            {/* Tell line */}
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#17375e] min-w-[55px]">Tell:</span>
              <div className="flex-1 border-b border-slate-700 pb-0.5 px-1 font-bold text-slate-900 font-mono">
                {payeePhone}
              </div>
            </div>
          </div>

          {/* ── ITEMS GRID (15 ROWS WITH CLASSIC BLUE BORDERS) ── */}
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
                {/* 15 Ruled Rows */}
                {Array.from({ length: 15 }).map((_, index) => {
                  const rowNumber = index + 1;
                  const isFirstRow = index === 0;

                  return (
                    <tr 
                      key={rowNumber} 
                      className="h-[21px] text-slate-900 font-medium border-b border-[#2d588f] hover:bg-slate-50/50 print:hover:bg-transparent"
                    >
                      <td className="text-center font-bold text-[#17375e] border-r border-[#2d588f] py-0 px-1 text-[11px]">
                        {rowNumber}
                      </td>
                      <td className="border-r border-[#2d588f] px-2.5 py-0 text-slate-900 leading-tight">
                        {isFirstRow ? (
                          <span className="font-bold">{request.purpose}</span>
                        ) : null}
                      </td>
                      <td className="border-r border-[#2d588f] px-2 py-0 text-right font-mono text-slate-800 text-[11px]">
                        {isFirstRow ? `$ ${formattedAmount}` : ''}
                      </td>
                      <td className="px-2.5 py-0 text-right font-mono font-bold text-slate-900 text-[11px]">
                        {isFirstRow ? `$ ${formattedAmount}` : ''}
                      </td>
                    </tr>
                  );
                })}

                {/* Grand Total Row */}
                <tr className="bg-[#f0f4fa] font-black text-[#17375e]">
                  <td colSpan={2} className="py-1 px-2.5 text-left border-r border-[#2d588f] text-xs sm:text-[13px] tracking-wide">
                    Grand Total
                  </td>
                  <td className="border-r border-[#2d588f] px-2 py-1 text-right font-mono">
                    {/* Empty cell per original scanned voucher */}
                  </td>
                  <td className="px-2.5 py-1 text-right font-mono text-xs sm:text-[13px] font-black text-[#17375e]">
                    $ {formattedAmount}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── SIGNATURES FOOTER (INITIAL SIGNITURE & APROVED BY) ── */}
          <div className="mt-3.5 pt-1 flex items-end justify-between gap-8 text-xs sm:text-[13px]">
            {/* Initial Signiture (Stacked on 2 lines like original pad) */}
            <div className="flex-1">
              <div className="font-bold text-[#17375e] leading-tight">Initial</div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-[#17375e]">Signiture</span>
                <div className="flex-1 border-b border-slate-700 pb-0.5" />
              </div>
            </div>

            {/* Aproved By (Spelled with single 'p' like original pad) */}
            <div className="flex-1">
              <div className="flex items-baseline gap-1 mt-3">
                <span className="font-bold text-[#17375e] whitespace-nowrap">Aproved By</span>
                <div className="flex-1 border-b border-slate-700 pb-0.5 text-slate-800 font-bold px-1 text-right">
                  {approverName}
                </div>
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
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-t border-slate-200 voucher-no-print">
          <p className="text-[11px] text-slate-500">
            Tip: You can print directly or choose <strong className="text-slate-700">"Save as PDF"</strong> in your print window.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Payment Voucher</span>
            </button>
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
            max-width: 180mm !important;
            margin: 0 auto !important;
            padding: 4mm 6mm !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
        }
      `}</style>
    </div>
  );
};
