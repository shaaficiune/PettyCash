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
    const request = await this.prisma.pettyCashRequest.findUnique({
      where: { id: dto.requestId },
    });

    if (!request) {
      throw new NotFoundException('Petty cash request not found');
    }

    if (request.status !== RequestStatus.APPROVED && request.status !== RequestStatus.PAYMENT_PROCESSING) {
      throw new BadRequestException('Payment can only be processed for approved requests');
    }

    if (!dto.amountPaid || dto.amountPaid <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    // Ensure actor belongs to same company unless SUPER_ADMIN or ACCOUNTANT
    const actor = await this.prisma.user.findUnique({ where: { id: paidById }, include: { role: true } });
    if (!actor) throw new ForbiddenException('Actor account not found');
    const isCrossCompanyRole = actor.role?.name === 'SUPER_ADMIN' || actor.role?.name === 'ACCOUNTANT';
    if (!isCrossCompanyRole && actor.companyId !== request.companyId) {
      throw new ForbiddenException('Not allowed to record payments for this company');
    }


    // Compute existing total paid for request to support partial payments
    const paidAgg = await this.prisma.payment.aggregate({
      where: { requestId: dto.requestId },
      _sum: { amountPaid: true },
    });
    const alreadyPaid = Number(paidAgg._sum.amountPaid || 0);
    const newTotalPaid = alreadyPaid + Number(dto.amountPaid);
    const approvedAmount = Number(request.approvedAmount ?? request.requestedAmount);

    // Create payment entry
    const payment = await this.prisma.payment.create({
      data: {
        requestId: dto.requestId,
        companyId: request.companyId,
        amountPaid: dto.amountPaid,
        paymentMethod: dto.paymentMethod,
        transactionId: dto.transactionId || null,
        referenceNumber: dto.referenceNumber || null,
        paidById: paidById,
        notes: dto.notes || '',
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
      },
    });

    // Update fund and ledger. If fund update fails, roll back created payment.
    try {
      await this.fundsService.recordPayment(request.companyId, dto.requestId, Number(dto.amountPaid), paidById, dto.referenceNumber || null, dto.notes || '');
    } catch (e) {
      // rollback created payment to keep consistency
      try { await this.prisma.payment.delete({ where: { id: payment.id } }); } catch (_) {}
      throw e;
    }

    // Update request status depending on cumulative paid amount
    const newStatus = newTotalPaid >= approvedAmount ? RequestStatus.PAID : RequestStatus.PAYMENT_PROCESSING;
    await this.prisma.pettyCashRequest.update({
      where: { id: dto.requestId },
      data: {
        status: newStatus,
      },
    });

    // Notify employee
    await this.notifications.create(
      request.userId,
      `Payment Disbursed: ${request.requestNumber}`,
      `A payment of ${request.currency} ${dto.amountPaid} has been disbursed for request ${request.requestNumber} via ${dto.paymentMethod}.`
    );

    return payment;
  }

  async listPayments(filters: {
    page?: number;
    pageSize?: number;
    companyId?: string;
    requestId?: string;
    paidById?: string;
  }, actor: any) {
    const page = Math.max(1, Number(filters.page || 1));
    const pageSize = Math.min(100, Math.max(5, Number(filters.pageSize || 20)));

    const where: any = {};
    if (filters.requestId) where.requestId = filters.requestId;
    if (filters.paidById) where.paidById = filters.paidById;
    if (filters.companyId) {
      where.request = { companyId: filters.companyId };
    }

    // Non-super admins may only view payments within their company
    if (actor?.role !== 'SUPER_ADMIN') {
      where.request = { ...(where.request || {}), companyId: actor.companyId };
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { paidBy: { select: { id: true, fullName: true, username: true } }, request: { select: { requestNumber: true, id: true } } },
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items,
      meta: { page, pageSize, total }
    };
  }

  async findPaymentsForRequest(requestId: string) {
    return this.prisma.payment.findMany({
      where: { requestId },
      include: {
        paidBy: { select: { fullName: true, username: true } },
      },
    });
  }
}
