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

  @Get('budget-heads')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ACCOUNTANT, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get comparative Budget Head expenditure matrix across companies' })
  async getBudgetHeadReport(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('statusScope') statusScope?: string
  ) {
    const targetCompanyId = req.user.role === RoleName.SUPER_ADMIN ? companyId : req.user.companyId;
    return this.reportsService.getBudgetHeadReport(
      req.user,
      targetCompanyId,
      startDate,
      endDate,
      statusScope
    );
  }

  @Get('export-budget-heads-excel')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ACCOUNTANT, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Export Budget Head matrix report as Excel' })
  async exportBudgetHeadsExcel(
    @Request() req,
    @Response() res,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('statusScope') statusScope?: string
  ) {
    const targetCompanyId = req.user.role === RoleName.SUPER_ADMIN ? companyId : req.user.companyId;
    const excelXml = await this.reportsService.exportBudgetHeadsExcel(
      req.user,
      targetCompanyId,
      startDate,
      endDate,
      statusScope
    );
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', 'attachment; filename="budget_heads_report.xls"');
    return res.status(200).send(excelXml);
  }

  @Get('export-excel')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="petty_cash_requests_export.xlsx"')
  @ApiOperation({ summary: 'Download Excel spreadsheet of petty cash requests' })
  async exportExcel(
    @Request() req,
    @Response() res,
    @Query('companyId') companyId?: string,
    @Query('regionId') regionId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const targetCompanyId = req.user.role === RoleName.EMPLOYEE ? req.user.companyId : companyId;
    const excelXml = await this.reportsService.exportRequestsExcel(
      req.user,
      targetCompanyId,
      regionId,
      startDate,
      endDate
    );
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', 'attachment; filename="petty_cash_requests.xls"');
    return res.status(200).send(excelXml);
  }

  @Get('export-pdf')
  @ApiOperation({ summary: 'Generate printable HTML/PDF report of petty cash requests' })
  async exportPdf(
    @Request() req,
    @Response() res,
    @Query('companyId') companyId?: string,
    @Query('regionId') regionId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const targetCompanyId = req.user.role === RoleName.EMPLOYEE ? req.user.companyId : companyId;
    const htmlReport = await this.reportsService.exportRequestsPdfHtml(
      req.user,
      targetCompanyId,
      regionId,
      startDate,
      endDate
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(htmlReport);
  }
}
