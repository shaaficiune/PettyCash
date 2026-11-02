import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MonthlyBookService {
  private readonly logger = new Logger(MonthlyBookService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Generates a fully formatted Monthly Petty Cash Book (.xlsx) matching the historical format
   * with company logos, eDahab accounts, running balance formulas, and monthly reconciliation cards.
   */
  async generateMonthlyBook(
    month?: number,
    year?: number,
    targetCompanyId?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const now = new Date();
    const effectiveMonth = month && month >= 1 && month <= 12 ? month : now.getMonth() + 1;
    const effectiveYear = year && year >= 2000 ? year : now.getFullYear();

    const monthNames = [
      '',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const monthName = monthNames[effectiveMonth] || `Month ${effectiveMonth}`;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Petty Cash Management System';
    wb.lastModifiedBy = 'Petty Cash Management System';
    wb.created = new Date();
    wb.modified = new Date();

    // Determine companies to include
    let companies = await this.prisma.company.findMany({
      where: targetCompanyId && targetCompanyId !== 'ALL' ? { id: targetCompanyId } : {},
      orderBy: { name: 'asc' },
    });

    if (companies.length === 0) {
      if (targetCompanyId && targetCompanyId !== 'ALL') {
        companies = await this.prisma.company.findMany({
          where: { name: { contains: targetCompanyId, mode: 'insensitive' } },
        });
      }
      if (companies.length === 0) {
        companies = await this.prisma.company.findMany({ orderBy: { name: 'asc' } });
      }
    }

    // Sort so Somtel comes first if both exist (matching original book order)
    companies.sort((a, b) => {
      if (a.name.toLowerCase().includes('somtel')) return -1;
      if (b.name.toLowerCase().includes('somtel')) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const company of companies) {
      await this.buildCompanyWorksheet(wb, company, effectiveMonth, effectiveYear, monthName);
    }

    const rawBuffer = await wb.xlsx.writeBuffer();
    const buffer = Buffer.from(rawBuffer);

    const compSlug = targetCompanyId && targetCompanyId !== 'ALL' && companies.length === 1
      ? `_${companies[0].name.toLowerCase().replace(/\s+/g, '_')}`
      : '';
    const filename = `Petty_Cash_Book_${monthName}_${effectiveYear}${compSlug}.xlsx`;

    return { buffer, filename };
  }

  /**
   * Generates an official, printable Monthly Petty Cash Book in HTML/PDF format,
   * exactly matching the design, branding, account cards, 10 columns, reconciliation,
   * and signature blocks of the Excel Monthly Book.
   */
  async generateMonthlyBookPdfHtml(
    month?: number,
    year?: number,
    targetCompanyId?: string,
  ): Promise<string> {
    const now = new Date();
    const effectiveMonth = month && month >= 1 && month <= 12 ? month : now.getMonth() + 1;
    const effectiveYear = year && year >= 2000 ? year : now.getFullYear();

    const monthNames = [
      '',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const monthName = monthNames[effectiveMonth] || `Month ${effectiveMonth}`;

    let companies = await this.prisma.company.findMany({
      where: targetCompanyId && targetCompanyId !== 'ALL' ? { id: targetCompanyId } : {},
      orderBy: { name: 'asc' },
    });

    // Enforce SINGLE-company PDF generation: never combine multiple companies into one PDF document
    if (!targetCompanyId || targetCompanyId === 'ALL' || companies.length === 0) {
      if (targetCompanyId && targetCompanyId !== 'ALL') {
        companies = await this.prisma.company.findMany({
          where: { name: { contains: targetCompanyId, mode: 'insensitive' } },
        });
      }
      if (companies.length === 0) {
        const somtel = await this.prisma.company.findFirst({
          where: { name: { contains: 'somtel', mode: 'insensitive' } },
        });
        const defaultComp = somtel || (await this.prisma.company.findFirst({ orderBy: { name: 'asc' } }));
        companies = defaultComp ? [defaultComp] : [];
      }
    }

    companies.sort((a, b) => {
      if (a.name.toLowerCase().includes('somtel')) return -1;
      if (b.name.toLowerCase().includes('somtel')) return 1;
      return a.name.localeCompare(b.name);
    });

    const companySections: string[] = [];

    for (const company of companies) {
      const sectionHtml = await this.buildCompanyPdfSection(company, effectiveMonth, effectiveYear, monthName);
      companySections.push(sectionHtml);
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Petty Cash Book - ${escapeHtml(monthName)} ${effectiveYear}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5px;
      color: #0f172a;
      background: #f1f5f9;
      margin: 0;
      padding: 16px;
      line-height: 1.35;
      -webkit-font-smoothing: antialiased;
    }
    .no-print {
      margin: 0 auto 16px auto;
      max-width: 1140px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 10px 18px;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .print-btn {
      padding: 8px 20px;
      background: #0B2545;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 4px rgba(11,37,69,0.2);
      transition: background 0.15s ease;
    }
    .print-btn:hover {
      background: #173763;
    }
    .company-sheet {
      page-break-after: always;
      margin: 0 auto 24px auto;
      background: #ffffff;
      padding: 22px 26px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04);
      max-width: 1140px;
    }
    .company-sheet:last-child {
      page-break-after: avoid;
      margin-bottom: 0;
    }
    .sheet-header-grid {
      display: grid;
      grid-template-columns: 210px 1fr 190px;
      align-items: center;
      margin-bottom: 12px;
      gap: 16px;
    }
    .header-logo img {
      max-height: 50px;
      max-width: 200px;
      object-fit: contain;
    }
    .header-title {
      text-align: center;
    }
    .header-title h1 {
      margin: 0;
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }
    .header-title p {
      margin: 3px 0 0 0;
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      letter-spacing: 0.2px;
    }
    .account-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      display: grid;
      grid-template-columns: 80px 1fr;
      text-align: center;
      font-size: 10px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .account-label {
      background: #f1f5f9;
      font-weight: 800;
      font-size: 8.5px;
      letter-spacing: 0.4px;
      padding: 6px 4px;
      border-right: 1px solid #cbd5e1;
      color: #334155;
      display: flex;
      flex-direction: column;
      justify-content: center;
      line-height: 1.2;
    }
    .account-val {
      font-weight: 800;
      padding: 6px 8px;
      font-family: 'Consolas', monospace;
      display: flex;
      flex-direction: column;
      justify-content: center;
      font-size: 12px;
      line-height: 1.2;
    }
    .meta-cards-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
    }
    .meta-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2px 8px;
      border-right: 1px solid #e2e8f0;
    }
    .meta-item:last-child {
      border-right: none;
    }
    .meta-item-label {
      font-size: 8.5px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .meta-item-val {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      font-family: 'Consolas', monospace;
    }
    table.petty-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    table.petty-table th {
      color: #ffffff;
      padding: 7px 6px;
      font-size: 9px;
      font-weight: 700;
      text-align: center;
      vertical-align: middle;
      border: 1px solid #94a3b8;
      line-height: 1.25;
      letter-spacing: 0.3px;
    }
    table.petty-table td {
      padding: 5px 6px;
      font-size: 9px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    table.petty-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    table.petty-table tr.topup-row td {
      background-color: #eff6ff;
      font-style: italic;
      font-weight: 600;
    }
    table.petty-table tr.total-row td {
      background-color: #f1f5f9;
      font-weight: 800;
      border-top: 2px solid #0B2545;
      border-bottom: 3px double #0B2545;
      padding: 7px 6px;
    }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .num-col {
      font-family: 'Consolas', 'SF Mono', monospace;
      font-size: 9.5px;
      font-variant-numeric: tabular-nums;
    }

    .bottom-section {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 18px;
      align-items: start;
      margin-top: 12px;
      page-break-inside: avoid;
    }
    .reconciliation-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .reconciliation-header {
      padding: 6px 12px;
      font-weight: 800;
      font-size: 9.5px;
      text-align: center;
      letter-spacing: 0.4px;
    }
    .reconciliation-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 12px;
      font-size: 9px;
      border-top: 1px solid #e2e8f0;
    }
    .reconciliation-row:last-child {
      border-top: 1.5px solid #cbd5e1;
      background: #f8fafc;
      font-weight: 800;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .sig-box {
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    .sig-role-label {
      font-size: 8px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .sig-name {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 1px;
    }
    .sig-title {
      font-size: 8.5px;
      color: #64748b;
      font-style: italic;
      margin-bottom: 22px;
    }
    .sig-line {
      border-top: 1.5px solid #94a3b8;
      font-size: 8px;
      color: #64748b;
      padding-top: 4px;
      font-weight: 600;
    }

    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .company-sheet {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        max-width: 100% !important;
        margin: 0 !important;
        page-break-after: always;
      }
      .company-sheet:last-child {
        page-break-after: avoid;
      }
      .bottom-section {
        page-break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div style="font-size:12px; font-weight:700; color:#0B2545;">
      📘 Official Monthly Petty Cash Book — ${escapeHtml(monthName)} ${effectiveYear}
    </div>
    <button class="print-btn" onclick="window.print()">
      🖨️ Print / Save as PDF
    </button>
  </div>
  ${companySections.join('')}
</body>
</html>`;
  }

  private async buildCompanyPdfSection(
    company: any,
    month: number,
    year: number,
    monthName: string,
  ): Promise<string> {
    const isSomtel = company.name.toLowerCase().includes('somtel');
    const isBluekom = company.name.toLowerCase().includes('bluekom');

    const brandColor = isSomtel ? '#0B2545' : isBluekom ? '#1E40AF' : '#0F172A';
    const brandLight = isSomtel ? '#FEF3C7' : isBluekom ? '#DBEAFE' : '#F1F5F9';
    const accountNo = isSomtel ? '763238' : isBluekom ? '763241' : '—';
    const accountBrandColor = isSomtel ? '#D97706' : '#1E40AF';

    // Logo base64 lookup
    const logoFileName = isSomtel ? 'somtel-banner.png' : 'bluekom-logo.jpeg';
    const candidatePaths = [
      path.join(process.cwd(), 'assets', 'logos', logoFileName),
      path.join(process.cwd(), 'backend', 'assets', 'logos', logoFileName),
      path.join(__dirname, '..', '..', 'assets', 'logos', logoFileName),
      path.join(__dirname, '..', '..', '..', 'assets', 'logos', logoFileName),
    ];
    const logoPath = candidatePaths.find((p) => fs.existsSync(p));
    let logoDataUri = '';
    if (logoPath) {
      try {
        const ext = logoFileName.endsWith('.png') ? 'png' : 'jpeg';
        const fileBuf = fs.readFileSync(logoPath);
        logoDataUri = `data:image/${ext};base64,${fileBuf.toString('base64')}`;
      } catch (err) {
        this.logger.warn(`Failed to read logo base64 for ${company.name}: ${err}`);
      }
    }

    const fund = await this.prisma.pettyCashFund.findUnique({
      where: { companyId_month_year: { companyId: company.id, month, year } },
    });

    const openBal = fund ? Number(fund.openingBalance) : 0;
    const additional = fund ? Number(fund.additionalFunding) : 0;
    const remaining = fund ? Number(fund.remainingBalance) : 0;

    const startMonthStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const ledgers = await this.prisma.pettyCashLedger.findMany({
      where: {
        companyId: company.id,
        transactionType: { not: 'ALLOCATION' },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        employee: { select: { fullName: true, phone: true } },
        request: {
          include: {
            region: { select: { name: true } },
            budgetHead: { select: { name: true } },
            user: { select: { fullName: true, phone: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    let runningBalance = openBal + (additional > 0 ? additional : 0);
    let totalDebit = 0;
    let totalCredit = additional > 0 ? additional : 0;

    // Top-up row
    const topupBalance = runningBalance;
    const topupRowHtml = `
      <tr class="topup-row">
        <td class="text-center">—</td>
        <td class="text-center">${escapeHtml(startMonthStr)}</td>
        <td class="text-center">—</td>
        <td>Petty Cash Float</td>
        <td>${escapeHtml(monthName)} Top-Up / Float Allocation</td>
        <td>Fund Allocation</td>
        <td class="text-center">HQ</td>
        <td class="text-right num-col" style="color:#059669; font-weight:700;">${additional > 0 ? `+$${formatMoney(additional)}` : '—'}</td>
        <td class="text-right num-col">—</td>
        <td class="text-right num-col" style="font-weight:700;">$${formatMoney(topupBalance)}</td>
      </tr>`;

    let sn = 1;
    const dataRowsHtml = ledgers.map((item: any) => {
      const dateStr = item.date ? new Date(item.date).toISOString().slice(0, 10) : '';
      const phoneOrAccountNo =
        item.request?.receiverPhone ||
        item.employee?.phone ||
        item.request?.user?.phone ||
        item.referenceNumber ||
        '—';

      const payeeName =
        item.request?.receiverName ||
        item.request?.vendorName ||
        item.employee?.fullName ||
        item.request?.user?.fullName ||
        '—';

      const desc = item.request?.purpose
        ? `${item.request.purpose}${item.request.description ? ` (${item.request.description})` : ''}`
        : item.description || '—';

      const category = item.request?.budgetHead?.name || 'General';
      const region = item.request?.region?.name || 'HQ';
      const debitVal = item.debit ? Number(item.debit) : 0;
      const creditVal = item.credit ? Number(item.credit) : 0;

      totalDebit += debitVal;
      totalCredit += creditVal;
      runningBalance = runningBalance - debitVal + creditVal;

      return `
      <tr>
        <td class="text-center">${sn++}</td>
        <td class="text-center" style="white-space:nowrap;">${escapeHtml(dateStr)}</td>
        <td class="text-center" style="font-family:'Consolas',monospace;">${escapeHtml(phoneOrAccountNo)}</td>
        <td style="font-weight:600;">${escapeHtml(payeeName)}</td>
        <td style="word-break:break-word;">${escapeHtml(desc)}</td>
        <td>${escapeHtml(category)}</td>
        <td class="text-center">${escapeHtml(region)}</td>
        <td class="text-right num-col" style="color:#059669;">${creditVal > 0 ? `+$${formatMoney(creditVal)}` : '—'}</td>
        <td class="text-right num-col" style="color:#dc2626; font-weight:600;">${debitVal > 0 ? `-$${formatMoney(debitVal)}` : '—'}</td>
        <td class="text-right num-col" style="font-weight:700;">$${formatMoney(runningBalance)}</td>
      </tr>`;
    }).join('');

    return `
    <div class="company-sheet">
      <!-- HEADER GRID -->
      <div class="sheet-header-grid">
        <div class="header-logo">
          ${logoDataUri ? `<img src="${logoDataUri}" alt="${escapeHtml(company.name)}" />` : `<span style="font-size:16px; font-weight:800; color:${brandColor};">${escapeHtml(company.name)}</span>`}
        </div>
        <div class="header-title">
          <h1 style="color:${brandColor};">${escapeHtml(company.name)} Petty Cash Expenses Sheet</h1>
          <p>Official Monthly Financial Book · ${escapeHtml(monthName)} ${year}</p>
        </div>
        <div class="account-card">
          <div class="account-label">ACCOUNT<br>eDahab</div>
          <div class="account-val" style="background:${brandLight}; color:${brandColor};">
            <span style="font-size:8px; color:${accountBrandColor}; display:block;">NO:</span>
            ${escapeHtml(accountNo)}
          </div>
        </div>
      </div>

      <!-- META CARDS BAR -->
      <div class="meta-cards-bar">
        <div class="meta-item">
          <span class="meta-item-label">Month Start</span>
          <span class="meta-item-val">${escapeHtml(startMonthStr)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-item-label">Opening Balance</span>
          <span class="meta-item-val" style="color:${brandColor};">$${formatMoney(openBal)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-item-label">Closing Balance</span>
          <span class="meta-item-val" style="color:#16a34a;">$${formatMoney(remaining || runningBalance)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-item-label">Currency</span>
          <span class="meta-item-val" style="color:#059669;">USD ($)</span>
        </div>
      </div>

      <!-- 10-COLUMN PETTY CASH TABLE -->
      <table class="petty-table">
        <thead>
          <tr style="background:${brandColor};">
            <th style="width:36px;">S/N</th>
            <th style="width:78px;">Date</th>
            <th style="width:96px;">#No</th>
            <th style="width:130px;">Payee Name#</th>
            <th>Expenses Description</th>
            <th style="width:110px;">Category</th>
            <th style="width:68px;">Region</th>
            <th style="width:92px;">Credit<br><span style="font-size:7.5px; opacity:0.85;">(Money in)</span></th>
            <th style="width:92px;">Debit<br><span style="font-size:7.5px; opacity:0.85;">(Money Out)</span></th>
            <th style="width:96px;">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${topupRowHtml}
          ${dataRowsHtml}
          <tr class="total-row">
            <td colspan="7" class="text-right" style="color:${brandColor}; font-weight:800; font-size:10px;">TOTAL EXPENDITURE</td>
            <td class="text-right num-col" style="color:#059669;">${totalCredit > 0 ? `+$${formatMoney(totalCredit)}` : '—'}</td>
            <td class="text-right num-col" style="color:#dc2626;">-$${formatMoney(totalDebit)}</td>
            <td class="text-right num-col" style="color:#16a34a; font-size:10.5px;">$${formatMoney(runningBalance)}</td>
          </tr>
        </tbody>
      </table>

      <!-- RECONCILIATION & SIGNATURES -->
      <div class="bottom-section">
        <!-- MONTHLY RECONCILIATION SUMMARY -->
        <div class="reconciliation-card">
          <div class="reconciliation-header" style="background:${brandLight}; color:${brandColor};">
            MONTHLY RECONCILIATION SUMMARY
          </div>
          <div class="reconciliation-row">
            <span>Opening Float Balance</span>
            <span class="num-col" style="font-weight:700;">$${formatMoney(openBal)}</span>
          </div>
          <div class="reconciliation-row">
            <span>Additional Float Funding (Top-Up)</span>
            <span class="num-col" style="font-weight:700; color:#059669;">+$${formatMoney(additional)}</span>
          </div>
          <div class="reconciliation-row">
            <span>Total Disbursed Expenses</span>
            <span class="num-col" style="font-weight:700; color:#dc2626;">-$${formatMoney(totalDebit)}</span>
          </div>
          <div class="reconciliation-row">
            <span>Net Available Remaining Float</span>
            <span class="num-col" style="font-weight:800; color:#16a34a;">$${formatMoney(runningBalance)}</span>
          </div>
        </div>

        <!-- 3-SIGNATURE BLOCK -->
        <div class="signatures-grid">
          <div class="sig-box">
            <div class="sig-role-label">Prepared By:</div>
            <div class="sig-name">Abshir Qasim</div>
            <div class="sig-title">Petty Cash Accountant</div>
            <div class="sig-line">Signature: __________________</div>
          </div>
          <div class="sig-box">
            <div class="sig-role-label">Verified By:</div>
            <div class="sig-name">Mohamoud Abdullahi</div>
            <div class="sig-title">Internal Auditor / Supervisor</div>
            <div class="sig-line">Signature: __________________</div>
          </div>
          <div class="sig-box">
            <div class="sig-role-label">Approved By:</div>
            <div class="sig-name">Abdijabar Jama</div>
            <div class="sig-title">DG Telecom / Head of Accounting</div>
            <div class="sig-line">Signature: __________________</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  private async buildCompanyWorksheet(
    wb: ExcelJS.Workbook,
    company: any,
    month: number,
    year: number,
    monthName: string,
  ) {
    const isSomtel = company.name.toLowerCase().includes('somtel');
    const isBluekom = company.name.toLowerCase().includes('bluekom');

    const sheetName = isSomtel
      ? 'somtel puntland petty Cash'
      : isBluekom
        ? 'Bluekom Petty Cash'
        : `${company.name} Petty Cash`;

    const ws = wb.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
      pageSetup: {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9, // A4
      },
    });

    // Column widths
    ws.columns = [
      { key: 'sn', width: 7 },
      { key: 'date', width: 15 },
      { key: 'ref', width: 18 },
      { key: 'payee', width: 32 },
      { key: 'desc', width: 44 },
      { key: 'category', width: 24 },
      { key: 'region', width: 16 },
      { key: 'credit', width: 18 },
      { key: 'debit', width: 18 },
      { key: 'balance', width: 20 },
    ];

    ws.getRow(1).height = 24;
    ws.getRow(2).height = 24;
    ws.getRow(3).height = 22;
    ws.getRow(4).height = 22;

    // Brand colors & settings
    const brandColor = isSomtel ? '0B2545' : isBluekom ? '1E40AF' : '0F172A';
    const brandLight = isSomtel ? 'FEF3C7' : isBluekom ? 'DBEAFE' : 'F1F5F9';
    const accountNo = isSomtel ? '763238' : isBluekom ? '763241' : '—';

    // Embed company logo if available
    const logoFileName = isSomtel ? 'somtel-banner.png' : 'bluekom-logo.jpeg';
    const candidatePaths = [
      path.join(process.cwd(), 'assets', 'logos', logoFileName),
      path.join(process.cwd(), 'backend', 'assets', 'logos', logoFileName),
      path.join(__dirname, '..', '..', 'assets', 'logos', logoFileName),
      path.join(__dirname, '..', '..', '..', 'assets', 'logos', logoFileName),
    ];
    const logoPath = candidatePaths.find((p) => fs.existsSync(p));

    if (logoPath) {
      try {
        const ext = logoFileName.endsWith('.png') ? 'png' : 'jpeg';
        const fileBuf = fs.readFileSync(logoPath);
        const imgId = wb.addImage({
          buffer: fileBuf as any,
          extension: ext,
        });

        if (isSomtel) {
          ws.addImage(imgId, {
            tl: { col: 0.1, row: 0.15 },
            ext: { width: 190, height: 48 },
          });
        } else {
          ws.addImage(imgId, {
            tl: { col: 0.2, row: 0.15 },
            ext: { width: 52, height: 52 },
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to embed logo for ${company.name}: ${err}`);
      }
    } else {
      this.logger.warn(`Logo not found for ${company.name} (${logoFileName})`);
    }

    // Header Title (D1:G2)
    ws.mergeCells('D1:G2');
    const titleCell = ws.getCell('D1');
    titleCell.value = `${company.name} Petty Cash Expenses Sheet`;
    titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: brandColor } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Account block (I1:J2)
    ws.getCell('I1').value = ' ACCOUNT ';
    ws.getCell('I1').font = { name: 'Segoe UI', bold: true, size: 9 };
    ws.getCell('I1').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('I1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };

    ws.getCell('J1').value = 'eDahab';
    ws.getCell('J1').font = {
      name: 'Segoe UI',
      bold: true,
      size: 10,
      color: { argb: isSomtel ? 'D97706' : '1E40AF' },
    };
    ws.getCell('J1').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell('I2').value = 'NO:';
    ws.getCell('I2').font = { name: 'Segoe UI', bold: true, size: 9 };
    ws.getCell('I2').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('I2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };

    ws.getCell('J2').value = accountNo;
    ws.getCell('J2').font = { name: 'Segoe UI', bold: true, size: 11, color: { argb: brandColor } };
    ws.getCell('J2').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('J2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandLight } };

    // Fetch fund details for this company & month
    const fund = await this.prisma.pettyCashFund.findUnique({
      where: { companyId_month_year: { companyId: company.id, month, year } },
    });

    const openBal = fund ? Number(fund.openingBalance) : 0;
    const additional = fund ? Number(fund.additionalFunding) : 0;
    const remaining = fund ? Number(fund.remainingBalance) : 0;

    // Row 3: Opening Balance
    ws.mergeCells('E3:G3');
    ws.getCell('E3').value = 'Opening Balance';
    ws.getCell('E3').font = { name: 'Segoe UI', bold: true, size: 10 };
    ws.getCell('E3').alignment = { horizontal: 'right', vertical: 'middle' };

    const h3Cell = ws.getCell('H3');
    h3Cell.value = openBal;
    h3Cell.font = { name: 'Segoe UI', bold: true, size: 11 };
    h3Cell.numFmt = '$#,##0.00';
    h3Cell.alignment = { horizontal: 'right', vertical: 'middle' };

    // Row 4: Month start & Closing Balance & Currency
    const startMonthStr = `${year}-${String(month).padStart(2, '0')}-01`;
    ws.getCell('B4').value = 'Month start';
    ws.getCell('B4').font = { name: 'Segoe UI', bold: true, size: 9, color: { argb: '64748B' } };
    ws.getCell('B4').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell('D4').value = startMonthStr;
    ws.getCell('D4').font = { name: 'Segoe UI', bold: true, size: 9 };
    ws.getCell('D4').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells('E4:G4');
    ws.getCell('E4').value = 'Closing Balance';
    ws.getCell('E4').font = { name: 'Segoe UI', bold: true, size: 10 };
    ws.getCell('E4').alignment = { horizontal: 'right', vertical: 'middle' };

    const h4Cell = ws.getCell('H4');
    h4Cell.value = remaining;
    h4Cell.font = { name: 'Segoe UI', bold: true, size: 11, color: { argb: '16A34A' } };
    h4Cell.numFmt = '$#,##0.00';
    h4Cell.alignment = { horizontal: 'right', vertical: 'middle' };

    ws.getCell('I4').value = 'Currency';
    ws.getCell('I4').font = { name: 'Segoe UI', bold: true, size: 9 };
    ws.getCell('I4').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell('J4').value = 'USD';
    ws.getCell('J4').font = { name: 'Segoe UI', bold: true, size: 10, color: { argb: '059669' } };
    ws.getCell('J4').alignment = { horizontal: 'center', vertical: 'middle' };

    // Table Header (Row 6)
    const headerRow = ws.getRow(6);
    headerRow.values = [
      'S/N',
      'Date',
      '#No',
      'Payee Name#',
      'Expenses Description',
      'Category',
      'Region',
      'Credit \n(Money in)',
      'Debit\n(Money Out)',
      'Balance',
    ];
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandColor } };
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFF' }, size: 9.5 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: '94A3B8' } },
        bottom: { style: 'thin', color: { argb: '94A3B8' } },
        left: { style: 'thin', color: { argb: '94A3B8' } },
        right: { style: 'thin', color: { argb: '94A3B8' } },
      };
    });

    // Row 7: Top-up / Allocation Row
    const topUpRow = ws.getRow(7);
    topUpRow.values = [
      '—',
      startMonthStr,
      '—',
      'Petty Cash Float',
      `${monthName} Top-Up / Float Allocation`,
      'Fund Allocation',
      'HQ',
      additional > 0 ? additional : null,
      null,
      { formula: 'H7+H3' },
    ];
    topUpRow.height = 22;
    topUpRow.font = { name: 'Segoe UI', italic: true, size: 9.5 };
    topUpRow.getCell(8).numFmt = '$#,##0.00';
    topUpRow.getCell(10).numFmt = '$#,##0.00';
    topUpRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };
    });

    // Date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch transactions (all expenses and mid-month refunds, excluding initial month top-up)
    const ledgers = await this.prisma.pettyCashLedger.findMany({
      where: {
        companyId: company.id,
        transactionType: { not: 'ALLOCATION' },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        employee: { select: { fullName: true, phone: true } },
        request: {
          include: {
            region: { select: { name: true } },
            budgetHead: { select: { name: true } },
            user: { select: { fullName: true, phone: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    let currentRow = 8;
    let sn = 1;

    for (const item of ledgers) {
      const row = ws.getRow(currentRow);
      const prevRow = currentRow - 1;
      const dateStr = item.date ? new Date(item.date).toISOString().slice(0, 10) : '';

      // Column 3 (#No): Phone number / Merchant Code / Account number
      const phoneOrAccountNo =
        item.request?.receiverPhone ||
        item.employee?.phone ||
        item.request?.user?.phone ||
        item.referenceNumber ||
        '—';

      // Column 4 (Payee Name#): Payee Name ONLY (WITHOUT phone attached)
      const payeeName =
        item.request?.receiverName ||
        item.request?.vendorName ||
        item.employee?.fullName ||
        item.request?.user?.fullName ||
        '—';

      // Description
      const desc = item.request?.purpose
        ? `${item.request.purpose}${item.request.description ? ` (${item.request.description})` : ''}`
        : item.description || '—';

      const category = item.request?.budgetHead?.name || 'General';
      const region = item.request?.region?.name || 'HQ';
      const debitVal = item.debit ? Number(item.debit) : 0;
      const creditVal = item.credit ? Number(item.credit) : null;

      row.values = [
        sn++,
        dateStr,
        phoneOrAccountNo,
        payeeName,
        desc,
        category,
        region,
        creditVal,
        debitVal,
        { formula: `J${prevRow}-I${currentRow}+${creditVal ? `H${currentRow}` : '0'}` },
      ];

      row.height = 22;
      row.font = { name: 'Segoe UI', size: 9.5 };
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };

      row.getCell(8).numFmt = '$#,##0.00';
      row.getCell(9).numFmt = '$#,##0.00';
      row.getCell(10).numFmt = '$#,##0.00';

      if (currentRow % 2 === 1) {
        row.eachCell({ includeEmpty: true }, (c) => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        });
      }

      row.eachCell({ includeEmpty: true }, (c) => {
        c.border = {
          top: { style: 'thin', color: { argb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'E2E8F0' } },
          right: { style: 'thin', color: { argb: 'E2E8F0' } },
        };
      });

      currentRow++;
    }

    const lastDataRow = currentRow - 1;

    // Total Row
    const totalRow = ws.getRow(currentRow);
    ws.mergeCells(`A${currentRow}:G${currentRow}`);
    const labelTotal = ws.getCell(`A${currentRow}`);
    labelTotal.value = 'TOTAL EXPENDITURE';
    labelTotal.font = { name: 'Segoe UI', bold: true, size: 10, color: { argb: brandColor } };
    labelTotal.alignment = { horizontal: 'right', vertical: 'middle' };

    const totalCredit = ws.getCell(`H${currentRow}`);
    totalCredit.value = { formula: `SUM(H7:H${lastDataRow})` };
    totalCredit.font = { name: 'Segoe UI', bold: true, size: 10 };
    totalCredit.numFmt = '$#,##0.00';
    totalCredit.alignment = { horizontal: 'right', vertical: 'middle' };

    const totalDebit = ws.getCell(`I${currentRow}`);
    totalDebit.value = { formula: `SUM(I7:I${lastDataRow})` };
    totalDebit.font = { name: 'Segoe UI', bold: true, size: 10, color: { argb: 'DC2626' } };
    totalDebit.numFmt = '$#,##0.00';
    totalDebit.alignment = { horizontal: 'right', vertical: 'middle' };

    const finalBalance = ws.getCell(`J${currentRow}`);
    finalBalance.value = { formula: `J${lastDataRow}` };
    finalBalance.font = { name: 'Segoe UI', bold: true, size: 11, color: { argb: '16A34A' } };
    finalBalance.numFmt = '$#,##0.00';
    finalBalance.alignment = { horizontal: 'right', vertical: 'middle' };

    totalRow.height = 26;
    totalRow.eachCell({ includeEmpty: true }, (c) => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      c.border = {
        top: { style: 'thin', color: { argb: '94A3B8' } },
        bottom: { style: 'double', color: { argb: '475569' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } },
      };
    });

    // Reconciliation Summary Block
    const rStart = currentRow + 3;
    ws.mergeCells(`D${rStart}:G${rStart}`);
    const summaryHeader = ws.getCell(`D${rStart}`);
    summaryHeader.value = 'MONTHLY RECONCILIATION SUMMARY';
    summaryHeader.font = { name: 'Segoe UI', bold: true, size: 10, color: { argb: brandColor } };
    summaryHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandLight } };

    const reconItems = [
      { label: 'Opening Float Balance', val: openBal },
      { label: 'Additional Float Funding (Top-Up)', val: additional },
      { label: 'Total Disbursed Expenses', formula: `I${currentRow}` },
      { label: 'Net Available Remaining Float', formula: `J${currentRow}` },
    ];

    reconItems.forEach((item, idx) => {
      const r = rStart + 1 + idx;
      ws.mergeCells(`D${r}:F${r}`);
      const lCell = ws.getCell(`D${r}`);
      lCell.value = item.label;
      lCell.font = { name: 'Segoe UI', size: 9.5, bold: idx === 3 };
      lCell.alignment = { horizontal: 'left', vertical: 'middle' };

      const vCell = ws.getCell(`G${r}`);
      if (item.formula) {
        vCell.value = { formula: item.formula };
      } else {
        vCell.value = item.val;
      }
      vCell.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: { argb: idx === 3 ? '16A34A' : idx === 2 ? 'DC2626' : '1E293B' },
      };
      vCell.numFmt = '$#,##0.00';
      vCell.alignment = { horizontal: 'right', vertical: 'middle' };

      [ws.getCell(`D${r}`), ws.getCell(`E${r}`), ws.getCell(`F${r}`), ws.getCell(`G${r}`)].forEach((c) => {
        c.border = {
          top: { style: 'thin', color: { argb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'E2E8F0' } },
          right: { style: 'thin', color: { argb: 'E2E8F0' } },
        };
      });
    });

    // Formal Sign-off Section (Official 3-Signature Block from Artifact)
    const sigRow = rStart + 5;

    // Prepared By: Abshir Qasim (Accountant)
    ws.getCell(`B${sigRow}`).value = 'Prepared By:';
    ws.getCell(`B${sigRow}`).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: '64748B' } };
    ws.getCell(`B${sigRow + 1}`).value = 'Abshir Qasim';
    ws.getCell(`B${sigRow + 1}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '1E293B' } };
    ws.getCell(`B${sigRow + 2}`).value = 'Petty Cash Accountant';
    ws.getCell(`B${sigRow + 2}`).font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: '64748B' } };
    ws.getCell(`B${sigRow + 3}`).value = 'Signature: ______________________';
    ws.getCell(`B${sigRow + 3}`).font = { name: 'Segoe UI', size: 8.5, color: { argb: '94A3B8' } };

    // Verified By: Mohamoud Abdullahi (Internal Auditor / Supervisor)
    ws.getCell(`E${sigRow}`).value = 'Verified By:';
    ws.getCell(`E${sigRow}`).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: '64748B' } };
    ws.getCell(`E${sigRow + 1}`).value = 'Mohamoud Abdullahi';
    ws.getCell(`E${sigRow + 1}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '1E293B' } };
    ws.getCell(`E${sigRow + 2}`).value = 'Internal Auditor / Supervisor';
    ws.getCell(`E${sigRow + 2}`).font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: '64748B' } };
    ws.getCell(`E${sigRow + 3}`).value = 'Signature: ______________________';
    ws.getCell(`E${sigRow + 3}`).font = { name: 'Segoe UI', size: 8.5, color: { argb: '94A3B8' } };

    // Approved By: Abdijabar Jama (DG Telecom / Head of Accounting)
    ws.getCell(`H${sigRow}`).value = 'Approved By:';
    ws.getCell(`H${sigRow}`).font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: '64748B' } };
    ws.getCell(`H${sigRow + 1}`).value = 'Abdijabar Jama';
    ws.getCell(`H${sigRow + 1}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '1E293B' } };
    ws.getCell(`H${sigRow + 2}`).value = 'DG Telecom / Head of Accounting';
    ws.getCell(`H${sigRow + 2}`).font = { name: 'Segoe UI', size: 8.5, italic: true, color: { argb: '64748B' } };
    ws.getCell(`H${sigRow + 3}`).value = 'Signature: ______________________';
    ws.getCell(`H${sigRow + 3}`).font = { name: 'Segoe UI', size: 8.5, color: { argb: '94A3B8' } };
  }
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0.00';
  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

