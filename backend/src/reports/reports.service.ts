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
        user: { select: { fullName: true, employeeNumber: true } },
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
        user: { select: { fullName: true, username: true, employeeNumber: true } },
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

  async exportRequests(user: any, companyId?: string) {
    const where: any = {};
    if (user.role === RoleName.EMPLOYEE) {
      where.userId = user.userId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    const requests = await this.prisma.pettyCashRequest.findMany({
      where,
      include: {
        user: { select: { fullName: true, employeeNumber: true } },
        company: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const exportData = requests.map(r => ({
      RequestNumber: r.requestNumber,
      Date: r.requestDate.toISOString().slice(0, 10),
      EmployeeName: r.user.fullName,
      EmployeeNumber: r.user.employeeNumber,
      Company: r.company.name,
      Department: r.department.name,
      Purpose: r.purpose,
      Amount: r.requestedAmount.toString(),
      Currency: r.currency,
      Status: r.status,
      Priority: r.priority,
    }));

    const headers = [
      'RequestNumber', 'Date', 'EmployeeName', 'EmployeeNumber',
      'Company', 'Department', 'Purpose', 'Amount', 'Currency', 'Status', 'Priority',
    ];

    return this.generateCSV(exportData, headers);
  }
}
