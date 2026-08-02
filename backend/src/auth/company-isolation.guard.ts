import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyIsolationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user, params, query, body } = request;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Super Admin bypasses company isolation
    if (user.role === RoleName.SUPER_ADMIN) {
      return true;
    }

    // Accountant bypasses company isolation (has cross-company approval access)
    if (user.role === RoleName.ACCOUNTANT) {
      return true;
    }

    // Employee is restricted to their own company
    const employeeCompanyId = user.companyId;

    // 1. Check Body parameter if present
    if (body && body.companyId && body.companyId !== employeeCompanyId) {
      throw new ForbiddenException('You cannot create or update resources for another company');
    }

    // 2. Check Query parameter if present
    if (query && query.companyId && query.companyId !== employeeCompanyId) {
      throw new ForbiddenException('You cannot view resources for another company');
    }

    // 3. Force query companyId to employee's companyId for collections
    if (query) {
      query.companyId = employeeCompanyId;
    }

    // 4. Check Path parameter resource isolation
    const resourceId = params.id;
    if (resourceId) {
      const urlPath = request.url;

      // Enforce isolation for Petty Cash Requests
      if (urlPath.includes('/requests')) {
        const pettyCashRequest = await this.prisma.pettyCashRequest.findUnique({
          where: { id: resourceId },
          select: { companyId: true, userId: true }
        });
        if (pettyCashRequest && pettyCashRequest.companyId !== employeeCompanyId) {
          throw new ForbiddenException('Access denied: request belongs to another company');
        }
      }

      // Enforce isolation for Departments
      if (urlPath.includes('/departments')) {
        const dept = await this.prisma.department.findUnique({
          where: { id: resourceId },
          select: { companyId: true }
        });
        if (dept && dept.companyId !== employeeCompanyId) {
          throw new ForbiddenException('Access denied: department belongs to another company');
        }
      }

      // Enforce isolation for Projects
      if (urlPath.includes('/projects')) {
        const proj = await this.prisma.project.findUnique({
          where: { id: resourceId },
          select: { companyId: true }
        });
        if (proj && proj.companyId !== employeeCompanyId) {
          throw new ForbiddenException('Access denied: project belongs to another company');
        }
      }
    }

    return true;
  }
}
