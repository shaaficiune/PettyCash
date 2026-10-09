import { Controller, Post, Get, Body, Query, UseGuards, Request, Response } from '@nestjs/common';
import { FundsService } from './funds.service';
import { MonthlyBookService } from './monthly-book.service';
import { InitFundDto, CloseFundDto } from './dto/fund.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyIsolationGuard } from '../auth/company-isolation.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Petty Cash Funds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyIsolationGuard)
@Controller('funds')
export class FundsController {
  constructor(
    private readonly fundsService: FundsService,
    private readonly monthlyBookService: MonthlyBookService,
  ) {}

  @Get('export/monthly-book')
  @ApiOperation({ summary: 'Export historical-formatted Monthly Petty Cash Book (.xlsx) with embedded company logos' })
  async exportMonthlyBook(
    @Request() req: any,
    @Response() res: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('companyId') companyId?: string,
  ) {
    const isRestricted = req.user.role === RoleName.EMPLOYEE;
    const effectiveCompanyId = isRestricted ? req.user.companyId : companyId;
    const parsedMonth = month ? parseInt(month, 10) : undefined;
    const parsedYear = year ? parseInt(year, 10) : undefined;

    const { buffer, filename } = await this.monthlyBookService.generateMonthlyBook(
      parsedMonth,
      parsedYear,
      effectiveCompanyId,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    return res.status(200).send(buffer);
  }

  @Post('init')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ACCOUNTANT, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Initialize monthly petty cash fund for a company' })
  async init(@Body() dto: InitFundDto) {
    return this.fundsService.initFund(dto);
  }

  @Post('close')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ACCOUNTANT, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Close month and carry balance to next month' })
  async close(@Body() dto: CloseFundDto, @Request() req: any) {
    const effectiveCompanyId = (req.user.role === RoleName.SUPER_ADMIN || req.user.role === RoleName.ACCOUNTANT)
      ? (dto.companyId || req.user.companyId)
      : req.user.companyId;
    const now = new Date();
    const targetMonth = dto.month || (now.getMonth() + 1);
    const targetYear = dto.year || now.getFullYear();
    return this.fundsService.closeMonth(effectiveCompanyId, targetMonth, targetYear, dto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get monthly petty cash summary for a company' })
  async summary(
    @Request() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('companyId') queryCompanyId?: string,
  ) {
    // Super Admins and Accountants can query any company; Employees are scoped to their own
    const companyId = (req.user.role === RoleName.SUPER_ADMIN || req.user.role === RoleName.ACCOUNTANT)
      ? (queryCompanyId || req.user.companyId)
      : req.user.companyId;
    const targetMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.fundsService.getMonthlySummary(companyId, targetMonth, targetYear);
  }

  @Get('transactions/export-excel')
  @ApiOperation({ summary: 'Download Excel spreadsheet of petty cash ledger transactions' })
  async exportTransactionsExcel(
    @Request() req: any,
    @Response() res: any,
    @Query('companyId') companyId?: string,
    @Query('transactionType') transactionType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('regionId') regionId?: string,
    @Query('search') search?: string
  ) {
    const effectiveCompanyId = req.user.role === RoleName.EMPLOYEE ? req.user.companyId : companyId;
    const excelXml = await this.fundsService.exportTransactionsExcel(
      effectiveCompanyId,
      transactionType,
      startDate,
      endDate,
      search,
      regionId
    );
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', 'attachment; filename="petty_cash_ledger.xls"');
    return res.status(200).send(excelXml);
  }

  @Get('transactions/export-pdf')
  @ApiOperation({ summary: 'Generate printable HTML/PDF report of petty cash ledger transactions' })
  async exportTransactionsPdf(
    @Request() req: any,
    @Response() res: any,
    @Query('companyId') companyId?: string,
    @Query('transactionType') transactionType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('regionId') regionId?: string,
    @Query('search') search?: string
  ) {
    const effectiveCompanyId = req.user.role === RoleName.EMPLOYEE ? req.user.companyId : companyId;
    const htmlReport = await this.fundsService.exportTransactionsPdfHtml(
      effectiveCompanyId,
      transactionType,
      startDate,
      endDate,
      search,
      regionId
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(htmlReport);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get petty cash financial transactions ledger' })
  async getTransactions(
    @Request() req: any,
    @Query('companyId') companyId?: string,
    @Query('transactionType') transactionType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('regionId') regionId?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    const effectiveCompanyId = req.user.role === RoleName.EMPLOYEE ? req.user.companyId : companyId;
    const pageNum = parseInt(page as any, 10) || 1;
    const size = parseInt(pageSize as any, 10) || 20;
    return this.fundsService.getTransactions(
      effectiveCompanyId,
      transactionType,
      pageNum,
      size,
      startDate,
      endDate,
      search,
      regionId
    );
  }

  @Get('availability')
  @ApiOperation({ summary: 'Check if an active fund with positive balance exists for the current month' })
  async checkAvailability(@Request() req: any) {
    return this.fundsService.checkFundAvailability(req.user.companyId);
  }
}
