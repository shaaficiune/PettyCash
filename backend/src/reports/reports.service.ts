import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestStatus, RoleName } from '@prisma/client';

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
        department: { select: { name: true } },
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
        department: { select: { name: true } },
        company: { select: { name: true } },
        user: { select: { fullName: true } },
      },
    });

    const departmentBreakdown: Record<string, number> = {};
    const companyBreakdown: Record<string, number> = {};
    const employeeBreakdown: Record<string, number> = {};

    requests.forEach(r => {
      const amount = Number(r.approvedAmount || r.requestedAmount || 0);
      const deptName = r.department.name;
      departmentBreakdown[deptName] = (departmentBreakdown[deptName] || 0) + amount;
      const compName = r.company.name;
      companyBreakdown[compName] = (companyBreakdown[compName] || 0) + amount;
      const empName = r.user.fullName;
      employeeBreakdown[empName] = (employeeBreakdown[empName] || 0) + amount;
    });

    return {
      department: Object.entries(departmentBreakdown).map(([name, value]) => ({ name, value })),
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

  private buildExportWhere(user: any, companyId?: string, regionId?: string, startDate?: string, endDate?: string) {
    const where: any = {};
    if (user.role === RoleName.EMPLOYEE) {
      where.userId = user.userId;
      where.companyId = user.companyId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    if (regionId) where.regionId = regionId;

    if (startDate || endDate) {
      where.requestDate = {};
      if (startDate) where.requestDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.requestDate.lte = end;
      }
    }

    return where;
  }

  async exportRequestsExcel(user: any, companyId?: string, regionId?: string, startDate?: string, endDate?: string): Promise<string> {
    const where = this.buildExportWhere(user, companyId, regionId, startDate, endDate);

    const requests = await this.prisma.pettyCashRequest.findMany({
      where,
      include: {
        user: { select: { fullName: true, phone: true } },
        company: { select: { name: true } },
        department: { select: { name: true } },
        region: { select: { name: true } },
        budgetHead: { select: { name: true, code: true } },
      },
      orderBy: { requestDate: 'desc' },
    });

    // Native Excel-compatible XML format with full styling
    const rows = requests.map(r => `
      <Row>
        <Cell><Data ss:Type="String">${r.requestNumber}</Data></Cell>
        <Cell><Data ss:Type="String">${r.requestDate.toISOString().slice(0, 10)}</Data></Cell>
        <Cell><Data ss:Type="String">${r.user.fullName}</Data></Cell>
        <Cell><Data ss:Type="String">${r.receiverName || '-'}</Data></Cell>
        <Cell><Data ss:Type="String">${r.receiverPhone || '-'}</Data></Cell>
        <Cell><Data ss:Type="String">${r.company.name}</Data></Cell>
        <Cell><Data ss:Type="String">${r.department.name}</Data></Cell>
        <Cell><Data ss:Type="String">${r.region?.name || '-'}</Data></Cell>
        <Cell><Data ss:Type="String">${r.budgetHead ? `${r.budgetHead.code} - ${r.budgetHead.name}` : (r.requestType || '-')}</Data></Cell>
        <Cell><Data ss:Type="String">${r.purpose.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.requestedAmount}</Data></Cell>
        <Cell><Data ss:Type="Number">${r.approvedAmount || 0}</Data></Cell>
        <Cell><Data ss:Type="String">${r.currency}</Data></Cell>
        <Cell><Data ss:Type="String">${r.status}</Data></Cell>
        <Cell><Data ss:Type="String">${r.priority}</Data></Cell>
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
    <Cell><Data ss:Type="String">Department</Data></Cell>
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

  async exportRequestsPdfHtml(user: any, companyId?: string, regionId?: string, startDate?: string, endDate?: string): Promise<string> {
    const where = this.buildExportWhere(user, companyId, regionId, startDate, endDate);

    const requests = await this.prisma.pettyCashRequest.findMany({
      where,
      include: {
        user: { select: { fullName: true, phone: true } },
        company: { select: { name: true } },
        department: { select: { name: true } },
        region: { select: { name: true } },
        budgetHead: { select: { name: true, code: true } },
      },
      orderBy: { requestDate: 'desc' },
    });

    const rows = requests.map(r => `
      <tr>
        <td style="font-weight:600; color:#0B3333;">${r.requestNumber}</td>
        <td>${r.requestDate.toISOString().slice(0, 10)}</td>
        <td>${r.user.fullName}</td>
        <td>${r.receiverName ? `${r.receiverName}${r.receiverPhone ? ` (${r.receiverPhone})` : ''}` : '-'}</td>
        <td>${r.region?.name || '-'}</td>
        <td>${r.budgetHead ? r.budgetHead.name : r.requestType}</td>
        <td style="max-width:200px; word-break:break-word;">${r.purpose}</td>
        <td style="text-align:right; font-weight:600;">$${Number(r.requestedAmount).toFixed(2)}</td>
        <td style="text-align:right;">${r.approvedAmount ? `$${Number(r.approvedAmount).toFixed(2)}` : '-'}</td>
        <td><span class="badge badge-${r.status.toLowerCase()}">${r.status.replace(/_/g, ' ')}</span></td>
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
}
