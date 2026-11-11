import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordPaymentDto } from './dto/payment.dto';
import { RequestStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { FundsService } from '../funds/funds.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly fundsService: FundsService,
  ) {}

  async recordPayment(paidById: string, dto: RecordPaymentDto) {
    const requestSnapshot = await this.prisma.pettyCashRequest.findUnique({
      where: { id: dto.requestId },
    });

    if (!requestSnapshot) {
      throw new NotFoundException('Petty cash request not found');
    }

    if (!dto.amountPaid || dto.amountPaid <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    if (Number(dto.amountPaid) > 50) {
      throw new BadRequestException('Payment amount cannot exceed the maximum petty cash limit of $50');
    }

    // Ensure actor belongs to same company unless ACCOUNTANT
    const actor = await this.prisma.user.findUnique({ where: { id: paidById }, include: { role: true } });
    if (!actor) throw new ForbiddenException('Actor account not found');

    // Separation of Duties: Approval Two (SUPER_ADMIN or APPROVAL_TWO role) cannot record disbursements.
    // Only Accountants/Cashiers can disburse cash. This enforces Maker-Checker-Disburser principle.
    if (actor.role?.name === 'SUPER_ADMIN' || actor.role?.name === 'APPROVAL_TWO') {
      throw new ForbiddenException('Approval Two is not authorized to disburse cash payments. Only Accountants or Cashiers can record disbursements.');
    }

    if (actor.role?.name !== 'ACCOUNTANT' && actor.companyId !== requestSnapshot.companyId) {
      throw new ForbiddenException('Not allowed to record payments for this company');
    }

    const fund = await this.fundsService.getOrCreateCurrentMonthFund(requestSnapshot.companyId);
    const result = await this.prisma.$transaction(async (tx) => {
      // Serialize payments for this request, then re-read its state and paid total.
      await (tx as any).$executeRawUnsafe('SELECT id FROM "PettyCashRequest" WHERE id = $1 FOR UPDATE', dto.requestId);
      const request = await (tx as any).pettyCashRequest.findUnique({ where: { id: dto.requestId } });
      if (!request) throw new NotFoundException('Petty cash request not found');
      if (request.status !== RequestStatus.APPROVED && request.status !== RequestStatus.PAYMENT_PROCESSING) {
        throw new BadRequestException('Payment can only be processed for approved requests');
      }

      const paidAgg = await (tx as any).payment.aggregate({
        where: { requestId: dto.requestId },
        _sum: { amountPaid: true },
      });
      const alreadyPaid = Number(paidAgg._sum.amountPaid || 0);
      const newTotalPaid = alreadyPaid + Number(dto.amountPaid);
      const approvedAmount = Number(request.approvedAmount ?? request.requestedAmount);
      if (newTotalPaid > approvedAmount) {
        const remaining = approvedAmount - alreadyPaid;
        throw new BadRequestException(
          `Overpayment prevented: approved amount is ${request.currency} ${approvedAmount.toLocaleString()}, ` +
          `already paid ${request.currency} ${alreadyPaid.toLocaleString()}, ` +
          `remaining balance is ${request.currency} ${remaining.toLocaleString()}.`,
        );
      }

      await this.fundsService.recordPaymentInTransaction(
        tx,
        fund.id,
        request.companyId,
        dto.requestId,
        Number(dto.amountPaid),
        paidById,
        dto.referenceNumber || null,
        dto.notes || '',
      );

      const payment = await (tx as any).payment.create({
        data: {
          requestId: dto.requestId,
          companyId: request.companyId,
          amountPaid: dto.amountPaid,
          paymentMethod: dto.paymentMethod,
          transactionId: dto.transactionId || null,
          referenceNumber: dto.referenceNumber || null,
          paidById,
          notes: dto.notes || '',
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        },
      });

      const newStatus = newTotalPaid >= approvedAmount ? RequestStatus.PAID : RequestStatus.PAYMENT_PROCESSING;
      await (tx as any).pettyCashRequest.update({
        where: { id: request.id },
        data: { status: newStatus },
      });
      return { payment, request };
    });

    // Notify employee
    try {
      await this.notifications.create(
        result.request.userId,
        `Payment Disbursed: ${result.request.requestNumber}`,
        `A payment of ${result.request.currency} ${dto.amountPaid} has been disbursed for request ${result.request.requestNumber} via ${dto.paymentMethod}.`,
      );
    } catch (error) {
      // A notification failure must not undo or misreport a committed payment.
      console.error('Payment notification failed:', error);
    }

    return result.payment;
  }

  async listPayments(filters: {
    page?: number;
    pageSize?: number;
    companyId?: string;
    requestId?: string;
    paidById?: string;
    from?: string;
    to?: string;
  }, actor: any) {
    const page = Math.max(1, Number(filters.page || 1));
    const pageSize = Math.min(500, Math.max(5, Number(filters.pageSize || 20)));

    const andConditions: any[] = [];

    if (filters.requestId) {
      andConditions.push({ requestId: filters.requestId });
    }

    if (filters.paidById && filters.paidById.trim()) {
      const pQuery = filters.paidById.trim();
      andConditions.push({
        OR: [
          { paidById: pQuery },
          { paidBy: { fullName: { contains: pQuery, mode: 'insensitive' } } },
          { paidBy: { username: { contains: pQuery, mode: 'insensitive' } } },
        ],
      });
    }

    // Multi-company access:
    // If a company is chosen, match by either payment.companyId or request.companyId
    if (filters.companyId && filters.companyId !== 'ALL') {
      andConditions.push({
        OR: [
          { companyId: filters.companyId },
          { request: { companyId: filters.companyId } },
        ],
      });
    } else if (actor?.role === 'EMPLOYEE') {
      andConditions.push({
        OR: [
          { companyId: actor.companyId },
          { request: { companyId: actor.companyId } },
        ],
      });
    }

    const fromStr = filters.from || (filters as any).startDate;
    const toStr = filters.to || (filters as any).endDate;

    if (fromStr || toStr) {
      const dateCond: any = {};
      if (fromStr) {
        const parts = fromStr.split('-').map(Number);
        const fromDate = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0) : new Date(fromStr);
        if (!isNaN(fromDate.getTime())) {
          dateCond.gte = fromDate;
        }
      }
      if (toStr) {
        const parts = toStr.split('-').map(Number);
        const toDate = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999) : new Date(toStr);
        if (!isNaN(toDate.getTime())) {
          dateCond.lte = toDate;
        }
      }
      andConditions.push({ paymentDate: dateCond });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { 
          paidBy: { select: { id: true, fullName: true, username: true } }, 
          request: { 
            select: { 
              requestNumber: true, 
              id: true,
              purpose: true,
              receiverName: true,
              receiverPhone: true,
              costCenter: true,
              company: { select: { id: true, name: true } }
            } 
          } 
        },
        orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.payment.count({ where }),
    ]);

    const itemsWithVoucher = await Promise.all(
      items.map(async (pm) => {
        let voucherNumber: string | null = null;
        if (pm.companyId) {
          voucherNumber = await this.calculatePaymentVoucherNumber(pm.companyId, pm.paymentDate, pm.id);
        }
        return {
          ...pm,
          voucherNumber,
          request: pm.request ? { ...pm.request, voucherNumber } : pm.request,
        };
      })
    );

    return {
      items: itemsWithVoucher,
      meta: { page, pageSize, total }
    };
  }

  async findPaymentsForRequest(requestId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { requestId },
      include: {
        paidBy: { select: { fullName: true, username: true } },
      },
    });

    return Promise.all(
      payments.map(async (pm) => {
        let voucherNumber: string | null = null;
        if (pm.companyId) {
          voucherNumber = await this.calculatePaymentVoucherNumber(pm.companyId, pm.paymentDate, pm.id);
        }
        return {
          ...pm,
          voucherNumber,
        };
      })
    );
  }

  private async calculatePaymentVoucherNumber(
    companyId: string,
    paymentDate: Date | null | undefined,
    paymentId: string,
  ): Promise<string> {
    const pDate = paymentDate ? new Date(paymentDate) : new Date();
    const year = pDate.getFullYear();
    const month = pDate.getMonth();
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);

    const seq = await this.prisma.payment.count({
      where: {
        companyId,
        paymentDate: {
          gte: startOfMonth,
        },
        OR: [
          { paymentDate: { lt: pDate } },
          {
            paymentDate: pDate,
            id: { lte: paymentId },
          },
        ],
      },
    });

    const yyyy = String(year);
    const mm = String(month + 1).padStart(2, '0');
    const seqStr = String(Math.max(seq, 1)).padStart(3, '0');
    return `${yyyy}${mm}${seqStr}`;
  }
}
