import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitSettlementDto, ReviewSettlementDto } from './dto/settlement.dto';
import { SettlementStatus, RequestStatus, RoleName } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async submitSettlement(userId: string, dto: SubmitSettlementDto) {
    const request = await this.prisma.pettyCashRequest.findUnique({
      where: { id: dto.requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.userId !== userId) {
      throw new BadRequestException('You can only submit settlements for your own requests');
    }

    if (request.status !== RequestStatus.PAID) {
      throw new BadRequestException('Settlements can only be submitted for paid requests');
    }

    // Check if there is already a pending/approved settlement
    const existing = await this.prisma.expenseSettlement.findFirst({
      where: { requestId: dto.requestId },
    });

    if (existing && existing.status !== SettlementStatus.REJECTED) {
      throw new BadRequestException('A settlement has already been submitted for this request');
    }

    // If there was a rejected settlement, we can update it or create a new one.
    // Let's create a new one (and delete the old one or archive it).
    if (existing) {
      await this.prisma.expenseSettlement.delete({ where: { id: existing.id } });
    }

    const settlement = await this.prisma.expenseSettlement.create({
      data: {
        requestId: dto.requestId,
        companyId: request.companyId,
        actualExpenseAmount: dto.actualExpenseAmount,
        remainingBalance: dto.remainingBalance,
        notes: dto.notes || '',
        status: SettlementStatus.PENDING,
      },
    });

    // Notify accountants
    await this.notifyAccountants(
      `Settlement submitted: ${request.requestNumber}`,
      `Employee submitted settlement details for request ${request.requestNumber}. Actual spent: ${request.currency} ${dto.actualExpenseAmount}.`
    );

    return settlement;
  }

  async reviewSettlement(accountantId: string, id: string, dto: ReviewSettlementDto) {
    const settlement = await this.prisma.expenseSettlement.findUnique({
      where: { id },
      include: { request: true },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    if (settlement.status !== SettlementStatus.PENDING) {
      throw new BadRequestException('Settlement has already been reviewed');
    }

    const updated = await this.prisma.expenseSettlement.update({
      where: { id },
      data: {
        status: dto.status,
        approvedById: accountantId,
      },
    });

    if (dto.status === SettlementStatus.APPROVED) {
      // Move Request status to COMPLETED
      await this.prisma.pettyCashRequest.update({
        where: { id: settlement.requestId },
        data: { status: RequestStatus.COMPLETED },
      });

      // Notify employee
      await this.notifications.create(
        settlement.request.userId,
        `Settlement Approved: ${settlement.request.requestNumber}`,
        `Your expense settlement for request ${settlement.request.requestNumber} has been approved. The request is now closed.`
      );
    } else {
      // Settlement rejected
      // Notify employee
      await this.notifications.create(
        settlement.request.userId,
        `Settlement Rejected: ${settlement.request.requestNumber}`,
        `Your expense settlement for request ${settlement.request.requestNumber} has been rejected. Please review your attachments and resubmit.`
      );
    }

    return updated;
  }

  async findPendingSettlements(companyId?: string) {
    return this.prisma.expenseSettlement.findMany({
      where: {
        status: SettlementStatus.PENDING,
        request: companyId ? { companyId } : undefined,
      },
      include: {
        request: {
          include: {
            user: { select: { fullName: true, employeeNumber: true } },
            company: { select: { name: true } },
          },
        },
      },
    });
  }

  private async notifyAccountants(title: string, message: string) {
    const accountants = await this.prisma.user.findMany({
      where: {
        role: { name: RoleName.ACCOUNTANT },
        status: 'ACTIVE',
      },
    });

    for (const acc of accountants) {
      await this.notifications.create(acc.id, title, message);
    }
  }
}
