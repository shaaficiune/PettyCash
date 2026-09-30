import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InitFundDto, CloseFundDto } from './dto/fund.dto';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class FundsService {
  constructor(private readonly prisma: PrismaService) {}

  async initFund(dto: InitFundDto) {
    return this.prisma.$transaction(async (tx) => {
      // Serialize initial allocations and top-ups for this company/month,
      // including the case where the fund row has not been created yet.
      await (tx as any).$queryRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        dto.companyId,
        `${dto.month}-${dto.year}`,
      );
      const key = { companyId_month_year: { companyId: dto.companyId, month: dto.month, year: dto.year } };
      const existing = await (tx as any).pettyCashFund.findUnique({ where: key });

      if (existing) {
        await (tx as any).$queryRawUnsafe('SELECT id FROM "PettyCashFund" WHERE id = $1 FOR UPDATE', existing.id);
        const lockedFund = await (tx as any).pettyCashFund.findUnique({ where: { id: existing.id } });
        if (lockedFund.status !== 'OPEN') throw new BadRequestException('This fund is already closed');

        const topUpAmount = Number(dto.additionalFunding || dto.openingBalance || 0);
        const newTotalAvailable = Number(lockedFund.totalAvailable) + topUpAmount;
        const newRemaining = Number(lockedFund.remainingBalance) + topUpAmount;
        const updated = await (tx as any).pettyCashFund.update({
          where: { id: lockedFund.id },
          data: {
            additionalFunding: Number(lockedFund.additionalFunding) + topUpAmount,
            totalAvailable: newTotalAvailable,
            remainingBalance: newRemaining,
            closingBalance: newRemaining,
          },
        });

        if (topUpAmount > 0) {
          await (tx as any).pettyCashLedger.create({
            data: {
              fundId: lockedFund.id,
              companyId: dto.companyId,
              transactionType: 'ALLOCATION',
              description: 'Petty cash fund top-up / injection',
              credit: topUpAmount,
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
      const newFund = await (tx as any).pettyCashFund.create({
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
        await (tx as any).pettyCashLedger.create({
          data: {
            fundId: newFund.id,
            companyId: dto.companyId,
            transactionType: 'ALLOCATION',
            description: `Initial petty cash fund allocation for ${dto.month}/${dto.year}`,
            credit: totalAvailable,
            balanceAfter: totalAvailable,
            remarks: `Initial Allocation: $${totalAvailable.toLocaleString()}`,
          },
        });
      }
      return newFund;
    });
  }

  async checkFundAvailability(companyId: string) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const monthName = now.toLocaleString('en-US', { month: 'long' });

    const fund = await (this.prisma as any).pettyCashFund.findUnique({
      where: {
        companyId_month_year: { companyId, month, year },
      },
    });

    const available = !!(fund && Number(fund.totalAvailable) > 0 && fund.status === 'OPEN');

    return {
      available,
      month,
      year,
      message: available
        ? `Petty Cash Fund for ${monthName} ${year} is active.`
        : !fund
          ? `No Petty Cash Fund has been initialized for ${monthName} ${year}. Please ask your Accountant to set up the fund.`
          : Number(fund.totalAvailable) <= 0
            ? `The Petty Cash Fund for ${monthName} ${year} has a zero balance. Please ask your Accountant to top up the fund.`
            : `The Petty Cash Fund for ${monthName} ${year} is closed.`,
    };
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
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const additionalFunding = Number(dto.additionalFunding || 0);

    return this.prisma.$transaction(async (tx) => {
      await (tx as any).$queryRawUnsafe('SELECT id FROM "PettyCashFund" WHERE id = $1 FOR UPDATE', fund.id);
      const currentFund = await (tx as any).pettyCashFund.findUnique({ where: { id: fund.id } });
      if (!currentFund || currentFund.status !== 'OPEN') {
        throw new BadRequestException('This fund is already closed');
      }

      const carryForward = Number(currentFund.remainingBalance);
      const closedFund = await (tx as any).pettyCashFund.update({
        where: { id: currentFund.id },
        data: { status: 'CLOSED', closingBalance: carryForward },
      });

      await (tx as any).$queryRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        companyId,
        `${nextMonth}-${nextYear}`,
      );
      const nextWhere = { companyId_month_year: { companyId, month: nextMonth, year: nextYear } };
      let existingNextFund = await (tx as any).pettyCashFund.findUnique({ where: nextWhere });
      if (existingNextFund) {
        await (tx as any).$queryRawUnsafe('SELECT id FROM "PettyCashFund" WHERE id = $1 FOR UPDATE', existingNextFund.id);
        existingNextFund = await (tx as any).pettyCashFund.findUnique({ where: { id: existingNextFund.id } });
      }
      let nextFund: any;

      if (existingNextFund) {
        if (existingNextFund.status !== 'OPEN') {
          throw new BadRequestException('The next month fund is already closed');
        }
        const carryAdjustment = carryForward - Number(existingNextFund.openingBalance);
        const balanceAdjustment = carryAdjustment + additionalFunding;
        const newTotalAvailable = Number(existingNextFund.totalAvailable) + balanceAdjustment;
        const newRemainingBalance = Number(existingNextFund.remainingBalance) + balanceAdjustment;
        const afterCarryAdjustment = Number(existingNextFund.remainingBalance) + carryAdjustment;
        if (newTotalAvailable < 0 || newRemainingBalance < 0) {
          throw new BadRequestException('The next month fund cannot cover the closing balance adjustment');
        }

        nextFund = await (tx as any).pettyCashFund.update({
          where: { id: existingNextFund.id },
          data: {
            openingBalance: carryForward,
            additionalFunding: Number(existingNextFund.additionalFunding) + additionalFunding,
            totalAvailable: newTotalAvailable,
            remainingBalance: newRemainingBalance,
            closingBalance: Number(existingNextFund.closingBalance ?? existingNextFund.remainingBalance) + balanceAdjustment,
          },
        });

        if (carryAdjustment !== 0) {
          await (tx as any).pettyCashLedger.create({
            data: {
              fundId: existingNextFund.id,
              companyId,
              transactionType: 'ROLLOVER_ADJUSTMENT',
              description: `Month-end carry-forward adjustment from ${month}/${year}`,
              debit: carryAdjustment < 0 ? Math.abs(carryAdjustment) : null,
              credit: carryAdjustment > 0 ? carryAdjustment : null,
              balanceAfter: afterCarryAdjustment,
            },
          });
        }
        if (additionalFunding > 0) {
          await (tx as any).pettyCashLedger.create({
            data: {
              fundId: existingNextFund.id,
              companyId,
              transactionType: 'ALLOCATION',
              description: 'Additional funding for the new month',
              credit: additionalFunding,
              balanceAfter: newRemainingBalance,
            },
          });
        }
      } else {
        const nextAvailable = carryForward + additionalFunding;
        nextFund = await (tx as any).pettyCashFund.create({
          data: {
            companyId,
            month: nextMonth,
            year: nextYear,
            openingBalance: carryForward,
            additionalFunding,
            totalAvailable: nextAvailable,
            remainingBalance: nextAvailable,
            closingBalance: nextAvailable,
          },
        });

        if (carryForward > 0) {
          await (tx as any).pettyCashLedger.create({
            data: {
              fundId: nextFund.id,
              companyId,
              transactionType: 'CARRY_FORWARD',
              description: `Month-end carry-forward from ${month}/${year}`,
              credit: carryForward,
              balanceAfter: carryForward,
            },
          });
        }
        if (additionalFunding > 0) {
          await (tx as any).pettyCashLedger.create({
            data: {
              fundId: nextFund.id,
              companyId,
              transactionType: 'ALLOCATION',
              description: 'Additional funding for the new month',
              credit: additionalFunding,
              balanceAfter: nextAvailable,
            },
          });
        }
      }

      return { closed: closedFund, nextMonthFund: nextFund };
    });
  }

  async recordApprovedPayment(companyId: string, requestId: string, approvedAmount: number) {
    const fund = await this.getOrCreateCurrentMonthFund(companyId);
    return this.prisma.$transaction((tx) => this.recordApprovalInTransaction(tx, fund.id, approvedAmount));
  }

  // Backwards-compatible wrapper used by RequestsService
  async recordApproval(companyId: string, approvedAmount: number) {
    return this.recordApprovedPayment(companyId, null as any, approvedAmount);
  }

  async recordApprovalInTransaction(tx: any, fundId: string, approvedAmount: number) {
    await tx.$queryRawUnsafe('SELECT id FROM "PettyCashFund" WHERE id = $1 FOR UPDATE', fundId);
    const fund = await tx.pettyCashFund.findUnique({ where: { id: fundId } });
    if (!fund || fund.status !== 'OPEN') {
      throw new BadRequestException('The petty cash fund is not open for approvals');
    }

    const totalAvailable = Number(fund.totalAvailable);
    const alreadyCommitted = await this.getCommittedAmount(tx, fund);
    const newApprovedAmount = alreadyCommitted + Number(approvedAmount);
    const remainingBalance = totalAvailable - newApprovedAmount;
    if (remainingBalance < 0) {
      throw new BadRequestException(
        `Insufficient Petty Cash Balance. Available: $${Number(fund.remainingBalance).toLocaleString()} USD, Requested Approval: $${Number(approvedAmount).toLocaleString()} USD. Please top up your company's Petty Cash Fund.`,
      );
    }

    return tx.pettyCashFund.update({
      where: { id: fund.id },
      data: { approvedAmount: newApprovedAmount, remainingBalance, closingBalance: remainingBalance },
    });
  }

  // Record an actual payment and create a ledger entry (atomic to prevent race conditions)
  async recordPayment(companyId: string, requestId: string, amountPaid: number, paidById: string, referenceNumber?: string | null, notes?: string) {
    const fund = await this.getOrCreateCurrentMonthFund(companyId);
    return this.prisma.$transaction((tx) => this.recordPaymentInTransaction(
      tx, fund.id, companyId, requestId, amountPaid, paidById, referenceNumber, notes,
    ));
  }

  async recordPaymentInTransaction(
    tx: any,
    fundId: string,
    companyId: string,
    requestId: string,
    amountPaid: number,
    paidById: string,
    referenceNumber?: string | null,
    notes?: string,
  ) {
    await tx.$queryRawUnsafe('SELECT id FROM "PettyCashFund" WHERE id = $1 FOR UPDATE', fundId);
    const lockedFund = await tx.pettyCashFund.findUnique({ where: { id: fundId } });
    if (!lockedFund || lockedFund.status !== 'OPEN') {
      throw new BadRequestException('The petty cash fund is not open for payments');
    }

    const totalAvailable = Number(lockedFund.totalAvailable);
    const periodStart = new Date(lockedFund.year, lockedFund.month - 1, 1);
    const nextPeriodStart = new Date(lockedFund.year, lockedFund.month, 1);
    const paidAggregate = await tx.payment.aggregate({
      where: {
        companyId,
        request: { createdAt: { gte: periodStart, lt: nextPeriodStart } },
      },
      _sum: { amountPaid: true },
    });
    const paidSoFar = Math.max(
      Number(lockedFund.paidAmount || 0),
      Number(paidAggregate._sum.amountPaid || 0),
    );
    const newPaid = paidSoFar + Number(amountPaid);
    if (newPaid > totalAvailable) {
      throw new BadRequestException(
        `Insufficient Petty Cash Balance. Available: $${Number(lockedFund.remainingBalance).toLocaleString()} USD, Requested Payout: $${Number(amountPaid).toLocaleString()} USD. Please top up your company's Petty Cash Fund.`,
      );
    }

    // Approved requests reserve funds before payout. Paying one must not release
    // the unpaid portion of another request's reservation.
    const committedAmount = await this.getCommittedAmount(tx, lockedFund);
    const remainingBalance = totalAvailable - committedAmount;
    if (remainingBalance < 0) {
      throw new BadRequestException('Committed requests exceed the available fund balance');
    }

    const updatedFund = await tx.pettyCashFund.update({
      where: { id: fundId },
      data: { paidAmount: newPaid, remainingBalance, closingBalance: remainingBalance },
    });
    const request = requestId ? await tx.pettyCashRequest.findUnique({
      where: { id: requestId },
      select: { purpose: true },
    }) : null;
    const ledger = await tx.pettyCashLedger.create({
      data: {
        fundId,
        companyId,
        referenceNumber: referenceNumber || undefined,
        transactionType: 'PAYMENT',
        employeeId: paidById,
        requestId: requestId || undefined,
        description: notes || request?.purpose || 'Payment',
        debit: Number(amountPaid),
        credit: null,
        balanceAfter: totalAvailable - newPaid,
        remarks: notes || undefined,
      },
    });
    return { updatedFund, ledger };
  }

  private async getCommittedAmount(tx: any, fund: any): Promise<number> {
    const periodStart = new Date(fund.year, fund.month - 1, 1);
    const nextPeriodStart = new Date(fund.year, fund.month, 1);
    const committedRequests = await tx.pettyCashRequest.findMany({
      where: {
        companyId: fund.companyId,
        status: { in: ['APPROVED', 'PAYMENT_PROCESSING', 'PAID', 'COMPLETED'] },
        createdAt: { gte: periodStart, lt: nextPeriodStart },
      },
      select: { approvedAmount: true, requestedAmount: true },
    });

    return committedRequests.reduce(
      (total: number, request: any) => total + Number(request.approvedAmount ?? request.requestedAmount),
      0,
    );
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
        employee: { select: { fullName: true, phone: true } },
        request: { select: { requestNumber: true, purpose: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { total, page, pageSize, items };
  }
}

