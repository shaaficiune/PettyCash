import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto, UpdateRequestDto, ReviewRequestDto } from './dto/request.dto';
import { RequestStatus, RoleName, Priority } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { FundsService } from '../funds/funds.service';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly fundsService: FundsService,
  ) {}

  async create(userId: string, companyId: string, departmentId: string, dto: CreateRequestDto) {
    // Generate Request Number
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PC-${todayStr}-`;
    
    // Suffix count
    const count = await this.prisma.pettyCashRequest.count({
      where: {
        requestNumber: {
          startsWith: prefix,
        },
      },
    });
    
    const suffix = String(count + 1).padStart(4, '0');
    const requestNumber = `${prefix}${suffix}`;

    // Validate attachments count limit (max 10)
    if (dto.attachments && dto.attachments.length > 10) {
      throw new BadRequestException('You cannot upload more than 10 attachments');
    }

    // Enforce Region Monthly Budget Limit
    if (dto.regionId && dto.status === RequestStatus.PENDING_APPROVAL) {
      await this.checkRegionBudget(dto.regionId, dto.requestedAmount);
    }

    const initialStatus = dto.status === RequestStatus.PENDING_APPROVAL ? RequestStatus.PENDING_APPROVAL : RequestStatus.DRAFT;

    const request = await this.prisma.pettyCashRequest.create({
      data: {
        requestNumber,
        userId,
        companyId,
        departmentId,
        projectId: dto.projectId || null,
        regionId: dto.regionId || null,
        budgetHeadId: dto.budgetHeadId || null,
        costCenter: dto.costCenter || null,
        purpose: dto.purpose,
        description: dto.description || '',
        requestedAmount: dto.requestedAmount,
        currency: dto.currency || 'USD',
        priority: dto.priority || Priority.NORMAL,
        status: initialStatus,
        requiredDate: new Date(dto.requiredDate),
        attachments: dto.attachments
          ? {
              create: dto.attachments.map(att => ({
                fileName: att.fileName,
                fileUrl: att.fileUrl,
                fileType: att.fileType,
                fileSize: att.fileSize,
              })),
            }
          : undefined,
      },
      include: {
        attachments: true,
        user: { select: { fullName: true, employeeNumber: true } },
        region: { select: { name: true } },
        budgetHead: { select: { name: true, code: true } },
      },
    });

    if (initialStatus === RequestStatus.PENDING_APPROVAL) {
      await this.notifyAccountants(
        `New request submitted: ${requestNumber}`,
        `Employee ${request.user.fullName} created request ${requestNumber} for ${request.currency} ${request.requestedAmount}.`
      );
    }

    return request;
  }

  async findAll(user: any, companyId?: string, status?: RequestStatus, priority?: Priority, page = 1, pageSize = 20) {
    const where: any = {};

    // Enforce data isolation: Employees only see their own requests
    if (user.role === RoleName.EMPLOYEE) {
      where.userId = user.userId;
      where.companyId = user.companyId;
    } else {
      // Super Admin and Accountant see company-specific or all
      if (companyId) {
        where.companyId = companyId;
      }
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;

    const total = await this.prisma.pettyCashRequest.count({ where });
    const items = await this.prisma.pettyCashRequest.findMany({
      where,
      include: {
        user: { select: { fullName: true, username: true, employeeNumber: true } },
        company: { select: { name: true } },
        department: { select: { name: true } },
        project: { select: { name: true } },
        region: { select: { name: true } },
        budgetHead: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      total,
      page,
      pageSize,
      items,
    };
  }

  async findOne(id: string, user: any) {
    const request = await this.prisma.pettyCashRequest.findUnique({
      where: { id },
      include: {
        user: { select: { fullName: true, username: true, employeeNumber: true, phone: true } },
        company: { select: { name: true } },
        department: { select: { name: true } },
        project: { select: { name: true } },
        region: { select: { name: true } },
        budgetHead: { select: { name: true, code: true } },
        attachments: true,
        payments: {
          include: { paidBy: { select: { fullName: true } } }
        },
        settlements: {
          include: { approvedBy: { select: { fullName: true } } }
        }
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Enforce data isolation: Employees can only view their own requests
    if (user.role === RoleName.EMPLOYEE && request.userId !== user.userId) {
      throw new ForbiddenException('You do not have access to this request');
    }

    return request;
  }

  async update(id: string, userId: string, dto: UpdateRequestDto) {
    const request = await this.prisma.pettyCashRequest.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.userId !== userId) {
      throw new ForbiddenException('You can only update your own requests');
    }

    // Requests can only be updated if they are DRAFT or CORRECTION_REQUIRED
    if (request.status !== RequestStatus.DRAFT && request.status !== RequestStatus.CORRECTION_REQUIRED) {
      throw new BadRequestException('Requests can only be modified when in DRAFT or CORRECTION REQUIRED status');
    }

    // Build update data
    const data: any = {};
    if (dto.projectId !== undefined) data.projectId = dto.projectId || null;
    if (dto.regionId !== undefined) data.regionId = dto.regionId || null;
    if (dto.budgetHeadId !== undefined) data.budgetHeadId = dto.budgetHeadId || null;
    if (dto.costCenter !== undefined) data.costCenter = dto.costCenter || null;
    if (dto.purpose !== undefined) data.purpose = dto.purpose;
    if (dto.description !== undefined) data.description = dto.description || '';
    if (dto.requestedAmount !== undefined) data.requestedAmount = dto.requestedAmount;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.requiredDate !== undefined) data.requiredDate = new Date(dto.requiredDate);

    const targetStatus = dto.status || request.status;
    const targetRegionId = dto.regionId !== undefined ? dto.regionId : request.regionId;
    const targetAmount = dto.requestedAmount !== undefined ? dto.requestedAmount : Number(request.requestedAmount);

    if (targetRegionId && targetStatus === RequestStatus.PENDING_APPROVAL) {
      await this.checkRegionBudget(targetRegionId, targetAmount, request.id);
    }

    // If status is updated (e.g. employee resubmitting correction request)
    if (dto.status) {
      if (request.status === RequestStatus.CORRECTION_REQUIRED && dto.status === RequestStatus.PENDING_APPROVAL) {
        data.status = RequestStatus.PENDING_APPROVAL;
        data.correctionNotes = null; // Clear correction notes on resubmission
        
        await this.notifyAccountants(
          `Resubmitted request: ${request.requestNumber}`,
          `Employee resubmitted corrected request ${request.requestNumber} for review.`
        );
      } else {
        data.status = dto.status;
      }
    }

    // Manage attachments replacement if provided
    if (dto.attachments) {
      if (dto.attachments.length > 10) {
        throw new BadRequestException('You cannot upload more than 10 attachments');
      }
      
      // Delete old attachments and replace
      await this.prisma.pettyCashAttachment.deleteMany({
        where: { requestId: id },
      });

      data.attachments = {
        create: dto.attachments.map(att => ({
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileType: att.fileType,
          fileSize: att.fileSize,
        })),
      };
    }

    return this.prisma.pettyCashRequest.update({
      where: { id },
      data,
      include: { attachments: true },
    });
  }

  async delete(id: string, userId: string) {
    const request = await this.prisma.pettyCashRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.userId !== userId) {
      throw new ForbiddenException('You can only delete your own requests');
    }

    if (request.status !== RequestStatus.DRAFT) {
      throw new BadRequestException('Only draft requests can be deleted');
    }

    await this.prisma.pettyCashRequest.delete({
      where: { id },
    });

    return { success: true, message: 'Request deleted successfully' };
  }

  async review(id: string, accountantId: string, dto: ReviewRequestDto) {
    const request = await this.prisma.pettyCashRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== RequestStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Request is not in a reviewable state');
    }

    const data: any = {
      status: dto.status,
    };

    if (dto.status === RequestStatus.APPROVED) {
      data.approvedAmount = dto.approvedAmount || request.requestedAmount;
      // Reserve approved amount in petty cash fund; will throw if insufficient
      await this.fundsService.recordApproval(request.companyId, Number(data.approvedAmount));
      // After accountant approval, status moves to approved
      // In the workflow, it can skip straight to approved or PAYMENT_PROCESSING
      // approved -> payment processing is standard. Let's make it APPROVED.
      
      // Notify employee
      await this.notifications.create(
        request.userId,
        `Request Approved: ${request.requestNumber}`,
        `Your petty cash request ${request.requestNumber} has been approved for ${request.currency} ${data.approvedAmount}.`
      );
    } else if (dto.status === RequestStatus.REJECTED) {
      data.correctionNotes = dto.comments || 'Rejected by Accountant';
      
      // Notify employee
      await this.notifications.create(
        request.userId,
        `Request Rejected: ${request.requestNumber}`,
        `Your petty cash request ${request.requestNumber} has been rejected. Reason: ${dto.comments || 'No comment'}`
      );
    } else if (dto.status === RequestStatus.CORRECTION_REQUIRED) {
      data.status = RequestStatus.CORRECTION_REQUIRED;
      data.correctionNotes = dto.comments || 'Correction required';
      
      // Notify employee
      await this.notifications.create(
        request.userId,
        `Correction Required: ${request.requestNumber}`,
        `Correction requested for ${request.requestNumber}. Comments: ${dto.comments || 'No comment'}`
      );
    }

    return this.prisma.pettyCashRequest.update({
      where: { id },
      data,
    });
  }

  private async checkRegionBudget(regionId: string, requestedAmount: number, excludeRequestId?: string) {
    const region = await (this.prisma as any).region.findUnique({ where: { id: regionId } });
    if (!region || !region.monthlyBudget || Number(region.monthlyBudget) <= 0) return;

    const monthlyBudget = Number(region.monthlyBudget);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const whereCondition: any = {
      regionId,
      createdAt: { gte: startOfMonth, lte: endOfMonth },
      status: { in: [RequestStatus.PENDING_APPROVAL, RequestStatus.APPROVED, RequestStatus.PAID, RequestStatus.COMPLETED] },
    };

    if (excludeRequestId) {
      whereCondition.id = { not: excludeRequestId };
    }

    const currentUsage = await this.prisma.pettyCashRequest.aggregate({
      where: whereCondition,
      _sum: { requestedAmount: true },
    });

    const totalUsed = Number(currentUsage._sum.requestedAmount || 0);
    const newTotal = totalUsed + requestedAmount;

    if (newTotal > monthlyBudget) {
      const remaining = Math.max(0, monthlyBudget - totalUsed);
      throw new BadRequestException(
        `Cannot submit request: This request ($${requestedAmount.toLocaleString()}) exceeds the monthly budget limit for region "${region.name}". Remaining budget is $${remaining.toLocaleString()}.`
      );
    }
  }

  private async notifyAccountants(title: string, message: string) {
    // Fetch all accountants
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

