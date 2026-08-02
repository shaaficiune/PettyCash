import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    // Check if username already exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new BadRequestException('Username is already taken');
    }

    // Check if employee number already exists
    const existingEmpNumber = await this.prisma.user.findUnique({
      where: { employeeNumber: dto.employeeNumber },
    });
    if (existingEmpNumber) {
      throw new BadRequestException('Employee number is already registered');
    }

    // Find the Role ID
    const roleObj = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });
    if (!roleObj) {
      throw new BadRequestException('Role not found');
    }

    // Hash default initial password
    const defaultPassword = 'Welcome@2026';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    return this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        username: dto.username,
        email: dto.email,
        phone: dto.phone,
        employeeNumber: dto.employeeNumber,
        companyId: dto.companyId,
        departmentId: dto.departmentId,
        regionId: dto.regionId || undefined,
        roleId: roleObj.id,
        passwordHash,
        resetPasswordRequired: true,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        phone: true,
        employeeNumber: true,
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        region: { select: { id: true, name: true } },
        role: { select: { name: true } },
        status: true,
        createdAt: true,
      },
    });
  }

  async findAll(companyId?: string) {
    return this.prisma.user.findMany({
      where: companyId ? { companyId } : {},
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        phone: true,
        employeeNumber: true,
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        region: { select: { id: true, name: true } },
        role: { select: { name: true } },
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        phone: true,
        employeeNumber: true,
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        region: { select: { id: true, name: true } },
        role: { select: { name: true } },
        status: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: any = {};
    if (dto.fullName) data.fullName = dto.fullName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.departmentId) data.departmentId = dto.departmentId;
    if (dto.regionId !== undefined) data.regionId = dto.regionId || null;
    if (dto.status) data.status = dto.status;

    if (dto.role) {
      const roleObj = await this.prisma.role.findUnique({
        where: { name: dto.role },
      });
      if (!roleObj) {
        throw new BadRequestException('Role not found');
      }
      data.roleId = roleObj.id;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        phone: true,
        employeeNumber: true,
        role: { select: { name: true } },
        status: true,
      },
    });
  }

  async resetPassword(id: string, tempPassword?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const pass = tempPassword || 'Welcome@2026';
    const passwordHash = bcrypt.hashSync(pass, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        resetPasswordRequired: true,
      },
    });

    // Invalidate refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    return { success: true, message: `Password reset to temporary password: ${pass}` };
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            requests: true,
            paymentsMade: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== 'DISABLED') {
      throw new BadRequestException('User account must be DISABLED before it can be deleted. Please disable the account first.');
    }

    if (user._count.requests > 0 || user._count.paymentsMade > 0) {
      throw new BadRequestException(
        `Cannot delete user "${user.fullName}" because they have ${user._count.requests} associated request(s) and ${user._count.paymentsMade} payment record(s).`
      );
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }
}
