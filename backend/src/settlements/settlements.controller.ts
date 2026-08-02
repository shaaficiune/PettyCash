import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { SubmitSettlementDto, ReviewSettlementDto } from './dto/settlement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyIsolationGuard } from '../auth/company-isolation.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Expense Settlements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyIsolationGuard)
@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit expense settlement details' })
  async submit(@Request() req, @Body() dto: SubmitSettlementDto) {
    return this.settlementsService.submitSettlement(req.user.userId, dto);
  }

  @Post(':id/review')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ACCOUNTANT, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve or reject expense settlement (Accountant only)' })
  async review(@Param('id') id: string, @Request() req, @Body() dto: ReviewSettlementDto) {
    return this.settlementsService.reviewSettlement(req.user.userId, id, dto);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ACCOUNTANT, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'List pending expense settlements' })
  async getPending(@Query('companyId') companyId?: string) {
    return this.settlementsService.findPendingSettlements(companyId);
  }
}
