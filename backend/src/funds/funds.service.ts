import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InitFundDto, CloseFundDto } from './dto/fund.dto';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class FundsService {
  constructor(private readonly prisma: PrismaService) {}

  async initFund(dto: InitFundDto) {
    const existing = await (this.prisma as any).pettyCashFund.findUnique({
      where: {
        companyId_month_year: {
          companyId: dto.companyId,
          month: dto.month,
          year: dto.year,
        },
      },
    });

    if (existing) {
      // Top up existing fund for this month
      const topUpAmount = Number(dto.additionalFunding || dto.openingBalance || 0);
      const newTotalAvailable = Number(existing.totalAvailable) + topUpAmount;
      const newRemaining = Number(existing.remainingBalance) + topUpAmount;

      const updated = await (this.prisma as any).pettyCashFund.update({
        where: { id: existing.id },
        data: {
          additionalFunding: Number(existing.additionalFunding) + topUpAmount,
          totalAvailable: newTotalAvailable,
          remainingBalance: newRemaining,
          closingBalance: newRemaining,
        },
      });

      if (topUpAmount > 0) {
        await (this.prisma as any).pettyCashLedger.create({
          data: {
            fundId: existing.id,
            companyId: dto.companyId,
            transactionType: 'ALLOCATION',
            description: `Petty cash fund top-up / injection`,
            credit: topUpAmount,
            debit: null,
            balanceAfter: newRemaining,
            remarks: `Fund top-up: +$${topUpAmount.toLocaleString()}`,
          },
        });
      }

      return updated;
    }

    const openingBalance = Number(dto.openingBalance || 0);
    const additionalFunding = Number(dto.additionalFunding || 0);
    const totalAvailable = openingBalance + additionalFunding;

    const newFund = await (this.prisma as any).pettyCashFund.create({
      data: {
        companyId: dto.companyId,
        month: dto.month,
        year: dto.year,
        openingBalance,
        additionalFunding,
        totalAvailable,
        remainingBalance: totalAvailable,
        closingBalance: totalAvailable,
      },
    });

    if (totalAvailable > 0) {
      await (this.prisma as any).pettyCashLedger.create({
        data: {
          fundId: newFund.id,
          companyId: dto.companyId,
          transactionType: 'ALLOCATION',
          description: `Initial petty cash fund allocation for ${dto.month}/${dto.year}`,
          credit: totalAvailable,
          debit: null,
          balanceAfter: totalAvailable,
          remarks: `Initial Allocation: $${totalAvailable.toLocaleString()}`,
        },
      });
    }

    return newFund;
  }

  async getFund(companyId: string, month: number, year: number) {
    const fund = await (this.prisma as any).pettyCashFund.findUnique({
      where: {
        companyId_month_year: {
          companyId,
          month,
          year,
        },
      },
    });

    if (!fund) {
      return this.getOrCreateCurrentMonthFund(companyId, month, year);
    }

    return fund;
  }

  async closeMonth(companyId: string, month: number, year: number, dto: CloseFundDto) {
    const fund = await this.getFund(companyId, month, year);

    if (fund.status !== 'OPEN') {
      throw new BadRequestException('This fund is already closed');
    }

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const closingBalance = Number(fund.remainingBalance) + Number(dto.additionalFunding || 0);

    await (this.prisma as any).pettyCashFund.update({
      where: { id: fund.id },
      data: {
        status: 'CLOSED',
        additionalFunding: Number(fund.additionalFunding) + Number(dto.additionalFunding || 0),
        closingBalance,
        remainingBalance: closingBalance,
      },
    });

    const nextFund = await (this.prisma as any).pettyCashFund.upsert({
      where: {
        companyId_month_year: {
          companyId,
          month: nextMonth,
          year: nextYear,
        },
      },
      update: {
        openingBalance: closingBalance,
        remainingBalance: closingBalance,
        totalAvailable: closingBalance + (dto.additionalFunding || 0),
      },
      create: {
        companyId,
        month: nextMonth,
        year: nextYear,
        openingBalance: closingBalance,
        additionalFunding: dto.additionalFunding || 0,
        totalAvailable: closingBalance + (dto.additionalFunding || 0),
        remainingBalance: closingBalance + (dto.additionalFunding || 0),
        closingBalance: closingBalance + (dto.additionalFunding || 0),
      },
    });

    return {
      closed: fund,
      nextMonthFund: nextFund,
    };
  }

  async recordApprovedPayment(companyId: string, requestId: string, approvedAmount: number) {
    const fund = await this.getOrCreateCurrentMonthFund(companyId);

    const totalAvailable = Number(fund.totalAvailable);
    const currentApproved = Number(fund.approvedAmount || 0);
    const newApprovedAmount = currentApproved + Number(approvedAmount);
    const remainingBalance = totalAvailable - newApprovedAmount;

    if (remainingBalance < 0) {
      throw new BadRequestException(
        `Insufficient Petty Cash Balance. Available: $${Number(fund.remainingBalance).toLocaleString()} USD, Requested Approval: $${Number(approvedAmount).toLocaleString()} USD. Please top up your company's Petty Cash Fund.`
      );
    }

    return (this.prisma as any).pettyCashFund.update({
      where: { id: fund.id },
      data: {
        approvedAmount: newApprovedAmount,
        remainingBalance,
        closingBalance: remainingBalance,
      },
    });
  }

  // Backwards-compatible wrapper used by RequestsService
  async recordApproval(companyId: string, approvedAmount: number) {
    return this.recordApprovedPayment(companyId, null as any, approvedAmount);
  }

  // Record an actual payment and create a ledger entry
  async recordPayment(companyId: string, requestId: string, amountPaid: number, paidById: string, referenceNumber?: string | null, notes?: string) {
    const fund = await this.getOrCreateCurrentMonthFund(companyId);

    const totalAvailable = Number(fund.totalAvailable);
    const currentPaid = Number(fund.paidAmount || 0);
    const newPaid = currentPaid + Number(amountPaid);
    const remainingBalance = totalAvailable - newPaid;

    if (remainingBalance < 0) {
      throw new BadRequestException(
        `Insufficient Petty Cash Balance. Available: $${Number(fund.remainingBalance).toLocaleString()} USD, Requested Payout: $${Number(amountPaid).toLocaleString()} USD. Please top up your company's Petty Cash Fund.`
      );
    }

    // Use transaction to update fund and create ledger
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedFund = await (tx as any).pettyCashFund.update({
        where: { id: fund.id },
        data: {
          paidAmount: newPaid,
          remainingBalance,
          closingBalance: remainingBalance,
        },
      });

      let defaultDesc = `Payment`;
      if (requestId) {
        const reqObj = await (tx as any).pettyCashRequest.findUnique({
          where: { id: requestId },
          select: { requestNumber: true, purpose: true },
        });
        if (reqObj) {
          defaultDesc = reqObj.purpose || 'Payment';
        }
      }

      const ledger = await (tx as any).pettyCashLedger.create({
        data: {
          fundId: fund.id,
          companyId,
          referenceNumber: referenceNumber || undefined,
          transactionType: 'PAYMENT',
          employeeId: paidById,
          requestId: requestId,
          description: notes || defaultDesc,
          debit: Number(amountPaid),
          credit: null,
          balanceAfter: remainingBalance,
          remarks: notes || undefined,
        },
      });

      return { updatedFund, ledger };
    });

    return updated;
  }

  async getMonthlySummary(companyId: string, month: number, year: number) {
    const fund = await (this.prisma as any).pettyCashFund.findUnique({
      where: {
        companyId_month_year: {
          companyId,
          month,
          year,
        },
      },
    });

    // Return null if no fund exists; caller can decide to auto-create or show init form
    if (!fund) return null;

    // ── Compute live paidAmount from Payment table ──────────────────────────
    // The fund.paidAmount field may be stale if payments were added via older flows.
    // We always derive the real figure from actual Payment records.
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const paidAgg = await this.prisma.payment.aggregate({
      where: {
        companyId,
        paymentDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amountPaid: true },
    });
    const livePaid = Number(paidAgg._sum.amountPaid || 0);

    // ── Compute live approvedAmount from approved/paid requests ─────────────
    const approvedAgg = await (this.prisma as any).pettyCashRequest.aggregate({
      where: {
        companyId,
        status: { in: ['APPROVED', 'PAYMENT_PROCESSING', 'PAID', 'COMPLETED'] },
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { approvedAmount: true },
    });
    const liveApproved = Number(approvedAgg._sum.approvedAmount || 0);

    const totalAvailable = Number(fund.totalAvailable || 0);
    const liveRemaining = Math.max(0, totalAvailable - liveApproved);

    return {
      ...fund,
      paidAmount: livePaid,
      approvedAmount: liveApproved,
      remainingBalance: liveRemaining,
      closingBalance: liveRemaining,
    };
  }

  async getOrCreateCurrentMonthFund(companyId: string, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month || (now.getMonth() + 1);
    const targetYear = year || now.getFullYear();

    const existing = await (this.prisma as any).pettyCashFund.findUnique({
      where: {
        companyId_month_year: {
          companyId,
          month: targetMonth,
          year: targetYear,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Find previous month's closing balance for auto carry-forward
    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;

    const previousFund = await (this.prisma as any).pettyCashFund.findUnique({
      where: {
        companyId_month_year: {
          companyId,
          month: prevMonth,
          year: prevYear,
        },
      },
    });

    const carryForwardBalance = previousFund ? Number(previousFund.closingBalance || previousFund.remainingBalance || 0) : 0;

    const newFund = await (this.prisma as any).pettyCashFund.create({
      data: {
        companyId,
        month: targetMonth,
        year: targetYear,
        openingBalance: carryForwardBalance,
        additionalFunding: 0,
        totalAvailable: carryForwardBalance,
        approvedAmount: 0,
        paidAmount: 0,
        remainingBalance: carryForwardBalance,
        closingBalance: carryForwardBalance,
        status: 'OPEN',
      },
    });

    if (carryForwardBalance > 0) {
      await (this.prisma as any).pettyCashLedger.create({
        data: {
          fundId: newFund.id,
          companyId,
          transactionType: 'CARRY_FORWARD',
          description: `Automatic monthly balance carry-forward from ${prevMonth}/${prevYear}`,
          credit: carryForwardBalance,
          debit: null,
          balanceAfter: carryForwardBalance,
          remarks: `Opening Balance Rollover: $${carryForwardBalance.toLocaleString()}`,
        },
      });
    }

    return newFund;
  }

  async getTransactions(companyId?: string, transactionType?: string, page = 1, pageSize = 20) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (transactionType) where.transactionType = transactionType;

    const total = await (this.prisma as any).pettyCashLedger.count({ where });
    const items = await (this.prisma as any).pettyCashLedger.findMany({
      where,
      include: {
        company: { select: { name: true } },
        employee: { select: { fullName: true, employeeNumber: true } },
        request: { select: { requestNumber: true, purpose: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { total, page, pageSize, items };
  }
}

