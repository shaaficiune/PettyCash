import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Payment Processing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ACCOUNTANT, RoleName.SUPER_ADMIN)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Record disbursement payment' })
  async recordPayment(@Request() req, @Body() dto: RecordPaymentDto) {
    return this.paymentsService.recordPayment(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List payments (paginated) for company or filters' })
  async listPayments(@Query() query: any, @Request() req: any) {
    return this.paymentsService.listPayments(query, req.user);
  }

  @Get('request/:requestId')
  @ApiOperation({ summary: 'Get list of payment records for specific request' })
  async findPayments(@Param('requestId') requestId: string) {
    return this.paymentsService.findPaymentsForRequest(requestId);
  }
}
