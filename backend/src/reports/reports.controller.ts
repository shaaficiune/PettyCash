import { Controller, Get, Query, UseGuards, Request, Response, Header } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyIsolationGuard } from '../auth/company-isolation.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Reporting & Dashboards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyIsolationGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Get total aggregates and request counts for dashboard widgets' })
  async getDashboardStats(@Request() req, @Query('companyId') companyId?: string) {
    const targetCompanyId = req.user.role === RoleName.EMPLOYEE ? req.user.companyId : companyId;
    return this.reportsService.getDashboardStats(req.user, targetCompanyId);
  }

  @Get('breakdowns')
  @ApiOperation({ summary: 'Get allocations and splits breakdown by department, company, employee' })
  async getExpenseBreakdowns(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('period') period?: string
  ) {
    const targetCompanyId = req.user.role === RoleName.EMPLOYEE ? req.user.companyId : companyId;
    return this.reportsService.getExpenseBreakdowns(req.user, targetCompanyId, period);
  }

  @Get('pending-requests')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ACCOUNTANT, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get pending approval requests for accountant dashboard' })
  async getPendingRequests(@Request() req, @Query('companyId') companyId?: string) {
    const targetCompanyId = req.user.role === RoleName.SUPER_ADMIN ? companyId : req.user.companyId;
    return this.reportsService.getPendingRequests(targetCompanyId);
  }

  @Get('audit-logs')
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retrieve system audit trail records (Super Admin only)' })
  async getAuditLogs() {
    return this.reportsService.getAuditLogs();
  }

  @Get('export-csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="petty_cash_requests_export.csv"')
  @ApiOperation({ summary: 'Download comma-separated CSV log sheet of requests' })
  async exportCsv(@Request() req, @Response() res, @Query('companyId') companyId?: string) {
    const targetCompanyId = req.user.role === RoleName.EMPLOYEE ? req.user.companyId : companyId;
    const csvContent = await this.reportsService.exportRequests(req.user, targetCompanyId);
    return res.status(200).send(csvContent);
  }
}
