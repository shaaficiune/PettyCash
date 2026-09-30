import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InitFundDto, CloseFundDto } from './dto/fund.dto';
import { RequestStatus } from '@prisma/client';

const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char] || char));

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

  private buildTransactionsWhere(
    companyId?: string,
    transactionType?: string,
    startDate?: string,
    endDate?: string,
    search?: string,
    regionId?: string
  ) {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (transactionType) where.transactionType = transactionType;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.date.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    if (regionId) {
      where.request = {
        ...(where.request || {}),
        regionId,
      };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { remarks: { contains: q, mode: 'insensitive' } },
        { employee: { fullName: { contains: q, mode: 'insensitive' } } },
        {
          request: {
            OR: [
              { requestNumber: { contains: q, mode: 'insensitive' } },
              { purpose: { contains: q, mode: 'insensitive' } },
              { receiverName: { contains: q, mode: 'insensitive' } },
              { receiverPhone: { contains: q, mode: 'insensitive' } },
              { vendorName: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    return where;
  }

  async getTransactions(
    companyId?: string,
    transactionType?: string,
    page = 1,
    pageSize = 20,
    startDate?: string,
    endDate?: string,
    search?: string,
    regionId?: string
  ) {
    const where = this.buildTransactionsWhere(
      companyId,
      transactionType,
      startDate,
      endDate,
      search,
      regionId
    );

    const total = await (this.prisma as any).pettyCashLedger.count({ where });
    const items = await (this.prisma as any).pettyCashLedger.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true, phone: true, email: true } },
        request: {
          select: {
            id: true,
            requestNumber: true,
            purpose: true,
            receiverName: true,
            receiverPhone: true,
            vendorName: true,
            requestedAmount: true,
            approvedAmount: true,
            currency: true,
            regionId: true,
            region: { select: { id: true, name: true } },
            budgetHead: { select: { id: true, name: true, code: true } },
            department: { select: { id: true, name: true } },
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const stats = await (this.prisma as any).pettyCashLedger.aggregate({
      where,
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const totalDebit = Number(stats._sum?.debit || 0);
    const totalCredit = Number(stats._sum?.credit || 0);
    const netBalance = totalCredit - totalDebit;

    return {
      total,
      page,
      pageSize,
      items,
      summary: {
        totalDebit,
        totalCredit,
        netBalance,
        totalCount: total,
      },
    };
  }

  async exportTransactionsExcel(
    companyId?: string,
    transactionType?: string,
    startDate?: string,
    endDate?: string,
    search?: string,
    regionId?: string
  ): Promise<string> {
    const where = this.buildTransactionsWhere(
      companyId,
      transactionType,
      startDate,
      endDate,
      search,
      regionId
    );

    const transactions = await (this.prisma as any).pettyCashLedger.findMany({
      where,
      include: {
        company: { select: { name: true } },
        employee: { select: { fullName: true, phone: true } },
        request: {
          select: {
            requestNumber: true,
            purpose: true,
            receiverName: true,
            receiverPhone: true,
            vendorName: true,
            region: { select: { name: true } },
            budgetHead: { select: { name: true, code: true } },
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    const rows = transactions.map((t: any) => {
      const dateStr = t.date ? new Date(t.date).toISOString().slice(0, 10) : '';
      const refNum = t.request?.requestNumber || t.referenceNumber || '-';
      const employeeName = t.employee?.fullName || t.request?.user?.fullName || '-';
      const receiverName = t.request?.receiverName || t.request?.vendorName || '-';
      const regionName = t.request?.region?.name || '-';
      const categoryName = t.request?.budgetHead ? `${t.request.budgetHead.code} - ${t.request.budgetHead.name}` : '-';
      const debitVal = t.debit ? Number(t.debit) : 0;
      const creditVal = t.credit ? Number(t.credit) : 0;
      const balanceVal = t.balanceAfter ? Number(t.balanceAfter) : 0;

      return `
      <Row>
        <Cell><Data ss:Type="String">${escapeHtml(dateStr)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(t.company?.name || '-')}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(refNum)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(t.transactionType || '-')}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(employeeName)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(receiverName)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(regionName)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(categoryName)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeHtml(t.description || t.request?.purpose || '-')}</Data></Cell>
        <Cell><Data ss:Type="Number">${debitVal}</Data></Cell>
        <Cell><Data ss:Type="Number">${creditVal}</Data></Cell>
        <Cell><Data ss:Type="Number">${balanceVal}</Data></Cell>
      </Row>`;
    }).join('');

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
 <Worksheet ss:Name="TransactionLedger">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Date</Data></Cell>
    <Cell><Data ss:Type="String">Company</Data></Cell>
    <Cell><Data ss:Type="String">Reference / Request #</Data></Cell>
    <Cell><Data ss:Type="String">Type</Data></Cell>
    <Cell><Data ss:Type="String">Employee</Data></Cell>
    <Cell><Data ss:Type="String">Recipient / Merchant</Data></Cell>
    <Cell><Data ss:Type="String">Region</Data></Cell>
    <Cell><Data ss:Type="String">Category</Data></Cell>
    <Cell><Data ss:Type="String">Description</Data></Cell>
    <Cell><Data ss:Type="String">Debit</Data></Cell>
    <Cell><Data ss:Type="String">Credit</Data></Cell>
    <Cell><Data ss:Type="String">Balance After</Data></Cell>
   </Row>
   ${rows}
  </Table>
 </Worksheet>
</Workbook>`;
  }

  async exportTransactionsPdfHtml(
    companyId?: string,
    transactionType?: string,
    startDate?: string,
    endDate?: string,
    search?: string,
    regionId?: string
  ): Promise<string> {
    const where = this.buildTransactionsWhere(
      companyId,
      transactionType,
      startDate,
      endDate,
      search,
      regionId
    );

    const transactions = await (this.prisma as any).pettyCashLedger.findMany({
      where,
      include: {
        company: { select: { name: true } },
        employee: { select: { fullName: true, phone: true } },
        request: {
          select: {
            requestNumber: true,
            purpose: true,
            receiverName: true,
            receiverPhone: true,
            vendorName: true,
            region: { select: { name: true } },
            budgetHead: { select: { name: true, code: true } },
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    let totalDebit = 0;
    let totalCredit = 0;

    const rows = transactions.map((t: any) => {
      const dateStr = t.date ? new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      const refNum = t.request?.requestNumber ? `#${t.request.requestNumber}` : (t.referenceNumber || '—');
      const employeeName = t.employee?.fullName || t.request?.user?.fullName || '—';
      const receiverName = t.request?.receiverName ? `${t.request.receiverName}${t.request.receiverPhone ? ` (${t.request.receiverPhone})` : ''}` : (t.request?.vendorName || '—');
      const regionName = t.request?.region?.name || '—';
      const categoryName = t.request?.budgetHead ? t.request.budgetHead.name : '—';
      const debitNum = t.debit ? Number(t.debit) : 0;
      const creditNum = t.credit ? Number(t.credit) : 0;
      const balanceNum = t.balanceAfter ? Number(t.balanceAfter) : 0;

      totalDebit += debitNum;
      totalCredit += creditNum;

      const typeBadgeClass = t.transactionType === 'PAYMENT'
        ? 'badge-payment'
        : t.transactionType === 'CARRY_FORWARD'
        ? 'badge-carry'
        : 'badge-credit';

      return `
      <tr>
        <td style="white-space:nowrap; font-size:10px;">${escapeHtml(dateStr)}</td>
        <td style="font-weight:600; color:#0B3333;">${escapeHtml(t.company?.name || '—')}</td>
        <td style="font-weight:600;">${escapeHtml(refNum)}</td>
        <td><span class="badge ${typeBadgeClass}">${escapeHtml(t.transactionType?.replace(/_/g, ' ') || '—')}</span></td>
        <td>${escapeHtml(employeeName)}</td>
        <td>${escapeHtml(receiverName)}</td>
        <td>${escapeHtml(regionName)}</td>
        <td>${escapeHtml(categoryName)}</td>
        <td style="max-width:180px; word-break:break-word;">${escapeHtml(t.description || t.request?.purpose || '—')}</td>
        <td style="text-align:right; color:#dc2626; font-weight:600;">${debitNum > 0 ? `-$${debitNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
        <td style="text-align:right; color:#16a34a; font-weight:600;">${creditNum > 0 ? `+$${creditNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</td>
        <td style="text-align:right; font-weight:bold;">$${balanceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Petty Cash Transactions Ledger</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 15px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0B3333; padding-bottom: 10px; margin-bottom: 12px; }
    .title { font-size: 18px; font-weight: bold; color: #0B3333; }
    .meta { font-size: 10px; color: #64748b; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background-color: #0B3333; color: #ffffff; padding: 6px 5px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 5px; border-bottom: 1px solid #e2e8f0; font-size: 9.5px; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 8.5px; font-weight: 600; text-transform: uppercase; }
    .badge-payment { background-color: #fee2e2; color: #b91c1c; }
    .badge-carry { background-color: #e0f2fe; color: #0369a1; }
    .badge-credit { background-color: #dcfce7; color: #15803d; }
    .summary-box { margin-top: 15px; padding: 10px 15px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; justify-content: flex-end; gap: 24px; font-size: 11px; font-weight: bold; }
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
      <div class="title">Petty Cash Transactions Ledger</div>
      <div style="color: #64748b; font-size: 11px;">Somtel & Bluekom Integrated Financial System</div>
    </div>
    <div class="meta">
      <div>Generated on: ${new Date().toLocaleString()}</div>
      <div>Total Transactions: ${transactions.length}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Company</th>
        <th>Ref / Request #</th>
        <th>Type</th>
        <th>Employee</th>
        <th>Recipient / Merchant</th>
        <th>Region</th>
        <th>Category</th>
        <th>Description</th>
        <th style="text-align:right;">Debit</th>
        <th style="text-align:right;">Credit</th>
        <th style="text-align:right;">Balance</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="summary-box">
    <div style="color:#dc2626;">Total Debit (Outflow): -$${totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    <div style="color:#16a34a;">Total Credit (Inflow): +$${totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    <div style="color:#0B3333;">Net Movement: $${(totalCredit - totalDebit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
  </div>
</body>
</html>`;
  }
}

