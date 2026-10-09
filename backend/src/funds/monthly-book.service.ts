import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MonthlyBookService {
  private readonly logger = new Logger(MonthlyBookService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      companies = await this.prisma.company.findMany({ orderBy: { name: 'asc' } });
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
      { key: 'date', width: 14 },
      { key: 'ref', width: 17 },
      { key: 'payee', width: 30 },
      { key: 'desc', width: 42 },
      { key: 'category', width: 24 },
      { key: 'region', width: 16 },
      { key: 'credit', width: 18 },
      { key: 'debit', width: 18 },
      { key: 'balance', width: 18 },
    ];

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

    // Fetch transactions
    const ledgers = await this.prisma.pettyCashLedger.findMany({
      where: {
        companyId: company.id,
        transactionType: 'PAYMENT',
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
            user: { select: { fullName: true } },
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

      // Invoice number or ref
      const invoiceNo = item.referenceNumber || item.request?.invoiceNumber || item.request?.requestNumber || '—';

      // Payee name
      const payeeName = item.request?.receiverName
        ? `${item.request.receiverName}${item.request.receiverPhone ? ` (${item.request.receiverPhone})` : ''}`
        : item.request?.vendorName || item.employee?.fullName || '—';

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
        invoiceNo,
        payeeName,
        desc,
        category,
        region,
        creditVal,
        debitVal,
        { formula: `J${prevRow}-I${currentRow}+${creditVal ? `H${currentRow}` : '0'}` },
      ];

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

    totalRow.height = 24;
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

    // Formal Sign-off Section
    const sigRow = rStart + 6;
    ws.getCell(`B${sigRow}`).value = 'Prepared By: ___________________________';
    ws.getCell(`B${sigRow}`).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '475569' } };
    ws.getCell(`B${sigRow + 1}`).value = 'Petty Cash Accountant';
    ws.getCell(`B${sigRow + 1}`).font = { name: 'Segoe UI', size: 8, italic: true, color: { argb: '64748B' } };

    ws.getCell(`E${sigRow}`).value = 'Verified By: ___________________________';
    ws.getCell(`E${sigRow}`).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '475569' } };
    ws.getCell(`E${sigRow + 1}`).value = 'Internal Audit / Finance Controller';
    ws.getCell(`E${sigRow + 1}`).font = { name: 'Segoe UI', size: 8, italic: true, color: { argb: '64748B' } };

    ws.getCell(`H${sigRow}`).value = 'Approved By: ___________________________';
    ws.getCell(`H${sigRow}`).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '475569' } };
    ws.getCell(`H${sigRow + 1}`).value = 'Chief Financial Officer (CFO)';
    ws.getCell(`H${sigRow + 1}`).font = { name: 'Segoe UI', size: 8, italic: true, color: { argb: '64748B' } };
  }
}
