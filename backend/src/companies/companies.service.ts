import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateDepartmentDto, CreateProjectDto, 
  CreateRegionDto, UpdateRegionDto, 
  CreateBudgetHeadDto, UpdateBudgetHeadDto 
} from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllCompanies() {
    return this.prisma.company.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findDepartments(companyId?: string) {
    return this.prisma.department.findMany({
      where: companyId ? { companyId } : {},
      include: { 
        company: true,
        _count: {
          select: {
            users: true,
            requests: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findProjects(companyId?: string) {
    return this.prisma.project.findMany({
      where: companyId ? { companyId, status: 'ACTIVE' } : { status: 'ACTIVE' },
      include: { company: true },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findFirst({
      where: { name: dto.name, companyId: dto.companyId },
    });
    if (existing) {
      throw new BadRequestException('Department with this name already exists in this company');
    }
    return this.prisma.department.create({
      data: dto,
    });
  }

  async updateDepartment(departmentId: string, dto: any) {
    const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) {
      throw new BadRequestException('Department not found');
    }

    if (dto.name && dto.name !== dept.name) {
      const existing = await this.prisma.department.findFirst({
        where: { name: dto.name, companyId: dept.companyId, id: { not: departmentId } },
      });
      if (existing) {
        throw new BadRequestException('Another department with this name already exists in this company');
      }
    }

    const dataToUpdate: any = {};
    if (dto.name !== undefined) dataToUpdate.name = dto.name;
    if (dto.monthlyBudget !== undefined) dataToUpdate.monthlyBudget = dto.monthlyBudget;

    return (this.prisma.department as any).update({
      where: { id: departmentId },
      data: dataToUpdate,
    });
  }

  async updateDepartmentBudget(departmentId: string, monthlyBudget: number) {
    const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) {
      throw new BadRequestException('Department not found');
    }
    return (this.prisma.department as any).update({
      where: { id: departmentId },
      data: { monthlyBudget },
    });
  }

  async deleteDepartment(departmentId: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        _count: {
          select: {
            users: true,
            requests: true,
          },
        },
      },
    });

    if (!dept) {
      throw new BadRequestException('Department not found');
    }

    if (dept._count.users > 0) {
      throw new BadRequestException(`Cannot delete department because it has ${dept._count.users} assigned user(s). Reassign them first.`);
    }

    if (dept._count.requests > 0) {
      throw new BadRequestException(`Cannot delete department because it has ${dept._count.requests} associated petty cash request(s).`);
    }

    return this.prisma.department.delete({
      where: { id: departmentId },
    });
  }

  async getDepartmentBudgetStats(departmentId: string) {
    const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) {
      throw new BadRequestException('Department not found');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const approvedRequests = await this.prisma.pettyCashRequest.aggregate({
      where: {
        departmentId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['APPROVED', 'PAYMENT_PROCESSING', 'PAID', 'COMPLETED'] },
      },
      _sum: { requestedAmount: true },
    });

    const pendingRequests = await this.prisma.pettyCashRequest.aggregate({
      where: {
        departmentId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['PENDING_APPROVAL', 'ACCOUNTANT_REVIEW'] },
      },
      _sum: { requestedAmount: true },
    });

    const monthlyBudget = Number((dept as any).monthlyBudget || 0);
    const approvedAmount = Number(approvedRequests._sum.requestedAmount || 0);
    const pendingAmount = Number(pendingRequests._sum.requestedAmount || 0);
    const totalUsed = approvedAmount + pendingAmount;
    const remainingBudget = Math.max(0, monthlyBudget - totalUsed);
    const usagePercentage = monthlyBudget > 0 ? Math.min(100, Math.round((totalUsed / monthlyBudget) * 100)) : 0;

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      monthlyBudget,
      approvedAmount,
      pendingAmount,
      totalUsed,
      remainingBudget,
      usagePercentage,
      isExceeded: monthlyBudget > 0 && totalUsed > monthlyBudget,
    };
  }

  async createProject(dto: CreateProjectDto) {
    const existing = await this.prisma.project.findFirst({
      where: { name: dto.name, companyId: dto.companyId },
    });
    if (existing) {
      throw new BadRequestException('Project with this name already exists in this company');
    }
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        companyId: dto.companyId,
        status: 'ACTIVE',
      },
    });
  }

  // --- REGIONS METHODS ---
  async findRegions(companyId?: string) {
    return (this.prisma as any).region.findMany({
      where: companyId ? { companyId } : {},
      include: {
        company: true,
        _count: { select: { requests: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createRegion(dto: CreateRegionDto) {
    const existing = await (this.prisma as any).region.findFirst({
      where: { name: dto.name, companyId: dto.companyId },
    });
    if (existing) {
      throw new BadRequestException('Region with this name already exists in this company');
    }
    return (this.prisma as any).region.create({
      data: dto,
    });
  }

  async updateRegion(id: string, dto: UpdateRegionDto) {
    const region = await (this.prisma as any).region.findUnique({ where: { id } });
    if (!region) throw new BadRequestException('Region not found');

    if (dto.name && dto.name !== region.name) {
      const existing = await (this.prisma as any).region.findFirst({
        where: { name: dto.name, companyId: region.companyId, id: { not: id } },
      });
      if (existing) throw new BadRequestException('Another region with this name already exists in this company');
    }

    const dataToUpdate: any = {};
    if (dto.name !== undefined) dataToUpdate.name = dto.name;
    if (dto.monthlyBudget !== undefined) dataToUpdate.monthlyBudget = dto.monthlyBudget;
    if (dto.status !== undefined) dataToUpdate.status = dto.status;

    return (this.prisma as any).region.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async deleteRegion(id: string) {
    const region = await (this.prisma as any).region.findUnique({
      where: { id },
      include: { _count: { select: { requests: true } } },
    });
    if (!region) throw new BadRequestException('Region not found');

    if (region._count.requests > 0) {
      throw new BadRequestException(`Cannot delete region because it has ${region._count.requests} associated petty cash request(s).`);
    }

    return (this.prisma as any).region.delete({ where: { id } });
  }

  async getRegionBudgetStats(regionId: string) {
    const region = await (this.prisma as any).region.findUnique({ where: { id: regionId } });
    if (!region) throw new BadRequestException('Region not found');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const approvedRequests = await this.prisma.pettyCashRequest.aggregate({
      where: {
        regionId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['APPROVED', 'PAYMENT_PROCESSING', 'PAID', 'COMPLETED'] },
      },
      _sum: { requestedAmount: true },
    });

    const pendingRequests = await this.prisma.pettyCashRequest.aggregate({
      where: {
        regionId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['PENDING_APPROVAL', 'ACCOUNTANT_REVIEW'] },
      },
      _sum: { requestedAmount: true },
    });

    const monthlyBudget = Number(region.monthlyBudget || 0);
    const approvedAmount = Number(approvedRequests._sum.requestedAmount || 0);
    const pendingAmount = Number(pendingRequests._sum.requestedAmount || 0);
    const totalUsed = approvedAmount + pendingAmount;
    const remainingBudget = Math.max(0, monthlyBudget - totalUsed);
    const usagePercentage = monthlyBudget > 0 ? Math.min(100, Math.round((totalUsed / monthlyBudget) * 100)) : 0;

    return {
      regionId: region.id,
      regionName: region.name,
      monthlyBudget,
      approvedAmount,
      pendingAmount,
      totalUsed,
      remainingBudget,
      usagePercentage,
      isExceeded: monthlyBudget > 0 && totalUsed > monthlyBudget,
    };
  }

  // --- BUDGET HEADS METHODS ---
  async findBudgetHeads(companyId?: string) {
    return (this.prisma as any).budgetHead.findMany({
      where: companyId ? { companyId } : {},
      include: {
        company: true,
        _count: { select: { requests: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createBudgetHead(dto: CreateBudgetHeadDto) {
    const existingCode = await (this.prisma as any).budgetHead.findFirst({
      where: { code: dto.code, companyId: dto.companyId },
    });
    if (existingCode) {
      throw new BadRequestException('Budget head code already exists in this company');
    }

    const existingName = await (this.prisma as any).budgetHead.findFirst({
      where: { name: dto.name, companyId: dto.companyId },
    });
    if (existingName) {
      throw new BadRequestException('Budget head name already exists in this company');
    }

    return (this.prisma as any).budgetHead.create({
      data: dto,
    });
  }

  async updateBudgetHead(id: string, dto: UpdateBudgetHeadDto) {
    const bh = await (this.prisma as any).budgetHead.findUnique({ where: { id } });
    if (!bh) throw new BadRequestException('Budget head not found');

    if (dto.code && dto.code !== bh.code) {
      const existingCode = await (this.prisma as any).budgetHead.findFirst({
        where: { code: dto.code, companyId: bh.companyId, id: { not: id } },
      });
      if (existingCode) throw new BadRequestException('Another budget head with this code already exists');
    }

    if (dto.name && dto.name !== bh.name) {
      const existingName = await (this.prisma as any).budgetHead.findFirst({
        where: { name: dto.name, companyId: bh.companyId, id: { not: id } },
      });
      if (existingName) throw new BadRequestException('Another budget head with this name already exists');
    }

    return (this.prisma as any).budgetHead.update({
      where: { id },
      data: dto,
    });
  }

  async deleteBudgetHead(id: string) {
    const bh = await (this.prisma as any).budgetHead.findUnique({
      where: { id },
      include: { _count: { select: { requests: true } } },
    });
    if (!bh) throw new BadRequestException('Budget head not found');

    if (bh._count.requests > 0) {
      throw new BadRequestException(`Cannot delete budget head because it has ${bh._count.requests} associated petty cash request(s).`);
    }

    return (this.prisma as any).budgetHead.delete({ where: { id } });
  }
}
