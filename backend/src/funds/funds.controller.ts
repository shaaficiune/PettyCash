import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { FundsService } from './funds.service';
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
  constructor(private readonly fundsService: FundsService) {}

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
    const companyId = req.user.companyId;
    const now = new Date();
    return this.fundsService.closeMonth(companyId, now.getMonth() + 1, now.getFullYear(), dto);
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

  @Get('transactions')
  @ApiOperation({ summary: 'Get petty cash financial transactions ledger' })
  async getTransactions(
    @Request() req: any,
    @Query('companyId') companyId?: string,
    @Query('transactionType') transactionType?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    const effectiveCompanyId = req.user.role === RoleName.EMPLOYEE ? req.user.companyId : companyId;
    const pageNum = parseInt(page as any, 10) || 1;
    const size = parseInt(pageSize as any, 10) || 20;
    return this.fundsService.getTransactions(effectiveCompanyId, transactionType, pageNum, size);
  }
}

