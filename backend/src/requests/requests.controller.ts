import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto, UpdateRequestDto, ReviewRequestDto } from './dto/request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyIsolationGuard } from '../auth/company-isolation.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName, RequestStatus } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Petty Cash Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyIsolationGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Petty Cash Request' })
  async create(@Request() req, @Body() dto: CreateRequestDto) {
    return this.requestsService.create(
      req.user.userId,
      req.user.companyId,
      req.user.departmentId,
      dto
    );
  }

  @Get()
  @ApiOperation({ summary: 'List Petty Cash Requests' })
  async findAll(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('status') status?: RequestStatus,
    @Query('priority') priority?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    const pageNum = parseInt(page as any, 10) || 1;
    const size = parseInt(pageSize as any, 10) || 20;
    return this.requestsService.findAll(req.user, companyId, status, priority as any, pageNum, size);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of specific request' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.requestsService.findOne(id, req.user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update Petty Cash Request' })
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateRequestDto) {
    return this.requestsService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete Petty Cash Request (Drafts only)' })
  async delete(@Param('id') id: string, @Request() req) {
    return this.requestsService.delete(id, req.user.userId);
  }

  @Post(':id/review')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ACCOUNTANT, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve, reject, or request correction on a petty cash request' })
  async review(@Param('id') id: string, @Request() req, @Body() dto: ReviewRequestDto) {
    return this.requestsService.review(id, req.user.userId, dto);
  }
}
