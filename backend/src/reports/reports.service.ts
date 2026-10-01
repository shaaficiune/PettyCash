import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestStatus, RoleName } from '@prisma/client';

const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char] as string));

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(user: any, companyId?: string) {
    const where: any = {};

    // Enforce data isolation: Employees only see their own stats
    if (user.role === RoleName.EMPLOYEE) {
      where.userId = user.userId;
    } else {
      if (companyId) {
        where.companyId = companyId;
      }
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const monthWhere = {
      ...where,
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    };

    // Parallel request count queries for current month
    const [
      totalCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      paidCount,
      completedCount,
      correctionCount,
      requests,
    ] = await Promise.all([
      this.prisma.pettyCashRequest.count({ where: monthWhere }),
      this.prisma.pettyCashRequest.count({ where: { ...monthWhere, status: RequestStatus.PENDING_APPROVAL } }),
      this.prisma.pettyCashRequest.count({ where: { ...monthWhere, status: RequestStatus.APPROVED } }),
      this.prisma.pettyCashRequest.count({ where: { ...monthWhere, status: RequestStatus.REJECTED } }),
      this.prisma.pettyCashRequest.count({ where: { ...monthWhere, status: RequestStatus.PAID } }),
      this.prisma.pettyCashRequest.count({ where: { ...monthWhere, status: RequestStatus.COMPLETED } }),
      this.prisma.pettyCashRequest.count({ where: { ...monthWhere, status: RequestStatus.CORRECTION_REQUIRED } }),
      this.prisma.pettyCashRequest.findMany({
        where: monthWhere,
        select: { requestedAmount: true, approvedAmount: true, status: true },
      }),
    ]);

    // Calculate amount sums
    let totalRequestedVal = 0;
    let totalApprovedVal = 0;
    requests.forEach(r => {
      totalRequestedVal += Number(r.requestedAmount || 0);
      if (
        r.status === RequestStatus.APPROVED ||
        r.status === RequestStatus.PAID ||
        r.status === RequestStatus.COMPLETED
      ) {
        totalApprovedVal += Number(r.approvedAmount || r.requestedAmount || 0);
      }
    });

    // Fund balances — only for Admin/Accountant, broken down per company
    let fundSummary: any = null;
    if (user.role !== RoleName.EMPLOYEE) {
      // Fetch all companies
      const companies = await this.prisma.company.findMany({ orderBy: { name: 'asc' } });

      // Fetch all current-month funds
      const allFunds = await (this.prisma as any).pettyCashFund.findMany({
        where: { month: currentMonth, year: currentYear },
        include: { company: { select: { id: true, name: true } } },
      });

      // Compute start and end of current month for live approval aggregates
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

      // Build per-company lookup
      const fundMap: Record<string, any> = {};
      for (const f of allFunds) {
        // Aggregate approved amounts for this company & month live
        const approvedAgg = await (this.prisma as any).pettyCashRequest.aggregate({
          where: {
            companyId: f.companyId,
            status: { in: ['APPROVED', 'PAYMENT_PROCESSING', 'PAID', 'COMPLETED'] },
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { approvedAmount: true },
        });
        const liveApproved = Number(approvedAgg._sum.approvedAmount || 0);
        const allocated = Number(f.totalAvailable || 0);
        const remaining = Math.max(0, allocated - liveApproved);

        fundMap[f.companyId] = {
          ...f,
          totalAvailable: allocated,
          approvedAmount: liveApproved,
          remainingBalance: remaining,
        };
      }

      // Aggregate totals — balance = remainingBalance (after approved deductions)
      let totalBalance = 0;
      let totalAllocated = 0;
      const perCompany: Array<{
        id: string; name: string;
        balance: number;      // remainingBalance — what's left
        allocated: number;    // totalAvailable — initial fund
      }> = [];

      for (const c of companies) {
        const f = fundMap[c.id];
        const remaining = f ? Number(f.remainingBalance || 0) : 0;
        const allocated = f ? Number(f.totalAvailable || 0) : 0;
        totalBalance += remaining;
        totalAllocated += allocated;
        perCompany.push({ id: c.id, name: c.name, balance: remaining, allocated });
      }

      // If filtering by a single company
      if (companyId) {
        const f = fundMap[companyId];
        fundSummary = {
          totalBalance: f ? Number(f.remainingBalance || 0) : 0,
          totalAllocated: f ? Number(f.totalAvailable || 0) : 0,
          perCompany: perCompany.filter(c => c.id === companyId),
        };
      } else {
        fundSummary = { totalBalance, totalAllocated, perCompany };
      }

      // Carry-forward: if no fund has been allocated for the current month yet,
      // surface the previous month's remaining balance so the dashboard stays informative.
      let prevMonthCarryForward: any = null;
      if (fundSummary.totalBalance === 0 && fundSummary.totalAllocated === 0) {
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        const prevFunds = await (this.prisma as any).pettyCashFund.findMany({
          where: { month: prevMonth, year: prevYear },
          include: { company: { select: { id: true, name: true } } },
        });
        const prevPerCompany: Array<{ id: string; name: string; balance: number; allocated: number; status: string }> = [];
        let prevTotal = 0;
        for (const c of companies) {
          const pf = prevFunds.find((f: any) => f.companyId === c.id);
          const bal = pf ? Number(pf.closingBalance ?? pf.remainingBalance ?? 0) : 0;
          if (bal > 0) {
            prevPerCompany.push({
              id: c.id,
              name: c.name,
              balance: bal,
              allocated: Number(pf?.totalAvailable || 0),
              status: pf?.status || 'OPEN',
            });
            prevTotal += bal;
          }
        }
        if (prevTotal > 0) {
          prevMonthCarryForward = {
            month: prevMonth,
            year: prevYear,
            totalBalance: prevTotal,
            perCompany: prevPerCompany,
          };
        }
      }
      // Attach to fundSummary so it is returned in one cohesive funds payload
      if (fundSummary) fundSummary.prevMonthCarryForward = prevMonthCarryForward;

    }

    return {
      counts: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        paid: paidCount,
        completed: completedCount,
        correctionRequired: correctionCount,
      },
      amounts: {
        totalRequested: totalRequestedVal,
        totalApproved: totalApprovedVal,
      },
      funds: fundSummary,
      period: { month: currentMonth, year: currentYear },
    };
  }

  async getPendingRequests(companyId?: string) {
    const where: any = { status: RequestStatus.PENDING_APPROVAL };
    if (companyId) where.companyId = companyId;

    return this.prisma.pettyCashRequest.findMany({
      where,
      include: {
        user: { select: { fullName: true, phone: true } },
        company: { select: { name: true } },
        region: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
  }

  async getExpenseBreakdowns(user: any, companyId?: string, period: string = 'monthly') {
    const where: any = {};

    if (user.role === RoleName.EMPLOYEE) {
      where.userId = user.userId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    // Only include disbursed or completed requests for actual spends
    where.status = { in: [RequestStatus.PAID, RequestStatus.COMPLETED] };

    const requests = await this.prisma.pettyCashRequest.findMany({
      where,
      include: {
        region: { select: { name: true } },
        company: { select: { name: true } },
        user: { select: { fullName: true } },
      },
    });

    const regionBreakdown: Record<string, number> = {};
    const companyBreakdown: Record<string, number> = {};
    const employeeBreakdown: Record<string, number> = {};

    requests.forEach(r => {
      const amount = Number(r.approvedAmount || r.requestedAmount || 0);
      const regName = r.region?.name || 'Unassigned';
      regionBreakdown[regName] = (regionBreakdown[regName] || 0) + amount;
      const compName = r.company.name;
      companyBreakdown[compName] = (companyBreakdown[compName] || 0) + amount;
      const empName = r.user.fullName;
      employeeBreakdown[empName] = (employeeBreakdown[empName] || 0) + amount;
    });

    return {
      region: Object.entries(regionBreakdown).map(([name, value]) => ({ name, value })),
      company: Object.entries(companyBreakdown).map(([name, value]) => ({ name, value })),
      employee: Object.entries(employeeBreakdown).map(([name, value]) => ({ name, value })),
    };
  }

  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: {
        user: { select: { fullName: true, username: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  generateCSV(data: any[], headers: string[]): string {
    const headerRow = headers.join(',');
    const rows = data.map(item => {
      return headers.map(header => {
        const val = item[header];
        if (val === undefined || val === null) return '';
        const valStr = String(val).replace(/"/g, '""');
        return `"${valStr}"`;
      }).join(',');
    });
    return [headerRow, ...rows].join('\n');
  }

  private buildExportWhere(
    user: any,
    companyId?: string,
    regionId?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    budgetHeadId?: string,
    search?: string
  ) {
    const where: any = {};
    if (user.role === RoleName.EMPLOYEE) {
      where.userId = user.userId;
      where.companyId = user.companyId;
    } else if (companyId && companyId !== 'ALL') {
      where.companyId = companyId;
    }

    if (regionId && regionId !== 'ALL') where.regionId = regionId;
    if (budgetHeadId && budgetHeadId !== 'ALL') where.budgetHeadId = budgetHeadId;

    if (status && status !== 'ALL') {
      if (status === 'PAID_ONLY') {
        where.status = { in: [RequestStatus.PAID, RequestStatus.COMPLETED] };
      } else if (status === 'APPROVED_AND_PAID') {
        where.status = { in: [RequestStatus.APPROVED, RequestStatus.PAYMENT_PROCESSING, RequestStatus.PAID, RequestStatus.COMPLETED] };
      } else {
        where.status = status;
      }
    }

    if (startDate || endDate) {
      where.requestDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.requestDate.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.requestDate.lte = end;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { requestNumber: { contains: q, mode: 'insensitive' } },
        { purpose: { contains: q, mode: 'insensitive' } },
        { receiverName: { contains: q, mode: 'insensitive' } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  async getRequestsTableReport(
    user: any,
    companyId?: string,
    regionId?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    budgetHeadId?: string,
    search?: string,
    page: number = 1,
    pageSize: number = 25
  ) {
    const where = this.buildExportWhere(user, companyId, regionId, startDate, endDate, status, budgetHeadId, search);

    const allFiltered = await this.prisma.pettyCashRequest.findMany({
      where,
      select: {
        requestedAmount: true,
        approvedAmount: true,
        status: true,
        company: { select: { name: true } },
      },
    });

    let totalRequested = 0;
    let totalDisbursed = 0;
    let somtelSpent = 0;
    let bluekomSpent = 0;
    let paidCount = 0;
    let pendingCount = 0;

    allFiltered.forEach((r) => {
      const reqAmt = Number(r.requestedAmount || 0);
      const appAmt = Number(r.approvedAmount || 0);
      totalRequested += reqAmt;
      const isPaid = r.status === RequestStatus.PAID || r.status === RequestStatus.COMPLETED;
      const amountUsed = isPaid ? (appAmt || reqAmt) : appAmt;
      if (isPaid) {
        totalDisbursed += amountUsed;
        paidCount++;
        const cName = r.company?.name?.toLowerCase() || '';
        if (cName.includes('somtel')) {
          somtelSpent += amountUsed;
        } else {
          bluekomSpent += amountUsed;
        }
      }
      if (r.status === RequestStatus.PENDING_APPROVAL || r.status === RequestStatus.ACCOUNTANT_REVIEW) {
        pendingCount++;
      }
    });

    const totalCount = allFiltered.length;
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, Math.min(100, pageSize));
    const skip = (safePage - 1) * safePageSize;

    const items = await this.prisma.pettyCashRequest.findMany({
      where,
      include: {
        user: { select: { fullName: true, username: true } },
        company: { select: { id: true, name: true } },
        region: { select: { id: true, name: true, monthlyBudget: true } },
        budgetHead: { select: { id: true, name: true, code: true } },
      },
      orderBy: { requestDate: 'desc' },
      skip,
      take: safePageSize,
    });

    return {
      summary: {
        totalCount,
        totalRequested: Number(totalRequested.toFixed(2)),
        totalDisbursed: Number(totalDisbursed.toFixed(2)),
        somtelSpent: Number(somtelSpent.toFixed(2)),
        bluekomSpent: Number(bluekomSpent.toFixed(2)),
        paidCount,
        pendingCount,
      },
      total: totalCount,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(totalCount / safePageSize) || 1,
      items: items.map((item) => ({
        id: item.id,
        requestNumber: item.requestNumber,
        requestDate: item.requestDate,
        purpose: item.purpose,
        employeeName: item.user?.fullName || 'Unknown',
        receiverName: item.receiverName,
        companyName: item.company?.name || '-',
        regionName: item.region?.name || '-',
        budgetHeadName: item.budgetHead?.name || item.requestType || '-',
        budgetHeadCode: item.budgetHead?.code || '',
        requestedAmount: Number(item.requestedAmount),
        approvedAmount: item.approvedAmount ? Number(item.approvedAmount) : null,
        currency: item.currency,
        status: item.status,
      })),
    };
  }

  async exportRequestsExcel(
    user: any,
    companyId?: string,
    regionId?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    budgetHeadId?: string,
    search?: string
  ): Promise<string> {
    const where = this.buildExportWhere(user, companyId, regionId, startDate, endDate, status, budgetHeadId, search);

    const requests = await this.prisma.pettyCashRequest.findMany({
      where,
      include: {
        user: { select: { fullName: true, phone: true } },
        company: { select: { name: true } },
        region: { select: { name: true } },
        budgetHead: { select: { name: true, code: true } },
      },
      orderBy: { requestDate: 'desc' },
    });

    // Native Excel-compatible XML format with full styling
    const rows = requests.map(r => `
      <Row>
        <Cell><Data ss:Type="String">${escapeHtml(r.requestNumber)}</Data></Cell>
        <Cell><Data ss:Type="String">${r.requestDate.toISOString().slice(0, 10)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(r.user.fullName)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(r.receiverName || '-')}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(r.receiverPhone || '-')}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(r.company.name)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(r.region?.name || '-')}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(r.budgetHead ? `${r.budgetHead.code} - ${r.budgetHead.name}` : (r.requestType || '-'))}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(r.purpose)}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.requestedAmount}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.approvedAmount || 0}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(r.currency)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(r.status)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(r.priority)}</Data></Cell>
      </Row>`).join('');

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0B3333" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="PettyCashRequests">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Request #</Data></Cell>
    <Cell><Data ss:Type="String">Date</Data></Cell>
    <Cell><Data ss:Type="String">Employee</Data></Cell>
    <Cell><Data ss:Type="String">Receiver</Data></Cell>
    <Cell><Data ss:Type="String">Receiver Phone</Data></Cell>
    <Cell><Data ss:Type="String">Company</Data></Cell>
    <Cell><Data ss:Type="String">Region</Data></Cell>
    <Cell><Data ss:Type="String">Category</Data></Cell>
    <Cell><Data ss:Type="String">Purpose</Data></Cell>
    <Cell><Data ss:Type="String">Requested</Data></Cell>
    <Cell><Data ss:Type="String">Approved</Data></Cell>
    <Cell><Data ss:Type="String">Currency</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
    <Cell><Data ss:Type="String">Priority</Data></Cell>
   </Row>
   ${rows}
  </Table>
 </Worksheet>
</Workbook>`;
  }

  async exportRequestsPdfHtml(
    user: any,
    companyId?: string,
    regionId?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    budgetHeadId?: string,
    search?: string
  ): Promise<string> {
    const where = this.buildExportWhere(user, companyId, regionId, startDate, endDate, status, budgetHeadId, search);

    const requests = await this.prisma.pettyCashRequest.findMany({
      where,
      include: {
        user: { select: { fullName: true, phone: true } },
        company: { select: { name: true } },
        region: { select: { name: true } },
        budgetHead: { select: { name: true, code: true } },
      },
      orderBy: { requestDate: 'desc' },
    });

    const rows = requests.map(r => `
      <tr>
        <td style="font-weight:600; color:#0B3333;">${escapeHtml(r.requestNumber)}</td>
        <td>${r.requestDate.toISOString().slice(0, 10)}</td>
        <td>${escapeHtml(r.user.fullName)}</td>
        <td>${escapeHtml(r.receiverName ? `${r.receiverName}${r.receiverPhone ? ` (${r.receiverPhone})` : ''}` : '-')}</td>
        <td>${escapeHtml(r.region?.name || '-')}</td>
        <td>${escapeHtml(r.budgetHead ? r.budgetHead.name : r.requestType)}</td>
        <td style="max-width:200px; word-break:break-word;">${escapeHtml(r.purpose)}</td>
        <td style="text-align:right; font-weight:600;">$${Number(r.requestedAmount).toFixed(2)}</td>
        <td style="text-align:right;">${r.approvedAmount ? `$${Number(r.approvedAmount).toFixed(2)}` : '-'}</td>
        <td><span class="badge badge-${escapeHtml(r.status.toLowerCase())}">${escapeHtml(r.status.replace(/_/g, ' '))}</span></td>
      </tr>
    `).join('');

    const totalRequested = requests.reduce((acc, r) => acc + Number(r.requestedAmount), 0);
    const totalApproved = requests.reduce((acc, r) => acc + Number(r.approvedAmount || 0), 0);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Petty Cash Requests Report</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 15px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0B3333; padding-bottom: 10px; margin-bottom: 15px; }
    .title { font-size: 20px; font-weight: bold; color: #0B3333; }
    .meta { font-size: 11px; color: #64748b; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background-color: #0B3333; color: #ffffff; padding: 7px 6px; text-align: left; font-size: 10px; text-transform: uppercase; }
    td { padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase; }
    .badge-approved { background-color: #dcfce7; color: #15803d; }
    .badge-pending_approval { background-color: #fef3c7; color: #b45309; }
    .badge-accountant_review { background-color: #e0e7ff; color: #4338ca; }
    .badge-paid { background-color: #d1fae5; color: #047857; }
    .badge-rejected { background-color: #fee2e2; color: #b91c1c; }
    .badge-correction_required { background-color: #ffedd5; color: #c2410c; }
    .badge-draft { background-color: #f1f5f9; color: #475569; }
    .summary { margin-top: 15px; display: flex; justify-content: flex-end; gap: 20px; font-size: 12px; font-weight: bold; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 12px; display: flex; gap: 8px;">
    <button onclick="window.print()" style="padding: 6px 14px; background: #E8A020; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
      🖨️ Print / Save as PDF
    </button>
  </div>
  <div class="header">
    <div>
      <div class="title">Petty Cash Requests Report</div>
      <div style="color: #64748b; font-size: 11px;">Somtel & Bluekom Integrated Financial System</div>
    </div>
    <div class="meta">
      <div>Generated on: ${new Date().toLocaleString()}</div>
      <div>Total Records: ${requests.length}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Request #</th>
        <th>Date</th>
        <th>Employee</th>
        <th>Receiver / Merchant</th>
        <th>Region</th>
        <th>Category</th>
        <th>Purpose</th>
        <th style="text-align:right;">Requested</th>
        <th style="text-align:right;">Approved</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="summary">
    <div>Total Requested: $${totalRequested.toFixed(2)}</div>
    <div>Total Approved: $${totalApproved.toFixed(2)}</div>
  </div>
</body>
</html>`;
  }

  async getBudgetHeadReport(
    user: any,
    companyId?: string,
    startDate?: string,
    endDate?: string,
    statusScope: string = 'PAID_ONLY'
  ) {
    const companies = await this.prisma.company.findMany({
      where: companyId ? { id: companyId } : {},
      orderBy: { name: 'asc' },
    });

    const budgetHeads = await this.prisma.budgetHead.findMany({
      where: companyId ? { companyId } : {},
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });

    const where: any = {};
    if (user.role === RoleName.EMPLOYEE) {
      where.userId = user.userId;
      where.companyId = user.companyId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    if (statusScope === 'APPROVED_AND_PAID') {
      where.status = {
        in: [
          RequestStatus.APPROVED,
          RequestStatus.PAYMENT_PROCESSING,
          RequestStatus.PAID,
          RequestStatus.COMPLETED,
        ],
      };
    } else {
      where.status = { in: [RequestStatus.PAID, RequestStatus.COMPLETED] };
    }

    if (startDate || endDate) {
      where.requestDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.requestDate.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.requestDate.lte = end;
      }
    }

    const requests = await this.prisma.pettyCashRequest.findMany({
      where,
      select: {
        id: true,
        requestNumber: true,
        purpose: true,
        requestedAmount: true,
        approvedAmount: true,
        status: true,
        requestDate: true,
        companyId: true,
        budgetHeadId: true,
        user: { select: { fullName: true } },
        receiverName: true,
        receiverPhone: true,
      },
    });

    const categoryMap: Record<
      string,
      {
        categoryName: string;
        somtelSpent: number;
        somtelCount: number;
        somtelBudget: number;
        bluekomSpent: number;
        bluekomCount: number;
        bluekomBudget: number;
        otherSpent: number;
        otherBudget: number;
        totalBudget: number;
        requests: any[];
      }
    > = {};

    budgetHeads.forEach((bh) => {
      const cat = bh.name.trim();
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          categoryName: cat,
          somtelSpent: 0,
          somtelCount: 0,
          somtelBudget: 0,
          bluekomSpent: 0,
          bluekomCount: 0,
          bluekomBudget: 0,
          otherSpent: 0,
          otherBudget: 0,
          totalBudget: 0,
          requests: [],
        };
      }
      const limit = Number(bh.monthlyLimit || 0);
      categoryMap[cat].totalBudget += limit;
      if (bh.company.name.toLowerCase().includes('somtel')) {
        categoryMap[cat].somtelBudget += limit;
      } else if (bh.company.name.toLowerCase().includes('bluekom')) {
        categoryMap[cat].bluekomBudget += limit;
      } else {
        categoryMap[cat].otherBudget += limit;
      }
    });

    const budgetHeadById: Record<string, any> = {};
    budgetHeads.forEach((bh) => {
      budgetHeadById[bh.id] = bh;
    });

    let grandSomtel = 0;
    let grandBluekom = 0;
    let grandOther = 0;

    requests.forEach((req) => {
      const bh = req.budgetHeadId ? budgetHeadById[req.budgetHeadId] : null;
      const cat = bh ? bh.name.trim() : 'Miscellaneous expenses';
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          categoryName: cat,
          somtelSpent: 0,
          somtelCount: 0,
          somtelBudget: 0,
          bluekomSpent: 0,
          bluekomCount: 0,
          bluekomBudget: 0,
          otherSpent: 0,
          otherBudget: 0,
          totalBudget: 0,
          requests: [],
        };
      }

      const amount = Number(req.approvedAmount || req.requestedAmount || 0);
      const comp = companies.find((c) => c.id === req.companyId);
      const isSomtel = comp?.name.toLowerCase().includes('somtel');
      const isBluekom = comp?.name.toLowerCase().includes('bluekom');

      if (isSomtel) {
        categoryMap[cat].somtelSpent += amount;
        categoryMap[cat].somtelCount += 1;
        grandSomtel += amount;
      } else if (isBluekom) {
        categoryMap[cat].bluekomSpent += amount;
        categoryMap[cat].bluekomCount += 1;
        grandBluekom += amount;
      } else {
        categoryMap[cat].otherSpent += amount;
        grandOther += amount;
      }

      categoryMap[cat].requests.push({
        id: req.id,
        requestNumber: req.requestNumber,
        purpose: req.purpose,
        amount,
        status: req.status,
        date: req.requestDate,
        employee: req.user?.fullName,
        receiver: req.receiverName || req.receiverPhone,
        companyName: comp?.name || 'N/A',
      });
    });

    const categories = Object.values(categoryMap).map((c) => {
      const totalSpent = c.somtelSpent + c.bluekomSpent + c.otherSpent;
      const remaining = Math.max(0, c.totalBudget - totalSpent);
      const pct = c.totalBudget > 0 ? (totalSpent / c.totalBudget) * 100 : 0;
      let status: 'SAFE' | 'WARNING' | 'EXCEEDED' = 'SAFE';
      if (pct >= 100) status = 'EXCEEDED';
      else if (pct >= 80) status = 'WARNING';

      return {
        categoryName: c.categoryName,
        somtelSpent: Number(c.somtelSpent.toFixed(2)),
        somtelCount: c.somtelCount,
        somtelBudget: Number(c.somtelBudget.toFixed(2)),
        bluekomSpent: Number(c.bluekomSpent.toFixed(2)),
        bluekomCount: c.bluekomCount,
        bluekomBudget: Number(c.bluekomBudget.toFixed(2)),
        totalSpent: Number(totalSpent.toFixed(2)),
        totalBudget: Number(c.totalBudget.toFixed(2)),
        remainingBudget: Number(remaining.toFixed(2)),
        percentageUsed: Number(pct.toFixed(1)),
        status,
        requestsCount: c.requests.length,
        requests: c.requests,
      };
    });

    const totalBudget = categories.reduce((sum, c) => sum + c.totalBudget, 0);
    const grandTotalSpent = grandSomtel + grandBluekom + grandOther;
    const remainingBudget = Math.max(0, totalBudget - grandTotalSpent);
    const percentageUsed = totalBudget > 0 ? (grandTotalSpent / totalBudget) * 100 : 0;

    return {
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
        statusScope,
      },
      summary: {
        totalBudget: Number(totalBudget.toFixed(2)),
        somtelSpent: Number(grandSomtel.toFixed(2)),
        bluekomSpent: Number(grandBluekom.toFixed(2)),
        grandTotalSpent: Number(grandTotalSpent.toFixed(2)),
        remainingBudget: Number(remainingBudget.toFixed(2)),
        percentageUsed: Number(percentageUsed.toFixed(1)),
      },
      categories,
    };
  }

  async exportBudgetHeadsExcel(
    user: any,
    companyId?: string,
    startDate?: string,
    endDate?: string,
    statusScope: string = 'PAID_ONLY'
  ): Promise<string> {
    const data = await this.getBudgetHeadReport(user, companyId, startDate, endDate, statusScope);

    const rows = data.categories
      .map(
        (c) => `
      <tr>
        <td style="font-weight:bold; border:1px solid #cbd5e1; padding:8px;">${c.categoryName}</td>
        <td style="text-align:right; border:1px solid #cbd5e1; padding:8px; color:#c2410c;">$${c.somtelSpent.toFixed(2)}</td>
        <td style="text-align:right; border:1px solid #cbd5e1; padding:8px; color:#1d4ed8;">$${c.bluekomSpent.toFixed(2)}</td>
        <td style="text-align:right; font-weight:bold; border:1px solid #cbd5e1; padding:8px;">$${c.totalSpent.toFixed(2)}</td>
        <td style="text-align:right; border:1px solid #cbd5e1; padding:8px; color:#64748b;">$${c.totalBudget.toFixed(2)}</td>
        <td style="text-align:right; border:1px solid #cbd5e1; padding:8px;">$${c.remainingBudget.toFixed(2)}</td>
        <td style="text-align:center; border:1px solid #cbd5e1; padding:8px;">${c.percentageUsed}%</td>
        <td style="text-align:center; border:1px solid #cbd5e1; padding:8px;">${c.status}</td>
      </tr>`
      )
      .join('');

    return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Calibri, sans-serif; font-size: 11pt; }
    th { background-color: #0a2e2e; color: #ffffff; padding: 10px; font-weight: bold; }
    .header { font-size: 16pt; font-weight: bold; color: #0a2e2e; }
    .subheader { font-size: 10pt; color: #64748b; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="header">Petty Cash Budget Head Expenditure Report</div>
  <div class="subheader">Somtel &amp; Bluekom Integrated Financial System | Generated: ${new Date().toLocaleString()}</div>
  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%;">
    <thead>
      <tr>
        <th>Budget Head Category</th>
        <th style="background-color:#c2410c;">Somtel Spent (USD)</th>
        <th style="background-color:#1d4ed8;">Bluekom Spent (USD)</th>
        <th style="background-color:#0f766e;">Combined Total (USD)</th>
        <th>Budget Limit (USD)</th>
        <th>Remaining Budget</th>
        <th>% Utilized</th>
        <th>Health</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="background-color:#f1f5f9; font-weight:bold;">
        <td style="padding:10px;">GRAND TOTAL</td>
        <td style="text-align:right; padding:10px; color:#c2410c;">$${data.summary.somtelSpent.toFixed(2)}</td>
        <td style="text-align:right; padding:10px; color:#1d4ed8;">$${data.summary.bluekomSpent.toFixed(2)}</td>
        <td style="text-align:right; padding:10px; color:#0f766e;">$${data.summary.grandTotalSpent.toFixed(2)}</td>
        <td style="text-align:right; padding:10px;">$${data.summary.totalBudget.toFixed(2)}</td>
        <td style="text-align:right; padding:10px;">$${data.summary.remainingBudget.toFixed(2)}</td>
        <td style="text-align:center; padding:10px;">${data.summary.percentageUsed}%</td>
        <td style="text-align:center; padding:10px;">-</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Region × Budget Head Matrix Report
  // Budget cap = Region.monthlyBudget (the enforced regional limit)
  // ─────────────────────────────────────────────────────────────────────────
  async getRegionBudgetHeadReport(
    user: any,
    companyId?: string,
    regionId?: string,
    startDate?: string,
    endDate?: string,
    statusScope: string = 'PAID_ONLY'
  ) {
    // Build region filter
    const regionWhere: any = {};
    if (user.role === RoleName.EMPLOYEE) {
      regionWhere.companyId = user.companyId;
    } else if (companyId) {
      regionWhere.companyId = companyId;
    }
    if (regionId) regionWhere.id = regionId;

    const regions = await this.prisma.region.findMany({
      where: { ...regionWhere, status: 'ACTIVE' },
      include: { company: { select: { id: true, name: true } } },
      orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }],
    });

    // Budget heads (all unique names across visible companies)
    const bhWhere: any = {};
    if (user.role === RoleName.EMPLOYEE) bhWhere.companyId = user.companyId;
    else if (companyId) bhWhere.companyId = companyId;

    const allBudgetHeads = await this.prisma.budgetHead.findMany({
      where: bhWhere,
      orderBy: { name: 'asc' },
    });

    // Unique category names (deduped across companies)
    const categoryNames: string[] = [];
    allBudgetHeads.forEach((bh) => {
      if (!categoryNames.includes(bh.name)) categoryNames.push(bh.name);
    });
    categoryNames.sort();

    // Build request filter
    const reqWhere: any = {};
    if (user.role === RoleName.EMPLOYEE) {
      reqWhere.userId = user.userId;
      reqWhere.companyId = user.companyId;
    } else if (companyId) {
      reqWhere.companyId = companyId;
    }
    if (regionId) reqWhere.regionId = regionId;

    if (statusScope === 'APPROVED_AND_PAID') {
      reqWhere.status = {
        in: [RequestStatus.APPROVED, RequestStatus.PAYMENT_PROCESSING, RequestStatus.PAID, RequestStatus.COMPLETED],
      };
    } else {
      reqWhere.status = { in: [RequestStatus.PAID, RequestStatus.COMPLETED] };
    }

    if (startDate || endDate) {
      reqWhere.requestDate = {};
      if (startDate) {
        const s = new Date(startDate); s.setHours(0, 0, 0, 0);
        reqWhere.requestDate.gte = s;
      }
      if (endDate) {
        const e = new Date(endDate); e.setHours(23, 59, 59, 999);
        reqWhere.requestDate.lte = e;
      }
    }

    const requests = await this.prisma.pettyCashRequest.findMany({
      where: reqWhere,
      select: {
        id: true,
        requestNumber: true,
        purpose: true,
        approvedAmount: true,
        requestedAmount: true,
        status: true,
        requestDate: true,
        regionId: true,
        companyId: true,
        budgetHeadId: true,
        user: { select: { fullName: true } },
        receiverName: true,
      },
    });

    // Index budget heads by id → name
    const bhById: Record<string, string> = {};
    allBudgetHeads.forEach((bh) => { bhById[bh.id] = bh.name; });

    // Build per-region map
    type RegionRow = {
      regionId: string;
      regionName: string;
      companyId: string;
      companyName: string;
      regionBudget: number;
      totalSpent: number;
      byCategory: Record<string, { spent: number; count: number; requests: any[] }>;
    };

    const rowMap: Record<string, RegionRow> = {};
    regions.forEach((r) => {
      const emptyCategories: Record<string, { spent: number; count: number; requests: any[] }> = {};
      categoryNames.forEach((cat) => {
        emptyCategories[cat] = { spent: 0, count: 0, requests: [] };
      });
      emptyCategories['Uncategorized'] = { spent: 0, count: 0, requests: [] };

      rowMap[r.id] = {
        regionId: r.id,
        regionName: r.name,
        companyId: r.company.id,
        companyName: r.company.name,
        regionBudget: Number(r.monthlyBudget || 0),
        totalSpent: 0,
        byCategory: emptyCategories,
      };
    });

    let grandSomtel = 0;
    let grandBluekom = 0;

    requests.forEach((req) => {
      if (!req.regionId || !rowMap[req.regionId]) return; // skip if region not in scope
      const amount = Number(req.approvedAmount || req.requestedAmount || 0);
      const catName = req.budgetHeadId && bhById[req.budgetHeadId] ? bhById[req.budgetHeadId] : 'Uncategorized';
      const row = rowMap[req.regionId];

      if (!row.byCategory[catName]) {
        row.byCategory[catName] = { spent: 0, count: 0, requests: [] };
      }
      row.byCategory[catName].spent += amount;
      row.byCategory[catName].count += 1;
      row.byCategory[catName].requests.push({
        id: req.id,
        requestNumber: req.requestNumber,
        purpose: req.purpose,
        amount,
        status: req.status,
        date: req.requestDate,
        employee: req.user?.fullName,
        receiver: req.receiverName,
      });
      row.totalSpent += amount;

      const compName = row.companyName.toLowerCase();
      if (compName.includes('somtel')) grandSomtel += amount;
      else grandBluekom += amount;
    });

    const rows = Object.values(rowMap).map((row) => {
      const pct = row.regionBudget > 0 ? (row.totalSpent / row.regionBudget) * 100 : 0;
      let status: 'SAFE' | 'WARNING' | 'EXCEEDED' = 'SAFE';
      if (pct >= 100) status = 'EXCEEDED';
      else if (pct >= 80) status = 'WARNING';

      // Serialize byCategory (drop requests for summary, keep counts)
      const byCategorySummary: Record<string, { spent: number; count: number }> = {};
      const byCategoryFull: Record<string, { spent: number; count: number; requests: any[] }> = {};
      Object.entries(row.byCategory).forEach(([cat, data]) => {
        byCategorySummary[cat] = { spent: Number(data.spent.toFixed(2)), count: data.count };
        byCategoryFull[cat] = {
          spent: Number(data.spent.toFixed(2)),
          count: data.count,
          requests: data.requests,
        };
      });

      return {
        regionId: row.regionId,
        regionName: row.regionName,
        companyId: row.companyId,
        companyName: row.companyName,
        regionBudget: row.regionBudget,
        totalSpent: Number(row.totalSpent.toFixed(2)),
        remainingBudget: Number(Math.max(0, row.regionBudget - row.totalSpent).toFixed(2)),
        percentageUsed: Number(pct.toFixed(1)),
        status,
        byCategory: byCategoryFull,
      };
    });

    const grandTotal = grandSomtel + grandBluekom;

    return {
      period: { startDate: startDate || null, endDate: endDate || null, statusScope },
      summary: {
        totalSpent: Number(grandTotal.toFixed(2)),
        somtelSpent: Number(grandSomtel.toFixed(2)),
        bluekomSpent: Number(grandBluekom.toFixed(2)),
      },
      categoryNames: [...categoryNames, 'Uncategorized'].filter(
        (cat) => rows.some((r) => r.byCategory[cat]?.count > 0)
      ),
      rows,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Daily Trend Report — spend per day per company
  // ─────────────────────────────────────────────────────────────────────────
  async getRegionBudgetHeadDaily(
    user: any,
    companyId?: string,
    regionId?: string,
    startDate?: string,
    endDate?: string,
    statusScope: string = 'PAID_ONLY'
  ) {
    const reqWhere: any = {};
    if (user.role === RoleName.EMPLOYEE) {
      reqWhere.userId = user.userId;
      reqWhere.companyId = user.companyId;
    } else if (companyId) {
      reqWhere.companyId = companyId;
    }
    if (regionId) reqWhere.regionId = regionId;

    if (statusScope === 'APPROVED_AND_PAID') {
      reqWhere.status = { in: [RequestStatus.APPROVED, RequestStatus.PAYMENT_PROCESSING, RequestStatus.PAID, RequestStatus.COMPLETED] };
    } else {
      reqWhere.status = { in: [RequestStatus.PAID, RequestStatus.COMPLETED] };
    }

    // Default to current month if no dates given
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    reqWhere.requestDate = {};
    if (startDate) {
      const s = new Date(startDate); s.setHours(0, 0, 0, 0);
      reqWhere.requestDate.gte = s;
    } else {
      reqWhere.requestDate.gte = defaultStart;
    }
    if (endDate) {
      const e = new Date(endDate); e.setHours(23, 59, 59, 999);
      reqWhere.requestDate.lte = e;
    } else {
      reqWhere.requestDate.lte = defaultEnd;
    }

    const requests = await this.prisma.pettyCashRequest.findMany({
      where: reqWhere,
      select: {
        requestDate: true,
        approvedAmount: true,
        requestedAmount: true,
        companyId: true,
        regionId: true,
        company: { select: { name: true } },
        region: { select: { name: true } },
      },
      orderBy: { requestDate: 'asc' },
    });

    // Group by date string
    const dayMap: Record<string, { date: string; somtelSpent: number; bluekomSpent: number; totalSpent: number; byRegion: Record<string, { regionName: string; companyName: string; spent: number }> }> = {};

    requests.forEach((req) => {
      const dateStr = req.requestDate.toISOString().slice(0, 10);
      const amount = Number(req.approvedAmount || req.requestedAmount || 0);
      const compName = req.company?.name || '';
      const isSomtel = compName.toLowerCase().includes('somtel');
      const regionName = req.region?.name || 'No Region';
      const regionKey = `${req.regionId || 'none'}-${compName}`;

      if (!dayMap[dateStr]) {
        dayMap[dateStr] = { date: dateStr, somtelSpent: 0, bluekomSpent: 0, totalSpent: 0, byRegion: {} };
      }
      dayMap[dateStr].totalSpent += amount;
      if (isSomtel) dayMap[dateStr].somtelSpent += amount;
      else dayMap[dateStr].bluekomSpent += amount;

      if (!dayMap[dateStr].byRegion[regionKey]) {
        dayMap[dateStr].byRegion[regionKey] = { regionName, companyName: compName, spent: 0 };
      }
      dayMap[dateStr].byRegion[regionKey].spent += amount;
    });

    const days = Object.values(dayMap).map((d) => ({
      date: d.date,
      somtelSpent: Number(d.somtelSpent.toFixed(2)),
      bluekomSpent: Number(d.bluekomSpent.toFixed(2)),
      totalSpent: Number(d.totalSpent.toFixed(2)),
      byRegion: Object.values(d.byRegion).map((r) => ({
        ...r,
        spent: Number(r.spent.toFixed(2)),
      })),
    }));

    return { days };
  }

}
